package db

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/jackc/pgx/v4/stdlib" // PostgreSQL driver
)

// DB global variable to store the connection
var DB *sql.DB

// ConnectDB initializes the connection to the database
func ConnectDB() error {
	var err error

	// Here we define the connection string, it could also be fetched from environment variables
	connStr := "postgres://postgres:password@localhost:5432/blast_wa?sslmode=disable"

	// Open the connection to the database
	DB, err = sql.Open("pgx", connStr)
	if err != nil {
		return fmt.Errorf("Failed to connect to database: %v", err)
	}

	// Check if the connection is actually open
	err = DB.Ping()
	if err != nil {
		return fmt.Errorf("Failed to ping database: %v", err)
	}

	log.Println("Database connection successfully established.")
	return nil
}

// GetDB returns the active database connection
func GetDB() *sql.DB {
	return DB
}
