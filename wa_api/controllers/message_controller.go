package controllers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"
	"mime"

	_ "github.com/jackc/pgx/v4/stdlib"
	"github.com/robfig/cron/v3"
	"github.com/syahlan1/wa_blast_gtr.git/db"
	"github.com/syahlan1/wa_blast_gtr.git/utils"
	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/types"
	"google.golang.org/protobuf/proto"

)

// Function to handle sending blast messages
var cronScheduler *cron.Cron

func init() {
    cronScheduler = cron.New()
    cronScheduler.Start() // Jalankan scheduler satu kali di awal
}


type MessageRequest struct {
	SessionJID   string   `json:"session_jid"`
	ToNumbers    []string `json:"to_numbers"`
	Message      string   `json:"message"`
	MediaPath    string   `json:"mediaPath"`
	Delay        int      `json:"delay"`
	ScheduleTime string   `json:"scheduleTime"`
}

func SendMedia(client *whatsmeow.Client, number, message, mediaPath string, isDocument bool) error {
	jid := types.NewJID(number, "s.whatsapp.net")

	// Jika mediaPath kosong, kirimkan pesan teks saja
	if mediaPath == "" {
		msg := &waProto.Message{
			Conversation: proto.String(message),
		}
		_, err := client.SendMessage(context.Background(), jid, msg)
		if err != nil {
			return fmt.Errorf("failed to send text message: %v", err)
		}
		fmt.Println("Text message sent to", number)
		return nil
	}

	// Resolving absolute file path jika mediaPath tidak kosong
	absolutePath, err := filepath.Abs(mediaPath)
	if err != nil {
		return fmt.Errorf("failed to resolve absolute path: %v", err)
	}

	// Membaca file media
	mediaData, err := os.ReadFile(absolutePath)
	if err != nil {
		return fmt.Errorf("failed to read media file: %v", err)
	}


	// Upload file media ke server WhatsApp
	mediaType := whatsmeow.MediaImage
	if isDocument {
		mediaType = whatsmeow.MediaDocument
	}

	uploadResp, err := client.Upload(context.Background(), mediaData, mediaType)
	if err != nil {
		return fmt.Errorf("failed to upload media: %v", err)
	}

	mimeType := mime.TypeByExtension(filepath.Ext(absolutePath))
	if mimeType == "" {
		// Tetapkan default MIME type jika tidak ditemukan
		mimeType = "application/octet-stream"
	}

	// Siapkan pesan media
	var msg *waProto.Message
	if isDocument {
		msg = &waProto.Message{
			DocumentMessage: &waProto.DocumentMessage{
				URL:           &uploadResp.URL,
				DirectPath:    &uploadResp.DirectPath,
				Mimetype:      proto.String(mimeType),
				FileName:      proto.String(filepath.Base(absolutePath)),
				FileLength:    &uploadResp.FileLength,
				FileEncSHA256: uploadResp.FileEncSHA256,
				FileSHA256:    uploadResp.FileSHA256,
				MediaKey:      uploadResp.MediaKey,
				Caption:       proto.String(message),
			},
		}
	} else {
		msg = &waProto.Message{
			ImageMessage: &waProto.ImageMessage{
				URL:           &uploadResp.URL,
				DirectPath:    &uploadResp.DirectPath,
				Mimetype:      proto.String(mimeType),
				FileLength:    &uploadResp.FileLength,
				FileEncSHA256: uploadResp.FileEncSHA256,
				FileSHA256:    uploadResp.FileSHA256,
				MediaKey:      uploadResp.MediaKey,
				Caption:       proto.String(message),
			},
		}
	}

	// Kirim pesan media
	_, err = client.SendMessage(context.Background(), jid, msg)
	if err != nil {
		return fmt.Errorf("failed to send media message: %v", err)
	}

	fmt.Println("Media message sent to", number)
	return nil
}

// Fungsi untuk mengirim pesan dengan delay per pesan
func sendMessagesWithDelay(client *whatsmeow.Client, numbers []string, message, mediaPath string, isDocument bool, delay int) {
	totalMessages := len(numbers)
	successCount := 0
	failedCount := 0

	for i, number := range numbers {
		err := SendMedia(client, number, message, mediaPath, isDocument)
		if err != nil {
			failedCount++
			fmt.Printf("Failed to send message to %s: %v\n", number, err)
		} else {
			successCount++
			fmt.Printf("Message sent to %s\n", number)
		}

		// Tampilkan progres pengiriman
		fmt.Printf("Progress: %d/%d messages sent (Success: %d, Failed: %d)\n", i+1, totalMessages, successCount, failedCount)

		// Delay antar pesan
		time.Sleep(time.Duration(delay) * time.Second)
	}
	fmt.Printf("Final Report: %d messages sent, %d failed\n", successCount, failedCount)
}

