package controllers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"time"

	"github.com/gorilla/mux"
	"github.com/syahlan1/wa_blast_gtr.git/db"
	"github.com/syahlan1/wa_blast_gtr.git/utils"

)

type Campaign struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// Function untuk menampilkan semua campaign
func GetAllCampaignsHandler(w http.ResponseWriter, r *http.Request) {
	// Koneksi ke database
	db := db.GetDB()

	// Query untuk mendapatkan semua campaign
	rows, err := db.Query("SELECT id, name, contact_list FROM campaign ORDER BY created_at DESC")
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to fetch campaigns: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Struct untuk menyimpan hasil campaign dengan jumlah kontak
	type CampaignWithContactCount struct {
		ID            int    `json:"id"`
		Name          string `json:"name"`
		ContactCount  int    `json:"contact_count"`
	}

	// Slice untuk menyimpan hasil campaign
	var campaigns []CampaignWithContactCount

	// Loop melalui setiap baris dan scan ke struct
	for rows.Next() {
		var campaign CampaignWithContactCount
		var contactListJSON []byte

		// Baca ID, Name, dan Contact List JSON dari database
		err := rows.Scan(&campaign.ID, &campaign.Name, &contactListJSON)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to read row: %v", err), http.StatusInternalServerError)
			return
		}

		// Parse JSON contact_list untuk mendapatkan jumlah kontak
		var contacts []map[string]string
		if len(contactListJSON) == 0 || string(contactListJSON) == "null" {
			// Jika contact_list kosong atau null, set ContactCount menjadi 0
			campaign.ContactCount = 0
		} else {
			// Coba untuk Unmarshal data JSON
			err = json.Unmarshal(contactListJSON, &contacts)
			if err != nil {
				// Jika gagal, set ContactCount menjadi 0 alih-alih memberikan error
				campaign.ContactCount = 0
			} else {
				// Hitung jumlah kontak
				campaign.ContactCount = len(contacts)
			}
		}

		// Tambahkan campaign ke slice
		campaigns = append(campaigns, campaign)
	}

	// Jika tidak ada campaign yang ditemukan
	if len(campaigns) == 0 {
		http.Error(w, "No campaigns found", http.StatusNotFound)
		return
	}

	// Encode hasilnya menjadi JSON dan kirimkan ke response
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(campaigns)
	if err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

func CountCampaignsHandler(w http.ResponseWriter, r *http.Request) {
	// Koneksi ke database
	db := db.GetDB()

	// Query untuk menghitung jumlah data pada tabel campaign
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM campaign").Scan(&count)
	if err != nil {
		http.Error(w, fmt.Sprintf("Gagal menghitung campaign: %v", err), http.StatusInternalServerError)
		return
	}

	// Buat struktur respons
	response := struct {
		TotalCampaigns int `json:"total_campaigns"`
	}{
		TotalCampaigns: count,
	}

	// Kirim respons ke client dengan format JSON
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, fmt.Sprintf("Failed to encode response: %v", err), http.StatusInternalServerError)
		return
	}
}

