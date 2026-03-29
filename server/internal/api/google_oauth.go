package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// handleGoogleLogin redirects the user to Google's OAuth consent screen.
func (s *Server) handleGoogleLogin(w http.ResponseWriter, r *http.Request) {
	if s.google == nil || s.google.ClientID == "" {
		writeError(w, http.StatusNotImplemented, "Google OAuth not configured")
		return
	}

	state := generateOAuthState()

	authURL := fmt.Sprintf(
		"https://accounts.google.com/o/oauth2/v2/auth?client_id=%s&redirect_uri=%s&response_type=code&scope=%s&state=%s&access_type=offline&prompt=select_account",
		url.QueryEscape(s.google.ClientID),
		url.QueryEscape(s.google.RedirectURL),
		url.QueryEscape("openid email profile"),
		url.QueryEscape(state),
	)

	http.Redirect(w, r, authURL, http.StatusFound)
}

// handleGoogleCallback handles the OAuth callback from Google.
func (s *Server) handleGoogleCallback(w http.ResponseWriter, r *http.Request) {
	if s.google == nil {
		writeError(w, http.StatusNotImplemented, "Google OAuth not configured")
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		errMsg := r.URL.Query().Get("error")
		redirectWithError(w, r, s.google.FrontendURL, "OAuth failed: "+errMsg)
		return
	}

	// Exchange code for tokens
	tokenData, err := exchangeGoogleCode(s.google, code)
	if err != nil {
		s.log.Error().Err(err).Msg("Google token exchange failed")
		redirectWithError(w, r, s.google.FrontendURL, "Token exchange failed")
		return
	}

	// Get user info from Google
	userInfo, err := getGoogleUserInfo(tokenData.AccessToken)
	if err != nil {
		s.log.Error().Err(err).Msg("Google user info failed")
		redirectWithError(w, r, s.google.FrontendURL, "Failed to get user info")
		return
	}

	if userInfo.Email == "" {
		redirectWithError(w, r, s.google.FrontendURL, "No email from Google")
		return
	}

	// Find or create user
	user, err := s.db.GetUserByEmail(r.Context(), userInfo.Email)
	if err != nil {
		s.log.Error().Err(err).Msg("DB lookup failed")
		redirectWithError(w, r, s.google.FrontendURL, "Internal error")
		return
	}

	if user == nil {
		// Create new user (use a random password since they'll use OAuth)
		randPass := make([]byte, 32)
		rand.Read(randPass)
		user, err = s.db.CreateUser(r.Context(), userInfo.Email, userInfo.Name, hex.EncodeToString(randPass))
		if err != nil {
			s.log.Error().Err(err).Msg("Create user failed")
			redirectWithError(w, r, s.google.FrontendURL, "Failed to create account")
			return
		}

		// Generate initial API key for new users
		s.db.GenerateAPIKey(r.Context(), user.ID, "default")
		s.log.Info().Str("email", userInfo.Email).Msg("new user created via Google OAuth")
	}

	// Generate JWT
	token, err := s.jwt.Generate(user.ID, user.Email, user.Plan)
	if err != nil {
		redirectWithError(w, r, s.google.FrontendURL, "Token generation failed")
		return
	}

	// Redirect to frontend with token
	redirectURL := fmt.Sprintf("%s/auth/callback?token=%s", s.google.FrontendURL, url.QueryEscape(token))
	http.Redirect(w, r, redirectURL, http.StatusFound)
}

// Google token exchange types
type googleTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	IDToken      string `json:"id_token"`
}

type googleUserInfo struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

func exchangeGoogleCode(cfg *GoogleOAuthConfig, code string) (*googleTokenResponse, error) {
	data := url.Values{
		"client_id":     {cfg.ClientID},
		"client_secret": {cfg.ClientSecret},
		"code":          {code},
		"redirect_uri":  {cfg.RedirectURL},
		"grant_type":    {"authorization_code"},
	}

	resp, err := http.Post(
		"https://oauth2.googleapis.com/token",
		"application/x-www-form-urlencoded",
		strings.NewReader(data.Encode()),
	)
	if err != nil {
		return nil, fmt.Errorf("token request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("token exchange failed (%d): %s", resp.StatusCode, string(body))
	}

	var result googleTokenResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse token: %w", err)
	}

	return &result, nil
}

func getGoogleUserInfo(accessToken string) (*googleUserInfo, error) {
	req, _ := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var info googleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}

	return &info, nil
}

func generateOAuthState() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func redirectWithError(w http.ResponseWriter, r *http.Request, frontendURL, errMsg string) {
	redirectURL := fmt.Sprintf("%s/sign-in?error=%s", frontendURL, url.QueryEscape(errMsg))
	http.Redirect(w, r, redirectURL, http.StatusFound)
}
