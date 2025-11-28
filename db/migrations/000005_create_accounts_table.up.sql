CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20), -- 'bank', 'cash', 'e-wallet', 'credit'
    current_balance BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
    -- Nanti tambahkan user_id di sini
);