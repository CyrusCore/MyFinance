CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- UNIQUE agar tidak ada nama kategori yang sama
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- (Opsional, tapi sangat disarankan)
-- Langsung isi dengan beberapa kategori awal
INSERT INTO categories (name) VALUES
('Makanan'),
('Transportasi'),
('Tagihan'),
('Hiburan'),
('Kesehatan'),
('Pendidikan'),
('Belanja'),
('Lainnya');