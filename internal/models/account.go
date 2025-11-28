package models

import "time"

type Account struct {
	ID             int64     `json:"id"`
	Name           string    `json:"name"`
	Type           string    `json:"type"`
	CurrentBalance int64     `json:"current_balance"` // Saldo dalam 'sen'
	CreatedAt      time.Time `json:"created_at"`
}
