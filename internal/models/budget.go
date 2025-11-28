package models

import "time"

type Budget struct {
	ID           int64     `json:"id"`
	CategoryName string    `json:"category_name"`
	Amount       int64     `json:"amount"` // dalam 'sen'
	Month        int       `json:"month"`
	Year         int       `json:"year"`
	CreatedAt    time.Time `json:"created_at"`
}
