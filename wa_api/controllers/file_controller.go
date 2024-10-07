package controllers

import (
    "path/filepath"
	"net/http"
	"os"
	"io"
	"encoding/json"
	"time"
	"fmt"

)

func UploadFile(w http.ResponseWriter, r *http.Request) {
    r.ParseMultipartForm(10 << 20) // Maksimal 10MB file upload
    file, handler, err := r.FormFile("file")
    if err != nil {
        http.Error(w, "Failed to retrieve file", http.StatusBadRequest)
        return
    }
    defer file.Close()

    // Ambil nama asli file tanpa ekstensi
    fileBaseName := handler.Filename
    fileExt := filepath.Ext(fileBaseName) // Ambil ekstensi file (misalnya ".jpg", ".pdf", dll)
    fileNameOnly := fileBaseName[0 : len(fileBaseName)-len(fileExt)] // Nama file tanpa ekstensi

    // Dapatkan waktu sekarang dalam format yang diinginkan
    timestamp := time.Now().Format("20060102_150405") // Format: YYYYMMDD_HHMMSS

    // Buat nama file baru dengan format: namaFile_timestamp.ekstensi
    newFileName := fmt.Sprintf("%s_%s%s", fileNameOnly, timestamp, fileExt)
    filePath := filepath.Join("media/files", newFileName)

    // Simpan file dengan nama baru
    f, err := os.Create(filePath)
    if err != nil {
        http.Error(w, "Failed to create file", http.StatusInternalServerError)
        return
    }
    defer f.Close()

    _, err = io.Copy(f, file)
    if err != nil {
        http.Error(w, "Failed to save file", http.StatusInternalServerError)
        return
    }

    // Kembalikan path file yang disimpan ke frontend
    response := map[string]string{"filePath": newFileName}
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

