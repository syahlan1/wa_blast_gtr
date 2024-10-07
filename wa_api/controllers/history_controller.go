package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/syahlan1/wa_blast_gtr.git/db"
)

// Fungsi untuk menampilkan semua riwayat pengiriman pesan
func GetHistory(w http.ResponseWriter, r *http.Request) {
	db := db.GetDB()

	// Query untuk mengambil semua data history
	query := `
        SELECT mh.id, mh.device_jid, wd.contact_name, wd.contact_number, mh.message, mh.created_at, mh.success, mh.failed
        FROM message_history mh
        JOIN whatsmeow_device wd ON mh.device_jid = wd.jid
        ORDER BY mh.created_at DESC`

	rows, err := db.Query(query)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to fetch history: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var histories []map[string]interface{}

	for rows.Next() {
		var id int
		var deviceJID, contactName, contactNumber, message string
		var createdAt time.Time
		var success, failed int

		err := rows.Scan(&id, &deviceJID, &contactName, &contactNumber, &message, &createdAt, &success, &failed)
		if err != nil {
			http.Error(w, "Error reading history", http.StatusInternalServerError)
			return
		}

		history := map[string]interface{}{
			"id":             id,
			"device_jid":     deviceJID,
			"contact_name":   contactName,
			"contact_number": contactNumber,
			"message":        message,
			"created_at":     createdAt,
			"success":        success,
			"failed":         failed,
		}

		histories = append(histories, history)
	}

	// Return history as JSON
	json.NewEncoder(w).Encode(histories)
}

// Fungsi untuk menampilkan detail riwayat berdasarkan ID
func GetHistoryDetail(w http.ResponseWriter, r *http.Request) {
	db := db.GetDB()

	// Mendapatkan parameter ID dari URL
	vars := mux.Vars(r)
	id := vars["id"]

	// Query untuk mengambil detail riwayat berdasarkan ID
	query := `
        SELECT mh.id, mh.device_jid, wd.contact_name, wd.contact_number, mh.message, mh.created_at, mh.success, mh.failed, mh.contact_list
        FROM message_history mh
        JOIN whatsmeow_device wd ON mh.device_jid = wd.jid
        WHERE mh.id = $1`

	var history struct {
		ID            int       `json:"id"`
		DeviceJID     string    `json:"device_jid"`
		ContactName   string    `json:"contact_name"`
		ContactNumber string    `json: "contact_number"`
		Message       string    `json:"message"`
		CreatedAt     time.Time `json:"created_at"`
		Success       int       `json:"success"`
		Failed        int       `json:"failed"`
		ContactList   []string  `json:"contact_list"`
	}

	row := db.QueryRow(query, id)
	var contactListJSON []byte

	err := row.Scan(&history.ID, &history.DeviceJID, &history.ContactName, &history.ContactNumber, &history.Message, &history.CreatedAt, &history.Success, &history.Failed, &contactListJSON)
	if err != nil {
		http.Error(w, "History not found", http.StatusNotFound)
		return
	}

	// Unmarshal JSON data for contact list
	err = json.Unmarshal(contactListJSON, &history.ContactList)
	if err != nil {
		http.Error(w, "Failed to parse contact list", http.StatusInternalServerError)
		return
	}

	// Return detail history as JSON
	json.NewEncoder(w).Encode(history)
}

// Fungsi untuk menghapus riwayat berdasarkan ID
func DeleteHistory(w http.ResponseWriter, r *http.Request) {
	db := db.GetDB()

	// Mendapatkan parameter ID dari URL
	vars := mux.Vars(r)
	id := vars["id"]

	// Query untuk menghapus riwayat berdasarkan ID
	query := `DELETE FROM message_history WHERE id = $1`

	_, err := db.Exec(query, id)
	if err != nil {
		http.Error(w, "Failed to delete history", http.StatusInternalServerError)
		return
	}

	// Mengembalikan respon sukses
	w.WriteHeader(http.StatusNoContent)
}
