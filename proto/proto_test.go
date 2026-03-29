package proto

import (
	"bytes"
	"testing"
)

func TestWriteReadMsg(t *testing.T) {
	var buf bytes.Buffer

	// Write an Auth message
	auth := Auth{
		Token:   "test-token",
		Version: Version,
		OS:      "darwin",
		Arch:    "amd64",
	}

	if err := WriteMsg(&buf, TypeAuth, &auth); err != nil {
		t.Fatalf("WriteMsg: %v", err)
	}

	// Read it back
	env, err := ReadMsg(&buf)
	if err != nil {
		t.Fatalf("ReadMsg: %v", err)
	}

	if env.Type != TypeAuth {
		t.Fatalf("expected type %q, got %q", TypeAuth, env.Type)
	}

	var decoded Auth
	if err := UnpackPayload(env, &decoded); err != nil {
		t.Fatalf("UnpackPayload: %v", err)
	}

	if decoded.Token != auth.Token {
		t.Errorf("token: expected %q, got %q", auth.Token, decoded.Token)
	}
	if decoded.Version != auth.Version {
		t.Errorf("version: expected %q, got %q", auth.Version, decoded.Version)
	}
}

func TestReadTypedMsg(t *testing.T) {
	var buf bytes.Buffer

	resp := AuthResp{
		ClientID: "client-123",
		Version:  Version,
	}
	if err := WriteMsg(&buf, TypeAuthResp, &resp); err != nil {
		t.Fatalf("WriteMsg: %v", err)
	}

	var decoded AuthResp
	if err := ReadTypedMsg(&buf, TypeAuthResp, &decoded); err != nil {
		t.Fatalf("ReadTypedMsg: %v", err)
	}

	if decoded.ClientID != resp.ClientID {
		t.Errorf("client_id: expected %q, got %q", resp.ClientID, decoded.ClientID)
	}
}

func TestReadTypedMsgWrongType(t *testing.T) {
	var buf bytes.Buffer

	if err := WriteMsg(&buf, TypePing, &Ping{}); err != nil {
		t.Fatalf("WriteMsg: %v", err)
	}

	var decoded AuthResp
	err := ReadTypedMsg(&buf, TypeAuthResp, &decoded)
	if err == nil {
		t.Fatal("expected error for wrong message type")
	}
}

func TestReadTypedMsgError(t *testing.T) {
	var buf bytes.Buffer

	if err := WriteMsg(&buf, TypeError, &Error{Message: "access denied"}); err != nil {
		t.Fatalf("WriteMsg: %v", err)
	}

	var decoded AuthResp
	err := ReadTypedMsg(&buf, TypeAuthResp, &decoded)
	if err == nil {
		t.Fatal("expected error")
	}
	if err.Error() != "server error: access denied" {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestMultipleMessages(t *testing.T) {
	var buf bytes.Buffer

	// Write multiple messages
	msgs := []struct {
		typ     string
		payload interface{}
	}{
		{TypeAuth, &Auth{Token: "tok"}},
		{TypeReqTunnel, &ReqTunnel{Protocol: ProtoHTTP, LocalAddr: "localhost:8080"}},
		{TypePing, &Ping{}},
	}

	for _, m := range msgs {
		if err := WriteMsg(&buf, m.typ, m.payload); err != nil {
			t.Fatalf("WriteMsg(%s): %v", m.typ, err)
		}
	}

	// Read them back
	for _, m := range msgs {
		env, err := ReadMsg(&buf)
		if err != nil {
			t.Fatalf("ReadMsg: %v", err)
		}
		if env.Type != m.typ {
			t.Errorf("expected %q, got %q", m.typ, env.Type)
		}
	}
}

func TestMessageTooLarge(t *testing.T) {
	var buf bytes.Buffer

	// Create a message that's too large
	large := Auth{
		Token: string(make([]byte, maxMessageSize+1)),
	}

	err := WriteMsg(&buf, TypeAuth, &large)
	if err == nil {
		t.Fatal("expected error for oversized message")
	}
}
