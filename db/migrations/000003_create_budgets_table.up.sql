CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    -- (Opsional: Tambahkan user_id di sini jika Anda sudah implementasi)
    -- user_id INT NOT NULL REFERENCES users(id),
    category_name VARCHAR(50) NOT NULL,
    amount BIGINT NOT NULL, -- Batas budget dalam 'sen'
    month INT NOT NULL, -- 1 = Jan, 2 = Feb, dst.
    year INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Pastikan hanya ada 1 budget per kategori per bulan per tahun
    -- (Sesuaikan ini jika Anda menambahkan user_id)
    UNIQUE(category_name, month, year)
);