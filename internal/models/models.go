package models

import (
	"database/sql" // <-- 1. IMPORT "database/sql"
	"time"
)

type PaginatedTransactionsResponse struct {
	Data       []Transaction `json:"data"`
	Page       int           `json:"page"`
	Limit      int           `json:"limit"`
	TotalItems int64         `json:"total_items"`
	TotalPages int           `json:"total_pages"`
}

type TransactionExport struct {
	ID                     int64          `json:"id"`
	Amount                 int64          `json:"amount"`
	Type                   string         `json:"type"`
	Category               string         `json:"category"`
	Description            string         `json:"description"`
	Date                   time.Time      `json:"date"`
	CreatedAt              time.Time      `json:"created_at"`
	AccountID              int64          `json:"account_id"`
	DestinationAccountID   sql.NullInt64  `json:"destination_account_id"`
	AccountName            sql.NullString `json:"account_name"`
	DestinationAccountName sql.NullString `json:"destination_account_name"`
}

type User struct {
	ID           int64     `json:"id"`
	Name         string    `json:"name,omitempty"`
	Email        string    `json:"email"`
	Password     string    `json:"password,omitempty"` // Hanya untuk input, jangan disimpan
	PasswordHash string    `json:"-"`                  // Untuk database, jangan dikirim ke client
	CreatedAt    time.Time `json:"created_at"`
}