// Fungsi untuk menangani permintaan pengiriman blast dengan delay dan penjadwalan
func SendBlastHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SessionJID   string   `json:"session_jid"`
		ToNumbers    []string `json:"to_numbers"`
		Message      string   `json:"message"`
		MediaPath    string   `json:"mediaPath"`
		Delay        int      `json:"delay"`
		ScheduleTime string   `json:"scheduleTime"`
	}

	// Parsing request body
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validasi input
	if req.SessionJID == "" || len(req.ToNumbers) == 0 || req.Message == "" {
		http.Error(w, "session_jid, to_numbers, and message fields are required", http.StatusBadRequest)
		return
	}

	// Jika MediaPath diisi, maka tambahkan path absolut ke direktori file yang diupload
	if req.MediaPath != "" {
		mediaDir := "E:/GTR/wa_blast/wa_api/media/files"
		absMediaPath := filepath.Join(mediaDir, filepath.Base(req.MediaPath)) // Hanya gunakan nama file dari MediaPath
		if _, err := os.Stat(absMediaPath); os.IsNotExist(err) {
			http.Error(w, "Media file not found", http.StatusInternalServerError)
			return
		}
		req.MediaPath = absMediaPath
	}

	// Muat sesi dari database
	client, err := utils.LoadClientFromStore(req.SessionJID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to load session: %v", err), http.StatusInternalServerError)
		return
	}

	// Tentukan apakah file yang dikirim adalah dokumen
	isDocument := filepath.Ext(req.MediaPath) != ".jpg" && filepath.Ext(req.MediaPath) != ".jpeg" && filepath.Ext(req.MediaPath) != ".png"

	successCount := 0
	failedCount := 0

	// Fungsi untuk mengirim pesan
	sendMessagesFunc := func() {
		for _, number := range req.ToNumbers {
			err := SendMedia(client, number, req.Message, req.MediaPath, isDocument)
			if err != nil {
				fmt.Printf("Failed to send message to %s: %v\n", number, err)
				failedCount++
			} else {
				fmt.Printf("Message sent to %s\n", number)
				successCount++
			}
			// Delay antar pesan
			time.Sleep(time.Duration(req.Delay) * time.Second)
		}

		// Simpan history pengiriman setelah semua pesan dikirim
		db := db.GetDB()
		err = saveHistory(db, req.SessionJID, req.Message, successCount, failedCount, req.ToNumbers)
		if err != nil {
			fmt.Printf("Failed to save message history: %v\n", err)
		} else {
			fmt.Printf("Message history saved: Success %d, Failed %d\n", successCount, failedCount)
		}
	}

	if req.ScheduleTime != "" {
		// Jika ScheduleTime diisi, jadwalkan menggunakan cron
		scheduleTime, err := time.Parse(time.RFC3339, req.ScheduleTime)
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

		fmt.Fprintf(w, "Messages scheduled to be sent at %s\n", scheduleTime)
	} else {
		// Jika tidak ada penjadwalan, kirim pesan langsung dengan delay
		go sendMessagesFunc()
		fmt.Fprintln(w, "Messages are being sent with delay")
	}
}


// Fungsi untuk menghapus nomor telepon yang duplikat
func removeDuplicates(numbers []string) []string {
	uniqueNumbers := make(map[string]bool)
	var result []string

	for _, number := range numbers {
		if _, seen := uniqueNumbers[number]; !seen {
			uniqueNumbers[number] = true
			result = append(result, number)
		}
	}
	return result
}

func saveHistory(db *sql.DB, deviceJID string, message string, success, failed int, contactList []string) error {
	// Convert contactList to JSON format
	contactListJSON, err := json.Marshal(contactList)
	if err != nil {
		return fmt.Errorf("failed to marshal phone numbers: %v", err)
	}

	// Load location for Asia/Jakarta
	location, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		return fmt.Errorf("failed to load Asia/Jakarta location: %v", err)
	}

	// Get current time in Asia/Jakarta timezone
	createdAt := time.Now().In(location)

	// Insert data into the message_history table
	query := `INSERT INTO message_history (device_jid, message, created_at, success, failed, contact_list)
              VALUES ($1, $2, $3, $4, $5, $6)`
	_, err = db.Exec(query, deviceJID, message, createdAt, success, failed, contactListJSON)
	if err != nil {
		return fmt.Errorf("failed to insert history: %v", err)
	}

	fmt.Println("History saved successfully with Indonesian timezone")
	return nil
}

