-- 1. Tambahkan kolom baru
ALTER TABLE transactions 
    ADD COLUMN account_id INT REFERENCES accounts(id),
    ADD COLUMN destination_account_id INT REFERENCES accounts(id) DEFAULT NULL;

-- 2. Hubungkan semua transaksi lama ke akun default (ID=1)
-- (Asumsi ID 1 adalah 'Dompet Utama' dari migrasi sebelumnya)
UPDATE transactions SET account_id = 1;

-- 3. Jadikan account_id wajib (NOT NULL)
ALTER TABLE transactions ALTER COLUMN account_id SET NOT NULL;

-- 4. Ubah 'type' untuk 'Transfer' di masa depan
-- (Tidak perlu mengubah 'type' yang ada ('income'/'expense'))

-- 5. (PENTING) Pastikan semua 'amount' positif
-- Jika Anda menyimpan expense sebagai angka negatif, jalankan ini:
-- UPDATE transactions SET amount = ABS(amount) WHERE type = 'expense';