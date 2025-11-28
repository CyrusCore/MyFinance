package models

import "time"

type Transaction struct {
	ID          int64     `json:"id"`
	Amount      int64     `json:"amount"` // HARUS SELALU POSITIF
	Type        string    `json:"type"`   // 'income', 'expense', 'transfer'
	Category    string    `json:"category"`
	Description string    `json:"description"`
	Date        time.Time `json:"date"`
	CreatedAt   time.Time `json:"created_at"`

	// --- KOLOM BARU ---
	AccountID int64 `json:"account_id"`

	// Pointer *int64 agar bisa null/nil
	DestinationAccountID *int64 `json:"destination_account_id,omitempty"`
}

type Summary struct {
	TotalIncome  int64 `json:"total_income"`  // Total Pemasukan
	TotalExpense int64 `json:"total_expense"` // Total Pengeluaran
	NetBalance   int64 `json:"net_balance"`   // Pemasukan - Pengeluaran
}
