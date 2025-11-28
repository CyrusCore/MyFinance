# 💸 Finance Tracker Pro

![Go Version](https://img.shields.io/badge/Go-1.20%2B-blue?style=for-the-badge&logo=go)
![React Version](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-blue?style=for-the-badge&logo=postgresql)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

Aplikasi pelacak keuangan pribadi *full-stack* modern yang dibangun dengan backend Go (Golang) yang aman dan frontend React (Vite) yang reaktif. Didesain untuk kecepatan, keamanan *multi-tenant*, dan pengalaman pengguna *real-time* menggunakan TanStack Query.

---

## ✨ Fitur Utama

* **🔐 Autentikasi JWT Aman:** Registrasi dan Login pengguna dengan *hashing* password `bcrypt` dan *session* berbasis JSON Web Token.
* **🏠 Arsitektur Multi-Tenant:** Data 100% terisolasi antar pengguna. `user_id` digunakan di setiap kueri database untuk memastikan privasi data.
* **📊 Dashboard Real-time:** Ditenagai oleh **TanStack Query (React Query)**, semua data (saldo akun, ringkasan) me-refresh secara otomatis di seluruh aplikasi setelah ada perubahan.
* **💸 Manajemen Finansial Lengkap:**
    * **Akun:** Buat banyak akun (misal: Dompet, Bank).
    * **Transaksi:** CRUD penuh untuk Pemasukan & Pengeluaran.
    * **Transfer:** Pindahkan uang antar akun dengan pembaruan saldo atomik.
* **🗓️ Perencanaan & Otomatisasi:**
    * **Anggaran:** Tetapkan batas pengeluaran bulanan per kategori.
    * **Transaksi Berulang:** Atur pendapatan/pengeluaran terjadwal.
* **📈 Laporan & Utilitas:**
    * **Pagination:** Daftar transaksi dimuat per halaman untuk performa cepat.
    * **Ekspor CSV:** Unduh seluruh riwayat transaksi Anda kapan saja.
* **🎨 UI Modern:** Dibangun dengan **Tailwind CSS**, *layout* *sidebar* yang *sticky*, dan notifikasi *toast* untuk setiap aksi.

---

## 🛠️ Tumpukan Teknologi (Tech Stack)

### ⚙️ Backend (Go)

| Kategori | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Bahasa** | Go (Golang) | Cepat, dikompilasi, dan efisien untuk API. |
| **Database** | PostgreSQL | Database relasional yang kuat. |
| **Driver DB** | `pgx/v5` | Driver PostgreSQL berperforma tinggi untuk Go. |
| **Router** | `gorilla/mux` | Router HTTP yang tangguh dan fleksibel. |
| **Autentikasi** | `bcrypt` & `jwt/v5` | Untuk *hashing* password & manajemen sesi JWT. |
| **Validasi** | `go-playground/validator` | (Direkomendasikan) Untuk validasi *struct* *payload*. |
| **Env** | `godotenv` | Mengelola variabel lingkungan dari file `.env`. |

### 🎨 Frontend (React)

| Kategori | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Library** | React 18 (Vite) | UI library modern dengan *build tool* super cepat. |
| **Styling** | Tailwind CSS | Kerangka kerja CSS *utility-first* untuk desain cepat. |
| **Navigasi** | `react-router-dom v6` | *Routing* sisi klien untuk aplikasi halaman tunggal (SPA). |
| **State Server** | `TanStack Query v5` | Mengelola *fetching*, *caching*, dan *auto-refresh* data. |
| **State Global** | React Context API | Mengelola status autentikasi (`AuthContext`). |
| **Permintaan API** | `axios` | Klien HTTP berbasis *promise* untuk *browser*. |
| **UI/UX** | `react-hot-toast` & `react-icons` | Notifikasi *pop-up* dan *icon library*. |

---

## 🚀 Memulai Proyek

Proyek ini adalah *monorepo* (dalam satu folder) tetapi dijalankan sebagai dua layanan terpisah: `backend` dan `frontend`. Anda perlu membuka **dua terminal**.

### Prerequisites

* Go 1.20+
* Node.js 18+
* PostgreSQL 14+
* `git` (untuk kloning)

---

### 1. ⚙️ Terminal 1: Menjalankan Backend (Go)

1.  **Clone Repositori:**
    ```bash
    git clone https://github.com/CyrusCore/MyFinance.git
    cd MyFinance
    ```

2.  **Konfigurasi Backend:**
    * Masuk ke direktori `backend` (atau *root* jika `main.go` ada di sana).
    * Buat file `.env` dan isi berdasarkan contoh di bawah:

    ```ini
    # .env
    # Ganti dengan koneksi string PostgreSQL Anda
    DATABASE_URL="postgresql://user:password@localhost:5432/finance_db?sslmode=disable"
    
    # BUAT string rahasia yang kuat untuk JWT
    JWT_SECRET="rahasia_anda_yang_sangat_panjang_dan_aman_sekali_123!"
    ```

3.  **Setup Database:**
    * Buat database Anda di PostgreSQL (misal: `CREATE DATABASE finance_db;`).
    * Jalankan **semua file migrasi SQL** di folder `/migrations` **secara berurutan**:
        ```bash
        # Contoh menggunakan psql:
        psql -U nama_user_db -d finance_db -f migrations/0001_create_users_table.sql
        psql -U nama_user_db -d finance_db -f migrations/0002_create_accounts_table.sql
        psql -U nama_user_db -d finance_db -f migrations/0003_add_multi_tenancy.sql
        # ... dan seterusnya
        ```

4.  **Install Dependensi & Jalankan:**
    ```bash
    go mod tidy  # Mengunduh semua dependensi
    go run ./cmd/main.go
    ```
    ✅ Backend Anda sekarang berjalan di `http://localhost:8080`.

---

### 2. 🎨 Terminal 2: Menjalankan Frontend (React)

1.  **Masuk ke Folder Frontend:**
    ```bash
    # Dari direktori root proyek
    cd frontend
    ```

2.  **Install Dependensi:**
    ```bash
    npm install
    ```

3.  **Jalankan Aplikasi:**
    ```bash
    npm run dev
    ```
    ✅ Frontend Anda sekarang berjalan di `http://localhost:5173`.

Buka `http://localhost:5173` di *browser* Anda. Anda akan diarahkan ke halaman Register/Login.

---