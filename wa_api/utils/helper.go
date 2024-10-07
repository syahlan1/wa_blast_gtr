package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"fmt"

	"github.com/dgrijalva/jwt-go"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	waLog "go.mau.fi/whatsmeow/util/log"

)

var jwtSecret = []byte("your_secret_key")

// Fungsi untuk memverifikasi token JWT
func VerifyJWT(tokenString string) (*jwt.MapClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwt.MapClaims{}, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if claims, ok := token.Claims.(*jwt.MapClaims); ok && token.Valid {
		return claims, nil
	} else {
		return nil, fmt.Errorf("invalid token: %v", err)
	}
}
func EventHandler(evt interface{}) {
	// Handle incoming messages or other events
}

// Helper function to calculate SHA256 hash
func CalculateSHA256(data []byte) []byte {
	hash := sha256.New()
	hash.Write(data)
	return hash.Sum(nil)
}

// Helper function to generate a 32-byte media key
func GenerateMediaKey() ([]byte, error) {
	mediaKey := make([]byte, 32)
	_, err := rand.Read(mediaKey)
	if err != nil {
		return nil, fmt.Errorf("failed to generate media key: %v", err)
	}
	return mediaKey, nil
}

func LoadClientFromStore(sessionJID string) (*whatsmeow.Client, error) {
	fmt.Println("Loading session for JID:", sessionJID)

	dbLog := waLog.Stdout("Database", "DEBUG", true)
	container, err := sqlstore.New("pgx", "postgres://postgres:password@localhost:5432/blast_wa?sslmode=disable", dbLog)
	if err != nil {
		return nil, fmt.Errorf("Failed to connect to database: %v", err)
	}

	// Memuat device dari JID yang dipilih
	jid, err := types.ParseJID(sessionJID)
	if err != nil {
		return nil, fmt.Errorf("Invalid JID format: %v", err)
	}

	device, err := container.GetDevice(jid)
	if err != nil {
		return nil, fmt.Errorf("Failed to load device for JID %s: %v", sessionJID, err)
	}

	clientLog := waLog.Stdout("Client", "DEBUG", true)
	client := whatsmeow.NewClient(device, clientLog)
	client.AddEventHandler(EventHandler)

	err = client.Connect()
	if err != nil {
		return nil, fmt.Errorf("Failed to connect client for JID %s: %v", sessionJID, err)
	}

	return client, nil
}