func DeleteCampaignHandler(w http.ResponseWriter, r *http.Request) {
	// Dapatkan id dari URL
	vars := mux.Vars(r)
	campaignID := vars["id"]

	// Koneksi ke database
	db := db.GetDB()

	// Query untuk menghapus campaign berdasarkan id
	query := `DELETE FROM campaign WHERE id = $1`
	_, err := db.Exec(query, campaignID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Gagal menghapus campaign: %v", err), http.StatusInternalServerError)
		return
	}

	// Kirim respons berhasil
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"message": "Campaign berhasil dihapus"}`)
}


type CampaignDetail struct {
	ID      int            `json:"id"`
	Name    string         `json:"name"`
	Contacts []ContactDetail `json:"contacts"`
}

// Handler untuk mendapatkan detail campaign berdasarkan ID
// Handler untuk mendapatkan detail campaign berdasarkan ID
func GetCampaignDetailHandler(w http.ResponseWriter, r *http.Request) {
	// Ambil ID campaign dari path
	vars := mux.Vars(r)
	campaignID := vars["id"]

	// Koneksi ke database
	db := db.GetDB()

	// Query untuk mendapatkan detail campaign
	var campaign CampaignDetail
	var contactsJSON []byte

	query := `SELECT id, name, contact_list FROM campaign WHERE id = $1 ORDER BY created_at DESC`
	err := db.QueryRow(query, campaignID).Scan(&campaign.ID, &campaign.Name, &contactsJSON)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Campaign tidak ditemukan", http.StatusNotFound)
			return
		}
		http.Error(w, fmt.Sprintf("Gagal mengambil detail campaign: %v", err), http.StatusInternalServerError)
		return
	}

	// Jika contact_list bernilai null atau kosong, tidak perlu melakukan unmarshal
	if len(contactsJSON) == 0 || string(contactsJSON) == "null" {
		campaign.Contacts = []ContactDetail{} // Berikan slice kosong
	} else {
		// Parsing JSON dari contact_list untuk mendapatkan daftar kontak
		var contacts []ContactDetail
		err = json.Unmarshal(contactsJSON, &contacts)
		if err != nil {
			http.Error(w, "Gagal mengurai daftar kontak", http.StatusInternalServerError)
			return
		}
		campaign.Contacts = contacts
	}

	// Encode hasilnya menjadi JSON dan kirimkan ke response
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(campaign)
	if err != nil {
		http.Error(w, "Gagal mengirim response", http.StatusInternalServerError)
	}
}


type CreateCampaignRequest struct {
	Name string `json:"name"`
}

// Handler untuk membuat campaign baru
func CreateCampaignHandler(w http.ResponseWriter, r *http.Request) {
	var req CreateCampaignRequest

	// Decode body request
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Body request tidak valid", http.StatusBadRequest)
		return
	}

	// Validasi input
	if req.Name == "" {
		http.Error(w, "Nama campaign harus diisi", http.StatusBadRequest)
		return
	}

	// Insert campaign baru tanpa kontak
	db := db.GetDB()
	query := `INSERT INTO campaign (name) VALUES ($1) RETURNING id`
	var campaignID int
	err = db.QueryRow(query, req.Name).Scan(&campaignID)
	if err != nil {
		fmt.Printf("Error saat membuat campaign: %v\n", err)
		http.Error(w, "Gagal membuat campaign", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprintf(w, "Campaign berhasil dibuat dengan ID: %d\n", campaignID)
}

type ContactDetail struct {
	Name   string `json:"name"`
	Number string `json:"number"`
}

type UpdateCampaignContactsRequest struct {
	Contacts []ContactDetail `json:"contacts"`
}

// Handler untuk mengupdate campaign dengan menambahkan kontak
func UpdateCampaignHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	campaignID := vars["id"]

	var req UpdateCampaignContactsRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Body request tidak valid", http.StatusBadRequest)
		return
	}

	if len(req.Contacts) == 0 {
		http.Error(w, "Daftar kontak tidak boleh kosong", http.StatusBadRequest)
		return
	}

	// Konversi daftar kontak ke JSON
	contactsJSON, err := json.Marshal(req.Contacts)
	if err != nil {
		http.Error(w, "Gagal mengkonversi kontak ke JSON", http.StatusInternalServerError)
		return
	}

	// Update campaign dengan menambahkan kontak
	db := db.GetDB()
	query := `UPDATE campaign SET contact_list = $1 WHERE id = $2`
	_, err = db.Exec(query, contactsJSON, campaignID)
	if err != nil {
		http.Error(w, "Gagal mengupdate campaign", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "Kontak berhasil ditambahkan ke campaign")
}

func SendCampaignHandler(w http.ResponseWriter, r *http.Request) {
	var campaignRequest struct {
		Name     string            `json:"name"`
		Contacts map[string]string `json:"contacts"` // Key: Name, Value: Phone Number
	}

	// Parsing request body
	err := json.NewDecoder(r.Body).Decode(&campaignRequest)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validasi input
	if campaignRequest.Name == "" || len(campaignRequest.Contacts) == 0 {
		http.Error(w, "Campaign name and contacts are required", http.StatusBadRequest)
		return
	}

	// Simpan campaign ke database
	db := db.GetDB()
	err = saveCampaign(db, campaignRequest.Name, campaignRequest.Contacts)
	if err != nil {
		http.Error(w, "Failed to save campaign", http.StatusInternalServerError)
		return
	}

	fmt.Fprintln(w, "Campaign created successfully")
}

// Function to save campaign to the database
func saveCampaign(db *sql.DB, name string, contacts map[string]string) error {
	contactsJSON, err := json.Marshal(contacts)
	if err != nil {
		return fmt.Errorf("failed to marshal contacts: %v", err)
	}

	query := `INSERT INTO campaigns (name, contacts) VALUES ($1, $2)`
	_, err = db.Exec(query, name, contactsJSON)
	if err != nil {
		return fmt.Errorf("failed to insert campaign: %v", err)
	}

	return nil
}

func SendBlastCampaignHandler(w http.ResponseWriter, r *http.Request) {
    var blastRequest struct {
        SessionJID   string `json:"session_jid"`
        CampaignID   int    `json:"campaign_id"`
        Message      string `json:"message"`
        MediaPath    string `json:"mediaPath"`
        Delay        int    `json:"delay"`
        ScheduleTime string `json:"scheduleTime"`
    }

    // Parsing request body
    err := json.NewDecoder(r.Body).Decode(&blastRequest)
    if err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    // Validasi input
    if blastRequest.SessionJID == "" || blastRequest.CampaignID == 0 || blastRequest.Message == "" {
        http.Error(w, "session_jid, campaign_id, and message fields are required", http.StatusBadRequest)
        return
    }

    // Jika MediaPath diisi, maka tambahkan path absolut ke direktori file yang diupload
    if blastRequest.MediaPath != "" {
        mediaDir := "E:/GTR/wa_blast/wa_api/media/files" // Direktori tempat menyimpan file
        blastRequest.MediaPath = filepath.Join(mediaDir, blastRequest.MediaPath)
    }

    // Muat campaign dari database
    db := db.GetDB()
    contacts, err := loadCampaignContacts(db, blastRequest.CampaignID)
    if err != nil {
        fmt.Printf("Error loading campaign contacts: %v\n", err)
        http.Error(w, "Failed to load campaign contacts", http.StatusInternalServerError)
        return
    }

    if len(contacts) == 0 {
        fmt.Println("No contacts found for the campaign")
        http.Error(w, "No contacts found for the campaign", http.StatusBadRequest)
        return
    }

    fmt.Println("Contacts loaded successfully:", contacts)

    // Muat sesi WhatsApp dari database
    client, err := utils.LoadClientFromStore(blastRequest.SessionJID)
    if err != nil {
        http.Error(w, "Failed to load session", http.StatusInternalServerError)
        return
    }

    // Tambahkan logging untuk memastikan sesi terhubung
    fmt.Println("WhatsApp session loaded successfully")
	isDocument := filepath.Ext(blastRequest.MediaPath) != ".jpg" && filepath.Ext(blastRequest.MediaPath) != ".jpeg" && filepath.Ext(blastRequest.MediaPath) != ".png"

    successCount := 0
    failedCount := 0

    sendMessagesFunc := func() {
        for _, contact := range contacts {
            err := SendMedia(client, contact, blastRequest.Message, blastRequest.MediaPath, isDocument)
            if err != nil {
                fmt.Printf("Failed to send message to %s: %v\n", contact, err)
                failedCount++
            } else {
                fmt.Printf("Message sent to %s\n", contact)
                successCount++
            }
            // Delay antar pesan
            time.Sleep(time.Duration(blastRequest.Delay) * time.Second)
        }

        // Simpan history pengiriman setelah semua pesan dikirim
        err = saveCampaignHistory(db, blastRequest.SessionJID, blastRequest.Message, successCount, failedCount, contacts)
        if err != nil {
            fmt.Printf("Failed to save message history: %v\n", err)
        } else {
            fmt.Printf("Message history saved: Success %d, Failed %d\n", successCount, failedCount)
        }
    }

    if blastRequest.ScheduleTime != "" {
        // Jika ScheduleTime diisi, jadwalkan menggunakan cron
        scheduleTime, err := time.Parse(time.RFC3339, blastRequest.ScheduleTime)
        if err != nil {
            http.Error(w, "Invalid schedule time format", http.StatusBadRequest)
            return
        }

        // Hitung ekspresi cron berdasarkan waktu yang diberikan
        cronExpression := fmt.Sprintf("%d %d %d %d *", scheduleTime.Minute(), scheduleTime.Hour(), scheduleTime.Day(), int(scheduleTime.Month()))

        // Tambahkan tugas ke cron scheduler
        _, err = cronScheduler.AddFunc(cronExpression, sendMessagesFunc)
        if err != nil {
            http.Error(w, "Failed to schedule message", http.StatusInternalServerError)
            return
        }

        cronScheduler.Start() // Jalankan scheduler
        fmt.Fprintf(w, "Messages scheduled to be sent at %s\n", scheduleTime)
    } else {
        // Jika tidak ada penjadwalan, kirim pesan langsung dengan delay
        go sendMessagesFunc()
        fmt.Fprintln(w, "Messages are being sent with delay")
    }
}

// Function to load contacts from a campaign
func loadCampaignContacts(db *sql.DB, campaignID int) ([]string, error) {
	var contactsJSON []byte
	err := db.QueryRow("SELECT contact_list FROM campaign WHERE id = $1", campaignID).Scan(&contactsJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to load campaign contacts: %v", err)
	}

	// Unmarshal the JSON into a slice of Contact structs
	var contacts []ContactDetail
	err = json.Unmarshal(contactsJSON, &contacts)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal contacts: %v", err)
	}

	// Extract only the numbers into a string slice
	var phoneNumbers []string
	for _, contact := range contacts {
		phoneNumbers = append(phoneNumbers, contact.Number)
	}

	// Return the list of numbers
	if len(phoneNumbers) == 0 {
		return nil, fmt.Errorf("no contacts found for the campaign")
	}

	return phoneNumbers, nil
}

func saveCampaignHistory(db *sql.DB, sessionJID, message string, successCount, failedCount int, contacts []string) error {
    contactListJSON, err := json.Marshal(contacts) // Ubah daftar kontak menjadi JSON
    if err != nil {
        return fmt.Errorf("failed to marshal contact list: %v", err)
    }

	// Load location for Asia/Jakarta
	location, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		return fmt.Errorf("failed to load Asia/Jakarta location: %v", err)
	}

	// Get current time in Asia/Jakarta timezone
	createdAt := time.Now().In(location)

    query := `
        INSERT INTO message_history (device_jid, message, success, failed, contact_list, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)`

    _, err = db.Exec(query, sessionJID, message, successCount, failedCount, contactListJSON, createdAt)
    if err != nil {
        return fmt.Errorf("failed to insert message history: %v", err)
    }

    return nil
}
