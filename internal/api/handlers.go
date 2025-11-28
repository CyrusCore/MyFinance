package api

import (
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/bramszs/finance-tracker/internal/models"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

func (s *Store) generateJWT(user *models.User) (string, error) {
	// Buat claims (data di dalam token)
	claims := jwt.MapClaims{
		"sub":   user.ID, // Subject (ID Pengguna)
		"email": user.Email,
		"exp":   time.Now().Add(time.Hour * 72).Unix(), // Expired dalam 3 hari
	}

	// Buat token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Tandatangani dengan secret
	return token.SignedString([]byte(s.jwtSecret))
}
func parseAccountID(r *http.Request) int64 {
	accIDStr := r.URL.Query().Get("account_id")
	if accIDStr == "" {
		return 0 // 0 berarti "Semua Akun"
	}

	accID, err := strconv.ParseInt(accIDStr, 10, 64)
	if err != nil {
		return 0 // Anggap sebagai "Semua Akun" jika format salah
	}
	return accID
}
func respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	response, err := json.Marshal(payload)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(err.Error()))
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(response)
}
func parseIDFromVars(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		return 0, errors.New("missing transaction ID")
	}
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return 0, errors.New("invalid transaction ID format")
	}
	return id, nil
}

func respondError(w http.ResponseWriter, code int, message string) {
	respondJSON(w, code, map[string]string{"error": message})
}

type CreateCategoryRequest struct {
	Name string `json:"name"`
}

func (s *Store) HandleRegister(w http.ResponseWriter, r *http.Request) {
	var user models.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	if user.Name == "" || user.Email == "" || user.Password == "" {
		respondError(w, http.StatusBadRequest, "Name, email, and password are required")
		return
	}
	// Validasi input
	if user.Email == "" || user.Password == "" {
		respondError(w, http.StatusBadRequest, "Email and password are required")
		return
	}
	if len(user.Password) < 8 {
		respondError(w, http.StatusBadRequest, "Password must be at least 8 characters long")
		return
	}

	// Hashing password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to hash password")
		return
	}
	user.PasswordHash = string(hashedPassword)
	user.Password = "" // Kosongkan password input

	// Simpan ke DB
	if err := s.CreateUser(r.Context(), &user); err != nil {
		if strings.Contains(err.Error(), "unique constraint") {
			respondError(w, http.StatusConflict, "Email already exists")
		} else {
			respondError(w, http.StatusInternalServerError, "Failed to create user")
			log.Printf("Error creating user: %v", err)
		}
		return
	}
	// Kirim respons sukses
	respondJSON(w, http.StatusCreated, map[string]string{"message": "User created successfully"})
}

// --- Handler Login ---
func (s *Store) HandleLogin(w http.ResponseWriter, r *http.Request) {
	var input models.User
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// 1. Cari user by email
	user, err := s.GetUserByEmail(r.Context(), input.Email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respondError(w, http.StatusUnauthorized, "Invalid email or password")
		} else {
			respondError(w, http.StatusInternalServerError, "Database error")
		}
		return
	}

	// 2. Bandingkan password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password))
	if err != nil {
		// Password tidak cocok
		respondError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// 3. Buat JWT
	tokenString, err := s.generateJWT(user)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	// 4. Kirim token ke client
	respondJSON(w, http.StatusOK, map[string]string{"token": tokenString})
}
func (s *Store) HandleExportCSV(w http.ResponseWriter, r *http.Request) {
	// 1. Ambil semua data
	transactions, err := s.GetTransactionsForExport(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch transactions")
		return
	}

	// 2. Set Header agar browser men-download
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=\"laporan-transaksi.csv\"")

	// 3. Buat CSV Writer
	writer := csv.NewWriter(w)
	defer writer.Flush()

	// 4. Tulis Baris Header
	header := []string{
		"ID Transaksi", "Tanggal", "Tipe", "Jumlah (Rp)", "Kategori",
		"Deskripsi", "Akun Asal", "Akun Tujuan",
	}
	if err := writer.Write(header); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to write CSV header")
		return
	}

	// 5. Tulis Baris Data
	for _, tx := range transactions {
		// Konversi data ke string
		amount := strconv.FormatFloat(float64(tx.Amount)/100, 'f', 2, 64)
		date := tx.Date.Format("2006-01-02") // Format YYYY-MM-DD

		accountName := tx.AccountName.String // .String akan kosong jika NULL
		destAccountName := tx.DestinationAccountName.String

		row := []string{
			fmt.Sprintf("%d", tx.ID),
			date,
			tx.Type,
			amount,
			tx.Category,
			tx.Description,
			accountName,
			destAccountName,
		}

		if err := writer.Write(row); err != nil {
			// Sulit mengirim error di sini karena header sudah dikirim
			// Cukup log saja
			fmt.Printf("Error writing CSV row: %v\n", err)
			return
		}
	}
}
func (s *Store) CreateCategoryHandler(w http.ResponseWriter, r *http.Request) {
	var req CreateCategoryRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" {
		respondError(w, http.StatusBadRequest, "Category name cannot be empty")
		return
	}

	cat := &models.Category{
		Name: req.Name,
	}

	if err := s.CreateCategory(r.Context(), cat); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			respondError(w, http.StatusConflict, "Category name already exists")
		} else {
			respondError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}

	respondJSON(w, http.StatusCreated, cat)
}

