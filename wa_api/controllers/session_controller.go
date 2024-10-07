package controllers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"log"

	_ "github.com/jackc/pgx/v4/stdlib"
	"github.com/syahlan1/wa_blast_gtr.git/utils"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	waLog "go.mau.fi/whatsmeow/util/log"

)

type CreateSessionRequest struct {
	ContactName   string `json:"contact_name"`
	ContactNumber string `json:"contact_number"`
}

func CreateSessionHandler(w http.ResponseWriter, r *http.Request) {
	var req CreateSessionRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ContactName == "" || req.ContactNumber == "" {
		http.Error(w, "contact_name and contact_number fields are required", http.StatusBadRequest)
		return
	}

	// Setup database log for WhatsMeow and connect
	dbLog := waLog.Stdout("Database", "DEBUG", true)
	container, err := sqlstore.New("pgx", "postgres://postgres:password@localhost:5432/blast_wa?sslmode=disable", dbLog)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to connect to DB: %v", err), http.StatusInternalServerError)
		return
	}

	// Create a new device store for WhatsApp
	deviceStore := container.NewDevice()
	clientLog := waLog.Stdout("Client", "DEBUG", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)
	client.AddEventHandler(utils.EventHandler)

	// QR Channel to receive the QR code
	if client.Store.ID == nil {
		qrChan, _ := client.GetQRChannel(context.Background())
		err = client.Connect()
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to connect client: %v", err), http.StatusInternalServerError)
			return
		}

		for evt := range qrChan {
			log.Printf("Received event: %+v\n", evt)  // Log untuk setiap event
		
			if evt.Event == "code" {
				// Mengirim QR code ke frontend
				response := map[string]string{"qr_code": evt.Code}
				json.NewEncoder(w).Encode(response)
				log.Printf("QR Code sent: %s\n", evt.Code)
				fmt.Printf("Received contact_name: %s, contact_number: %s\n", req.ContactName, req.ContactNumber)
		
				// Mulai goroutine untuk terus mendengarkan event lainnya (misalnya success)
				go func() {
					for evt := range qrChan {
						if evt.Event == "success" {
							// Simpan data ke database saat event success diterima
							err := UpdateDeviceWithContactInfo(req.ContactName, req.ContactNumber, client.Store.ID.String())
							if err != nil {
								log.Printf("Failed to update device info: %v\n", err)
							}
							log.Printf("Session created with JID: %s\n", client.Store.ID.String())
							break
						}
					}
				}()
				break
			}
		}
		
		
	} else {
		// Device already logged in
		err = client.Connect()
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to connect client: %v", err), http.StatusInternalServerError)
			return
		}
		fmt.Fprintf(w, "Session already connected with JID: %s\n", client.Store.ID.String())
	}
}

// Function to update `whatsmeow_device` with contact information
func UpdateDeviceWithContactInfo(contactName, contactNumber, sessionJID string) error {
    db, err := sql.Open("pgx", "postgres://postgres:password@localhost:5432/blast_wa?sslmode=disable")
    if err != nil {
        return err
    }
    defer db.Close()

    // Cek apakah perangkat dengan JID ini sudah ada
    var count int
    err = db.QueryRow("SELECT COUNT(*) FROM whatsmeow_device WHERE jid = $1", sessionJID).Scan(&count)
    if err != nil {
        return fmt.Errorf("failed to check device existence: %v", err)
    }

    if count == 0 {
        // Jika belum ada, lakukan INSERT
        query := `INSERT INTO whatsmeow_device (contact_name, contact_number, jid) VALUES ($1, $2, $3)`
        _, err = db.Exec(query, contactName, contactNumber, sessionJID)
        if err != nil {
            return fmt.Errorf("failed to insert new device: %v", err)
        }
        log.Printf("Inserted new device with JID: %s\n", sessionJID)
    } else {
        // Jika sudah ada, lakukan UPDATE
        query := `UPDATE whatsmeow_device SET contact_name = $1, contact_number = $2 WHERE jid = $3`
        _, err = db.Exec(query, contactName, contactNumber, sessionJID)
        if err != nil {
            return fmt.Errorf("failed to update device: %v", err)
        }
        log.Printf("Updated device with JID: %s\n", sessionJID)
    }

    return nil
}

