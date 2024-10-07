package controllers

import (
	"database/sql"
    "encoding/json"
    "fmt"
    "net/http"
	// "net/smtp"
    "time"

    "golang.org/x/crypto/bcrypt"
    "github.com/dgrijalva/jwt-go"
	"github.com/syahlan1/wa_blast_gtr.git/db"
	"github.com/syahlan1/wa_blast_gtr.git/utils"

)

var jwtSecret = []byte("your_secret_key")

type User struct {
	ID       int
	Email    string
	Username string
}

// Fungsi untuk mendapatkan user berdasarkan ID
func GetUserByID(userID int) (*User, error) {
	db := db.GetDB() // Pastikan ini mengembalikan koneksi database

	var user User
	query := `SELECT id, email, username FROM users WHERE id = $1`
	err := db.QueryRow(query, userID).Scan(&user.ID, &user.Email, &user.Username)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	} else if err != nil {
		return nil, fmt.Errorf("failed to get user by ID: %v", err)
	}

	return &user, nil
}

// Handler untuk mengambil user yang login
func GetProfileHandler(w http.ResponseWriter, r *http.Request) {
	// Ambil token JWT dari cookie
	tokenCookie, err := r.Cookie("session_token")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Verifikasi token JWT
	tokenString := tokenCookie.Value
	claims, err := utils.VerifyJWT(tokenString)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Ambil data user dari database menggunakan klaim user_id
	userID := int((*claims)["user_id"].(float64)) // Klaim harus dikonversi ke tipe int
	user, err := GetUserByID(userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Kembalikan data user (misal username)
	response := map[string]string{
		"username": user.Username,
	}
	json.NewEncoder(w).Encode(response)
}

type RegisterRequest struct {
    Email    string `json:"email"`
    Username string `json:"username"`
    Password string `json:"password"`
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
    var req RegisterRequest
    err := json.NewDecoder(r.Body).Decode(&req)
    if err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    // Hash password
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        http.Error(w, "Failed to hash password", http.StatusInternalServerError)
        return
    }

    // Insert user to database
    db := db.GetDB()
    query := `INSERT INTO users (email, username, password) VALUES ($1, $2, $3)`
    _, err = db.Exec(query, req.Email, req.Username, hashedPassword)
    if err != nil {
        http.Error(w, "Failed to register user", http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusCreated)
    fmt.Fprintln(w, "User registered successfully")
}

type LoginRequest struct {
    Email    string `json:"email"`
    Password string `json:"password"`
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
    var req LoginRequest
    err := json.NewDecoder(r.Body).Decode(&req)
    if err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    // Ambil user dari database berdasarkan email
    var id int
    var username, passwordHash string
    db := db.GetDB()
    query := `SELECT id, username, password FROM users WHERE email = $1`
    err = db.QueryRow(query, req.Email).Scan(&id, &username, &passwordHash)
    if err != nil {
        http.Error(w, "Invalid email or password", http.StatusUnauthorized)
        return
    }

    // Verifikasi password
    err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password))
    if err != nil {
        http.Error(w, "Invalid email or password", http.StatusUnauthorized)
        return
    }

    // Buat JWT token
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "user_id":  id,
        "username": username,
        "exp":      time.Now().Add(time.Hour * 48).Unix(),
    })
    tokenString, err := token.SignedString(jwtSecret)
    if err != nil {
        http.Error(w, "Failed to create token", http.StatusInternalServerError)
        return
    }

    // Simpan token di cookie
    http.SetCookie(w, &http.Cookie{
        Name:     "session_token",
        Value:    tokenString,
        Expires:  time.Now().Add(time.Hour * 48),
        HttpOnly: true,
		Secure: true,
		SameSite: http.SameSiteNoneMode,
    })

    // Update is_login field
    updateQuery := `UPDATE users SET is_login = true WHERE id = $1`
    _, err = db.Exec(updateQuery, id)
    if err != nil {
        http.Error(w, "Failed to update login status", http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    fmt.Fprintf(w, "Welcome, %s!", username)

	if err != nil {
		http.Error(w, "Failed to create token: "+err.Error(), http.StatusInternalServerError)
		return
	}
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
    // Hapus cookie
    http.SetCookie(w, &http.Cookie{
        Name:     "session_token",
        Value:    "",
        Expires:  time.Now().Add(-time.Hour),
        HttpOnly: true,
		Secure: true,
		SameSite: http.SameSiteNoneMode,
    })

    // Ambil user ID dari JWT
    cookie, err := r.Cookie("session_token")
    if err != nil {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    tokenString := cookie.Value
    claims := &jwt.MapClaims{}
    token, _ := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
        return jwtSecret, nil
    })

    if claims, ok := token.Claims.(*jwt.MapClaims); ok && token.Valid {
        userID := int((*claims)["user_id"].(float64))

        // Update is_login menjadi false
        db := db.GetDB()
        updateQuery := `UPDATE users SET is_login = false WHERE id = $1`
        _, err = db.Exec(updateQuery, userID)
        if err != nil {
            http.Error(w, "Failed to logout", http.StatusInternalServerError)
            return
        }

        w.WriteHeader(http.StatusOK)
        fmt.Fprintln(w, "Logged out successfully")
    } else {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
    }
}

