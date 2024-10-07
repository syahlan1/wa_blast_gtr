package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/syahlan1/wa_blast_gtr.git/db"
	"github.com/syahlan1/wa_blast_gtr.git/routes"
)

func main() {
	// Menghubungkan ke database
	err := db.ConnectDB()
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}

	r := mux.NewRouter()

	// Register all routes
	routes.RegisterRoutes(r)

	server := &http.Server{
		Handler:      r,
		Addr:         "127.0.0.1:3002",
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	// Mulai server
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Println("Server error:", err)
		}
	}()
	fmt.Println("Server started at http://127.0.0.1:3002")

	// Graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	fmt.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	server.Shutdown(ctx)

	fmt.Println("Server gracefully stopped")
}