func (s *Store) GetCategoriesHandler(w http.ResponseWriter, r *http.Request) {
	categories, err := s.GetCategories(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, categories)
}

func (s *Store) GetSummaryHandler(w http.ResponseWriter, r *http.Request) {
	startDateStr := r.URL.Query().Get("start")
	endDateStr := r.URL.Query().Get("end")

	var startDate, endDate time.Time
	var err error

	if startDateStr == "" || endDateStr == "" {
		now := time.Now()
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		endDate = startDate.AddDate(0, 1, 0).Add(-time.Nanosecond)
	} else {
		layout := "2006-01-02"
		startDate, err = time.Parse(layout, startDateStr)
		if err != nil {
			respondError(w, http.StatusBadRequest, "Invalid start date format, use yyyy-mm-dd")
			return
		}

		endDate, err = time.Parse(layout, endDateStr)
		if err != nil {
			respondError(w, http.StatusBadRequest, "Invalid end date format, use yyyy-mm-dd")
			return
		}

		endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 0, endDate.Location())
	}

	accountID := parseAccountID(r) // <-- Panggil helper baru

	summary, err := s.GetSummary(r.Context(), startDate, endDate, accountID) // <-- Kirim accountID
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, summary)
}

func (s *Store) CreateTransactionHandler(w http.ResponseWriter, r *http.Request) {
	var tx models.Transaction

	if err := json.NewDecoder(r.Body).Decode(&tx); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if tx.Amount == 0 {
		respondError(w, http.StatusBadRequest, "Amount cannot be zero")
		return
	}
	// if tx.Type != "income" && tx.Type != "expense" {
	// 	respondError(w, http.StatusBadRequest, "Type must be 'income' or 'expense'")
	// 	return
	// }
	if tx.AccountID <= 0 {
		// Jika frontend mengirim null, 0, atau string kosong,
		// txData.AccountID akan jadi 0, dan kita TOLAK di sini.
		respondError(w, http.StatusBadRequest, "Invalid Account ID. Akun tidak boleh kosong.")
		return
	}

	if err := s.CreateTransaction(r.Context(), &tx); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, tx)
}

func (s *Store) HandleGetTransactions(w http.ResponseWriter, r *http.Request) {
	// --- Parse Query Params ---
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1 // Default halaman 1
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 25 // Default 25 item per halaman
	}

	// Panggil store dengan parameter baru
	response, err := s.GetTransactions(r.Context(), page, limit)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, response)
}

func (s *Store) GetCategorySummaryHandler(w http.ResponseWriter, r *http.Request) {
	// Ambil query params
	startDateStr := r.URL.Query().Get("start")
	endDateStr := r.URL.Query().Get("end")

	var startDate, endDate time.Time
	var err error

	// Jika parameter tidak ada, gunakan default bulan ini
	if startDateStr == "" || endDateStr == "" {
		now := time.Now()
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		endDate = startDate.AddDate(0, 1, 0).Add(-time.Nanosecond)
	} else {
		layout := "2006-01-02"
		startDate, err = time.Parse(layout, startDateStr)
		if err != nil {
			respondError(w, http.StatusBadRequest, "Invalid start date format, use yyyy-mm-dd")
			return
		}
		endDate, err = time.Parse(layout, endDateStr)
		if err != nil {
			respondError(w, http.StatusBadRequest, "Invalid end date format, use yyyy-mm-dd")
			return
		}
		endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 0, endDate.Location())
	}

	// Panggil store
	accountID := parseAccountID(r) // <-- Panggil helper baru

	summary, err := s.GetCategorySummary(r.Context(), startDate, endDate, accountID) // <-- Kirim accountID
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, summary)
}

func (s *Store) DeleteTransactionHandler(w http.ResponseWriter, r *http.Request) {
	// Ambil variabel 'id' dari URL
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		respondError(w, http.StatusBadRequest, "Missing transaction ID")
		return
	}

	// Konversi id dari string ke int64
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid transaction ID format")
		return
	}

	// Panggil store untuk menghapus
	if err := s.DeleteTransaction(r.Context(), id); err != nil {
		// Cek apakah error-nya adalah "not found"
		if err.Error() == "transaction not found or already deleted" {
			respondError(w, http.StatusNotFound, err.Error())
		} else {
			respondError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}

	// Kirim respon sukses tanpa body
	w.WriteHeader(http.StatusNoContent)
}