// type ForgotPasswordRequest struct {
// 	Email string `json:"email"`
// }

// func ForgotPasswordHandler(w http.ResponseWriter, r *http.Request) {
// 	var req ForgotPasswordRequest
// 	err := json.NewDecoder(r.Body).Decode(&req)
// 	if err != nil {
// 		http.Error(w, "Invalid request body", http.StatusBadRequest)
// 		return
// 	}

// 	// Cek apakah email ada di database
// 	var userID int
// 	db := db.GetDB()
// 	query := `SELECT id FROM users WHERE email = $1`
// 	err = db.QueryRow(query, req.Email).Scan(&userID)
// 	if err == sql.ErrNoRows {
// 		http.Error(w, "Email not found", http.StatusNotFound)
// 		return
// 	} else if err != nil {
// 		http.Error(w, "Failed to query database", http.StatusInternalServerError)
// 		return
// 	}

// 	// Generate reset password token
// 	expirationTime := time.Now().Add(1 * time.Hour)
// 	claims := &jwt.MapClaims{
// 		"user_id": userID,
// 		"exp":     expirationTime.Unix(),
// 	}
// 	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
// 	tokenString, err := token.SignedString(jwtSecret)
// 	if err != nil {
// 		http.Error(w, "Failed to create token", http.StatusInternalServerError)
// 		return
// 	}

// 	// Generate reset password link
// 	resetLink := fmt.Sprintf("http://localhost:5173/reset-password?token=%s", tokenString)

// 	// Kirim email
// 	err = sendResetEmail(req.Email, resetLink)
// 	if err != nil {
// 		http.Error(w, "Failed to send email", http.StatusInternalServerError)
// 		return
// 	}

// 	w.WriteHeader(http.StatusOK)
// 	fmt.Fprintln(w, "Password reset link sent to your email")
// }

// // Fungsi untuk mengirim email
// func sendResetEmail(toEmail, resetLink string) error {
// 	from := "muhamasyahlan@gmail.com"  // Ganti dengan email Anda
// 	password := ""     // Ganti dengan password Anda
// 	smtpHost := "smtp.gmail.com"
// 	smtpPort := "587"

// 	message := fmt.Sprintf("To reset your password, click the following link: %s", resetLink)

// 	auth := smtp.PlainAuth("", from, password, smtpHost)
// 	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, from, []string{toEmail}, []byte(message))
// 	if err != nil {
// 		return fmt.Errorf("failed to send email: %v", err)
// 	}
// 	return nil
// }

// type ResetPasswordRequest struct {
// 	Token       string `json:"token"`
// 	NewPassword string `json:"new_password"`
// }

// func ResetPasswordHandler(w http.ResponseWriter, r *http.Request) {
// 	var req ResetPasswordRequest
// 	err := json.NewDecoder(r.Body).Decode(&req)
// 	if err != nil {
// 		http.Error(w, "Invalid request body", http.StatusBadRequest)
// 		return
// 	}

// 	// Verifikasi token
// 	claims, err := utils.VerifyJWT(req.Token)
// 	if err != nil {
// 		http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
// 		return
// 	}

// 	// Ambil user ID dari klaim token
// 	userID := int((*claims)["user_id"].(float64))

// 	// Hash password baru
// 	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
// 	if err != nil {
// 		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
// 		return
// 	}

// 	// Update password di database
// 	db := db.GetDB()
// 	query := `UPDATE users SET password = $1 WHERE id = $2`
// 	_, err = db.Exec(query, hashedPassword, userID)
// 	if err != nil {
// 		http.Error(w, "Failed to update password", http.StatusInternalServerError)
// 		return
// 	}

// 	w.WriteHeader(http.StatusOK)
// 	fmt.Fprintln(w, "Password updated successfully")
// }