// Struct untuk request penghapusan sesi
type DeleteSessionRequest struct {
	SessionJID string `json:"session_jid"`
}

// Endpoint untuk menghapus sesi WhatsApp
func DeleteSessionHandler(w http.ResponseWriter, r *http.Request) {
	var req DeleteSessionRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validasi input
	if req.SessionJID == "" {
		http.Error(w, "session_jid field is required", http.StatusBadRequest)
		return
	}

	// Disconnect klien WhatsApp
	client, err := utils.LoadClientFromStore(req.SessionJID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to load session: %v", err), http.StatusInternalServerError)
		return
	}

	client.Disconnect()

	// Hapus sesi dari tabel `whatsmeow_devices`
	err = DeleteSessionFromWhatsMeowDB(req.SessionJID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to delete session from DB: %v", err), http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "Session with JID %s has been deleted successfully\n", req.SessionJID)
}

func DeleteSessionFromWhatsMeowDB(sessionJID string) error {
	db, err := sql.Open("pgx", "postgres://postgres:password@localhost:5432/blast_wa?sslmode=disable")
	if err != nil {
		return err
	}
	defer db.Close()

	// Hapus sesi dari tabel `whatsmeow_devices`
	_, err = db.Exec(`DELETE FROM whatsmeow_device WHERE jid = $1`, sessionJID)
	if err != nil {
		return err
	}

	fmt.Println("Session deleted from whatsmeow_device table:", sessionJID)
	return nil
}

// Fungsi untuk mengambil sesi beserta nama kontak dan nomor kontak
func GetSessionsHandler(w http.ResponseWriter, r *http.Request) {
	db, err := sql.Open("pgx", "postgres://postgres:password@localhost:5432/blast_wa?sslmode=disable")
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to connect to DB: %v", err), http.StatusInternalServerError)
		return
	}
	defer db.Close()

	// Ambil semua sesi beserta nama kontak dan nomor kontak dari `whatsmeow_devices`
	rows, err := db.Query(`SELECT jid, contact_name, contact_number FROM whatsmeow_device`)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to retrieve sessions: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var sessions []map[string]string
	for rows.Next() {
		var jid, contactName, contactNumber string
		err := rows.Scan(&jid, &contactName, &contactNumber)
		if err != nil {
			http.Error(w, "Error reading row", http.StatusInternalServerError)
			return
		}

		session := map[string]string{
			"jid":            jid,
			"contact_name":   contactName,
			"contact_number": contactNumber,
		}
		sessions = append(sessions, session)
	}

	// Return sessions as JSON
	json.NewEncoder(w).Encode(sessions)
}


type DeviceData struct {
	JID           string `json:"jid"`
	ContactName   string `json:"contact_name"`
	ContactNumber string `json:"contact_number"`
	Success       int    `json:"success"`
	Failed        int    `json:"failed"`
}

// Fungsi untuk mengambil data perangkat dan relasi ke history pesan
func GetDevicesWithHistory(w http.ResponseWriter, r *http.Request) {
	db, err := sql.Open("pgx", "postgres://postgres:password@localhost:5432/blast_wa?sslmode=disable")
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to connect to DB: %v", err), http.StatusInternalServerError)
		return
	}
	defer db.Close()

	query := `
		SELECT wd.jid, wd.contact_name, wd.contact_number, 
		       COALESCE(SUM(mh.success), 0) AS success, 
		       COALESCE(SUM(mh.failed), 0) AS failed
		FROM whatsmeow_device wd
		LEFT JOIN message_history mh ON mh.device_jid = wd.jid
		GROUP BY wd.jid, wd.contact_name, wd.contact_number
		ORDER BY wd.id DESC
	`

	rows, err := db.Query(query)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to execute query: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var devices []DeviceData
	for rows.Next() {
		var device DeviceData
		err := rows.Scan(&device.JID, &device.ContactName, &device.ContactNumber, &device.Success, &device.Failed)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to scan row: %v", err), http.StatusInternalServerError)
			return
		}
		devices = append(devices, device)
	}

	json.NewEncoder(w).Encode(devices)
}
