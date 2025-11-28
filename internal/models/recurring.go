package models

import "time"

type RecurringTransaction struct {
	ID          int64     `json:"id"`
	Amount      int64     `json:"amount"`
	Type        string    `json:"type"`
	Category    string    `json:"category"`
	Description string    `json:"description"`
	Frequency   string    `json:"frequency"` // 'daily', 'weekly', 'monthly', 'yearly'
	Interval    int       `json:"interval"`
	StartDate   time.Time `json:"start_date"`
	NextDueDate time.Time `json:"next_due_date"`
	CreatedAt   time.Time `json:"created_at"`
}