func (s *Store) GetTransactionByIDHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDFromVars(r)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	tx, err := s.GetTransactionByID(r.Context(), id)
	if err != nil {
		// Cek apakah error-nya 'no rows' (tidak ditemukan)
		if err.Error() == "no rows in result set" {
			respondError(w, http.StatusNotFound, "Transaction not found")
		} else {
			respondError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}

	respondJSON(w, http.StatusOK, tx)
}

func (s *Store) UpdateTransactionHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDFromVars(r)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	var tx models.Transaction
	// Decode JSON body ke struct
	if err := json.NewDecoder(r.Body).Decode(&tx); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	tx.ID = id

	if err := s.UpdateTransaction(r.Context(), &tx); err != nil {
		if err.Error() == "transaction not found" {
			respondError(w, http.StatusNotFound, err.Error())
		} else {
			respondError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}

	// Kirim kembali data yang sudah di-update
	// (Kita bisa saja memanggil GetTransactionByID lagi, tapi ini lebih cepat)
	respondJSON(w, http.StatusOK, tx)
}

func (s *Store) HandleSetBudget(w http.ResponseWriter, r *http.Request) {
	var budget models.Budget

	if err := json.NewDecoder(r.Body).Decode(&budget); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validasi sederhana
	if budget.CategoryName == "" || budget.Amount < 0 || budget.Month == 0 || budget.Year == 0 {
		respondError(w, http.StatusBadRequest, "Missing required fields")
		return
	}

	if err := s.SetBudget(r.Context(), &budget); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, budget)
}

// HandleGetBudgets menangani GET /api/budgets
func (s *Store) HandleGetBudgets(w http.ResponseWriter, r *http.Request) {
	// Ambil bulan dan tahun dari query param
	// Default ke bulan & tahun saat ini
	now := time.Now()
	monthStr := r.URL.Query().Get("month")
	yearStr := r.URL.Query().Get("year")

	month, err := strconv.Atoi(monthStr)
	if err != nil || month < 1 || month > 12 {
		month = int(now.Month()) // Default: bulan ini
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil {
		year = now.Year() // Default: tahun ini
	}

	budgets, err := s.GetBudgets(r.Context(), month, year)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, budgets)
}

func (s *Store) HandleGetRecurringTransactions(w http.ResponseWriter, r *http.Request) {
	transactions, err := s.GetRecurringTransactions(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, transactions)
}

// HandleCreateRecurringTransaction menangani POST /api/recurring
func (s *Store) HandleCreateRecurringTransaction(w http.ResponseWriter, r *http.Request) {
	var rt models.RecurringTransaction
	if err := json.NewDecoder(r.Body).Decode(&rt); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// (Tambahkan validasi di sini: cek amount, frequency, dll)

	if err := s.CreateRecurringTransaction(r.Context(), &rt); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, rt)
}

// HandleDeleteRecurringTransaction menangani DELETE /api/recurring/{id}
func (s *Store) HandleDeleteRecurringTransaction(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDFromVars(r) // Ambil helper 'parseIDFromVars' dari handler Delete biasa
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := s.DeleteRecurringTransaction(r.Context(), id); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Store) HandleCreateAccount(w http.ResponseWriter, r *http.Request) {
	var acc models.Account
	if err := json.NewDecoder(r.Body).Decode(&acc); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := s.CreateAccount(r.Context(), &acc); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, acc)
}

// HandleGetAccounts menangani GET /api/accounts
func (s *Store) HandleGetAccounts(w http.ResponseWriter, r *http.Request) {
	accounts, err := s.GetAccounts(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, accounts)
}

func (s *Store) HandleCreateTransfer(w http.ResponseWriter, r *http.Request) {
	var txData models.Transaction
	if err := json.NewDecoder(r.Body).Decode(&txData); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// --- Validasi Kritis di Sisi Server ---
	if txData.Amount <= 0 {
		respondError(w, http.StatusBadRequest, "Amount must be greater than zero")
		return
	}
	if txData.AccountID <= 0 {
		respondError(w, http.StatusBadRequest, "Invalid source account ID")
		return
	}
	if txData.DestinationAccountID == nil || *txData.DestinationAccountID <= 0 {
		respondError(w, http.StatusBadRequest, "Invalid destination account ID")
		return
	}
	if txData.AccountID == *txData.DestinationAccountID {
		respondError(w, http.StatusBadRequest, "Source and destination accounts cannot be the same")
		return
	}
	// --- Akhir Validasi ---

	// Paksa Tipe & Kategori (agar aman)
	txData.Type = "transfer"
	if txData.Category == "" {
		txData.Category = "Transfer"
	}

	// Panggil logika store
	if err := s.CreateTransfer(r.Context(), &txData); err != nil {
		// Cek error spesifik
		if err.Error() == "account not found, balance not updated" {
			respondError(w, http.StatusBadRequest, "One of the accounts does not exist.")
		} else {
			respondError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}

	respondJSON(w, http.StatusCreated, txData)
}
