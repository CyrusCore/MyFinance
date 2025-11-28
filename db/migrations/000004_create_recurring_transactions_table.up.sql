CREATE TABLE recurring_transactions (
    id SERIAL PRIMARY KEY,
    -- (Nanti tambahkan user_id di sini)
    
    amount BIGINT NOT NULL,
    type VARCHAR(10) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Seberapa sering: 'daily', 'weekly', 'monthly', 'yearly'
    frequency VARCHAR(10) NOT NULL, 
    -- Interval (misal: frequency='monthly' & interval=1 -> tiap 1 bulan)
    "interval" INT NOT NULL DEFAULT 1, 
    
    -- Tanggal mulai
    start_date DATE NOT NULL,
    -- Tanggal kapan transaksi ini akan diproses selanjutnya
    next_due_date DATE NOT NULL, 
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buat index untuk mempercepat worker
CREATE INDEX idx_recurring_next_due_date ON recurring_transactions(next_due_date);