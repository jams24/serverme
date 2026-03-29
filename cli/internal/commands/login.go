package commands

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/spf13/cobra"
)

func NewLoginCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "login",
		Short: "Log in to ServerMe via browser",
		Long:  "Opens your browser to log in with Google. Your auth token is saved automatically.",
		Example: `  serverme login
  serverme login --server custom.server.com:8443`,
		RunE: func(cmd *cobra.Command, args []string) error {
			fmt.Println()
			fmt.Printf("  %s\n", c(bold+cyan, "ServerMe Login"))
			fmt.Printf("  %s\n", c(dim, "──────────────────────────"))

			// Start local server to receive callback
			listener, err := net.Listen("tcp", "127.0.0.1:0")
			if err != nil {
				return fmt.Errorf("start local server: %w", err)
			}
			port := listener.Addr().(*net.TCPAddr).Port

			tokenCh := make(chan string, 1)
			errCh := make(chan error, 1)

			mux := http.NewServeMux()
			mux.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
				token := r.URL.Query().Get("token")
				if token == "" {
					w.Header().Set("Content-Type", "text/html")
					fmt.Fprint(w, `<html><body style="background:#0d1117;color:#c9d1d9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center"><h2 style="color:#f85149">Login Failed</h2><p>No token received.</p></div></body></html>`)
					errCh <- fmt.Errorf("no token received")
					return
				}
				w.Header().Set("Content-Type", "text/html")
				fmt.Fprint(w, `<html><body style="background:#0d1117;color:#c9d1d9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center"><h2 style="color:#3fb950">&#10003; Logged in!</h2><p>You can close this window and return to your terminal.</p></div></body></html>`)
				tokenCh <- token
			})

			srv := &http.Server{Handler: mux}
			go srv.Serve(listener)
			defer srv.Close()

			// Derive API base from server flag
			apiBase := deriveAPIBase(serverAddr)
			loginURL := fmt.Sprintf("%s/api/v1/auth/google?callback=http://127.0.0.1:%d/callback", apiBase, port)

			fmt.Println()
			fmt.Printf("  Opening browser...\n")
			fmt.Printf("  %s\n", c(dim, "If it doesn't open, visit:"))
			fmt.Printf("  %s\n", c(cyan, loginURL))
			fmt.Println()

			openBrowser(loginURL)

			select {
			case token := <-tokenCh:
				saveToken(token)
				fmt.Printf("  %s Logged in successfully!\n", c(green, "✓"))
				fmt.Println()
				fmt.Printf("  Now run: %s\n", c(white, "serverme http 3000"))
				fmt.Println()
				return nil
			case err := <-errCh:
				return err
			case <-time.After(2 * time.Minute):
				return fmt.Errorf("login timed out")
			}
		},
	}
}

func NewLoginEmailCmd() *cobra.Command {
	var email string
	var password string

	cmd := &cobra.Command{
		Use:   "login:email",
		Short: "Log in with email and password",
		Example: `  serverme login:email --email you@example.com --password yourpass`,
		RunE: func(cmd *cobra.Command, args []string) error {
			if email == "" || password == "" {
				return fmt.Errorf("--email and --password are required")
			}

			fmt.Printf("\n  %s Logging in as %s...\n", c(yellow, "●"), email)

			apiBase := deriveAPIBase(serverAddr)
			payload := fmt.Sprintf(`{"email":"%s","password":"%s"}`, email, password)

			req, _ := http.NewRequest("POST", apiBase+"/api/v1/auth/login", strings.NewReader(payload))
			req.Header.Set("Content-Type", "application/json")

			resp, err := (&http.Client{Timeout: 10 * time.Second}).Do(req)
			if err != nil {
				return fmt.Errorf("request failed: %w", err)
			}
			defer resp.Body.Close()

			var result struct {
				Token string `json:"token"`
				User  struct {
					Email string `json:"email"`
				} `json:"user"`
				Error string `json:"error,omitempty"`
			}
			json.NewDecoder(resp.Body).Decode(&result)

			if result.Error != "" {
				return fmt.Errorf("%s", result.Error)
			}
			if result.Token == "" {
				return fmt.Errorf("no token received")
			}

			saveToken(result.Token)
			fmt.Printf("  %s Logged in as %s\n\n", c(green, "✓"), result.User.Email)
			fmt.Printf("  Now run: %s\n\n", c(white, "serverme http 3000"))
			return nil
		},
	}

	cmd.Flags().StringVar(&email, "email", "", "Email address")
	cmd.Flags().StringVar(&password, "password", "", "Password")
	cmd.MarkFlagRequired("email")
	cmd.MarkFlagRequired("password")

	return cmd
}

func deriveAPIBase(server string) string {
	host := strings.Split(server, ":")[0]
	return "https://api." + host
}

func saveToken(token string) {
	dir := configDir()
	os.MkdirAll(dir, 0700)
	os.WriteFile(filepath.Join(dir, "authtoken"), []byte(token), 0600)
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "linux":
		cmd = exec.Command("xdg-open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	}
	if cmd != nil {
		cmd.Start()
	}
}
