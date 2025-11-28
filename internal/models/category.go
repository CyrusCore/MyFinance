package models

import "time"

type Category struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}
type CategorySummary struct {
	Category    string `json:"category"`
	TotalAmount int64  `json:"total_amount"`
}
