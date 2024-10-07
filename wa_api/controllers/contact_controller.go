package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/syahlan1/wa_blast_gtr.git/db"

)

// Struct untuk menyimpan data kontak
type Contact struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Number string `json:"number"`
}

// API Handler untuk mendapatkan semua data kontak
func GetAllContactsHandler(w http.ResponseWriter, r *http.Request) {
	// Koneksi ke database
	db := db.GetDB()

	// Query untuk mendapatkan semua data dari tabel contacts
	rows, err := db.Query("SELECT id, name, number FROM contacts")
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to fetch contacts: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Slice untuk menyimpan hasil query
	var contacts []Contact

	// Loop melalui setiap baris dan scan data ke struct Contact
	for rows.Next() {
		var contact Contact
		err := rows.Scan(&contact.ID, &contact.Name, &contact.Number)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to read row: %v", err), http.StatusInternalServerError)
			return
		}
		contacts = append(contacts, contact)
	}

	// Jika tidak ada kontak yang ditemukan
	if len(contacts) == 0 {
		http.Error(w, "No contacts found", http.StatusNotFound)
		return
	}

	// Encode hasilnya menjadi JSON dan kirimkan ke response
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(contacts)
	if err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}
