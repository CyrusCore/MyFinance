package api

import (
	"context"
	"errors"
	"fmt"
	"github.com/bramszs/finance-tracker/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"math"
	"time"
)

type Store struct {
	Pool      *pgxpool.Pool
	jwtSecret string
}

func NewStore(pool *pgxpool.Pool, jwtSecret string) *Store {
	return &Store{
		Pool:      pool,
		jwtSecret: jwtSecret, // <-- SET INI
	}
}
func getTransactionByID_withinTX(ctx context.Context, tx pgx.Tx, id int64) (models.Transaction, error) {
	var oldTx models.Transaction
	queryGet := `
		SELECT id, amount, type, category, description, date, 
		       account_id, destination_account_id 
		FROM transactions WHERE id = $1`

	err := tx.QueryRow(ctx, queryGet, id).Scan(
		&oldTx.ID, &oldTx.Amount, &oldTx.Type, &oldTx.Category, &oldTx.Description, &oldTx.Date,
		&oldTx.AccountID, &oldTx.DestinationAccountID,
	)
	return oldTx, err
}
func revertTransactionBalance(ctx context.Context, tx pgx.Tx, oldTx models.Transaction) error {
	if oldTx.Type == "income" {
		// Dulu income. Saldo BERKURANG.
		return updateAccountBalance(ctx, tx, oldTx.AccountID, -oldTx.Amount)
	} else if oldTx.Type == "expense" {
		// Dulu expense. Saldo BERTAMBAH.
		return updateAccountBalance(ctx, tx, oldTx.AccountID, oldTx.Amount)
	} else if oldTx.Type == "transfer" {
		// Dulu transfer. Kembalikan ke ASAL.
		if err := updateAccountBalance(ctx, tx, oldTx.AccountID, oldTx.Amount); err != nil {
			return err
		}
		// Ambil dari TUJUAN.
		return updateAccountBalance(ctx, tx, *oldTx.DestinationAccountID, -oldTx.Amount)
	}
	return nil // Tipe tidak dikenal, tidak ada yg di-revert
}
func applyTransactionBalance(ctx context.Context, tx pgx.Tx, newTx models.Transaction) error {
	if newTx.Type == "income" {
		// Income baru. Saldo BERTAMBAH.
		return updateAccountBalance(ctx, tx, newTx.AccountID, newTx.Amount)
	} else if newTx.Type == "expense" {
		// Expense baru. Saldo BERKURANG.
		return updateAccountBalance(ctx, tx, newTx.AccountID, -newTx.Amount)
	} else if newTx.Type == "transfer" {
		// Transfer baru. Kurangi dari ASAL.
		if err := updateAccountBalance(ctx, tx, newTx.AccountID, -newTx.Amount); err != nil {
			return err
		}
		// Tambah ke TUJUAN.
		return updateAccountBalance(ctx, tx, *newTx.DestinationAccountID, newTx.Amount)
	}
	return nil
}
func (s *Store) CreateUser(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (name, email, password_hash) 
		VALUES ($1, $2, $3) 
		RETURNING id, created_at`

	err := s.Pool.QueryRow(ctx, query, user.Name, user.Email, user.PasswordHash).Scan(
		&user.ID,
		&user.CreatedAt,
	)

	return err
}

// GetUserByEmail mencari pengguna berdasarkan email
func (s *Store) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	query := "SELECT id, email, password_hash, created_at FROM users WHERE email = $1"

	err := s.Pool.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &user, nil
}
func updateAccountBalance(ctx context.Context, tx pgx.Tx, accountID int64, amountChange int64) error {
	query := `
		UPDATE accounts 
		SET current_balance = current_balance + $1 
		WHERE id = $2`

	ct, err := tx.Exec(ctx, query, amountChange, accountID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("account not found, balance not updated")
	}
	return nil
}

func (s *Store) CreateCategory(ctx context.Context, cat *models.Category) error {
	query := `INSERT INTO categories (name) VALUES ($1) RETURNING id, created_at`

	err := s.Pool.QueryRow(
		ctx,
		query,
		cat.Name,
	).Scan(&cat.ID, &cat.CreatedAt)

	return err
}

func (s *Store) GetCategories(ctx context.Context) ([]models.Category, error) {
	query := `SELECT id, name, created_at FROM categories ORDER BY name ASC`

	rows, err := s.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	categories := make([]models.Category, 0)

	for rows.Next() {
		var cat models.Category
		if err := rows.Scan(
			&cat.ID,
			&cat.Name,
			&cat.CreatedAt,
		); err != nil {
			return nil, err
		}
		categories = append(categories, cat)
	}

	return categories, nil
}
func (s *Store) GetSummary(ctx context.Context, startDate, endDate time.Time, accountID int64) (models.Summary, error) {
	var summary models.Summary

	// --- Query untuk Income & Expense (dengan filter akun) ---
	queryIncomeExpense := `
		SELECT 
			COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
			COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
		FROM transactions
		WHERE date >= $1 AND date <= $2
	`
	args := []interface{}{startDate, endDate}

	// Tambahkan filter account_id JIKA disediakan
	if accountID > 0 {
		queryIncomeExpense += " AND account_id = $3"
		args = append(args, accountID)
	}

	err := s.Pool.QueryRow(ctx, queryIncomeExpense, args...).Scan(
		&summary.TotalIncome,
		&summary.TotalExpense,
	)
	if err != nil {
		return summary, err
	}

	// --- Query untuk Saldo Bersih (CARA BARU) ---
	// Saldo bersih adalah TOTAL saldo dari SEMUA akun,
	// atau saldo dari SATU akun jika difilter.
	queryBalance := `SELECT COALESCE(SUM(current_balance), 0) FROM accounts`
	balanceArgs := []interface{}{}

	if accountID > 0 {
		queryBalance += " WHERE id = $1"
		balanceArgs = append(balanceArgs, accountID)
	}

	err = s.Pool.QueryRow(ctx, queryBalance, balanceArgs...).Scan(&summary.NetBalance)
	if err != nil {
		return summary, err
	}

	return summary, nil
}

func (s *Store) CreateTransaction(ctx context.Context, txData *models.Transaction) error {
	// 1. Mulai Transaksi
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	// Pastikan di-rollback jika ada error
	defer tx.Rollback(ctx)

	// 2. Masukkan Transaksi
	query := `
		INSERT INTO transactions (amount, type, category, description, date, account_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at`

	// Pastikan amount SELALU positif
	if txData.Amount < 0 {
		txData.Amount = -txData.Amount
	}

	err = tx.QueryRow(ctx, query,
		txData.Amount,
		txData.Type,
		txData.Category,
		txData.Description,
		txData.Date,
		txData.AccountID,
	).Scan(&txData.ID, &txData.CreatedAt)

	if err != nil {
		return err
	}

	// 3. Tentukan Perubahan Saldo
	var balanceChange int64
	if txData.Type == "income" {
		balanceChange = txData.Amount
	} else if txData.Type == "expense" {
		balanceChange = -txData.Amount
	} else {
		return errors.New("invalid transaction type for create")
	}

	// 4. Update Saldo Akun (menggunakan helper)
	if err := updateAccountBalance(ctx, tx, txData.AccountID, balanceChange); err != nil {
		return err // Rollback akan otomatis dipanggil
	}

	// 5. Commit Transaksi
	return tx.Commit(ctx)
}

func (s *Store) GetTransactions(ctx context.Context, page int, limit int) (*models.PaginatedTransactionsResponse, error) {

	// --- Langkah 1: Dapatkan Total Item (COUNT) ---
	var totalItems int64
	countQuery := "SELECT COUNT(*) FROM transactions"
	err := s.Pool.QueryRow(ctx, countQuery).Scan(&totalItems)
	if err != nil {
		return nil, err
	}

	// --- Langkah 2: Hitung Paginasi ---
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 25 // Default limit
	}

	totalPages := int(math.Ceil(float64(totalItems) / float64(limit)))
	offset := (page - 1) * limit

	// --- Langkah 3: Ambil Data Halaman Ini (LIMIT/OFFSET) ---
	query := `
		SELECT id, amount, type, category, description, date, 
		       created_at, account_id, destination_account_id 
		FROM transactions 
		ORDER BY date DESC
		LIMIT $1 OFFSET $2`

	rows, err := s.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	transactions := make([]models.Transaction, 0)
	for rows.Next() {
		var tx models.Transaction
		err := rows.Scan(
			&tx.ID, &tx.Amount, &tx.Type, &tx.Category, &tx.Description,
			&tx.Date, &tx.CreatedAt, &tx.AccountID, &tx.DestinationAccountID,
		)
		if err != nil {
			return nil, err
		}
		transactions = append(transactions, tx)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// --- Langkah 4: Bangun Struct Respons ---
	response := &models.PaginatedTransactionsResponse{
		Data:       transactions,
		Page:       page,
		Limit:      limit,
		TotalItems: totalItems,
		TotalPages: totalPages,
	}

	return response, nil
}

func (s *Store) GetCategorySummary(ctx context.Context, startDate, endDate time.Time, accountID int64) ([]models.CategorySummary, error) {
	query := `
		SELECT 
			category, 
			SUM(amount) AS total_amount
		FROM transactions
		WHERE 
			type = 'expense'
			AND date >= $1
			AND date <= $2
	`
	args := []interface{}{startDate, endDate}

	// Tambahkan filter account_id JIKA disediakan
	if accountID > 0 {
		query += " AND account_id = $3"
		args = append(args, accountID)
	}

	query += " GROUP BY category ORDER BY total_amount DESC"

	rows, err := s.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	summaries := make([]models.CategorySummary, 0)
	for rows.Next() {
		var cs models.CategorySummary
		if err := rows.Scan(&cs.Category, &cs.TotalAmount); err != nil {
			return nil, err
		}
		summaries = append(summaries, cs)
	}

	return summaries, nil
}

func (s *Store) DeleteTransaction(ctx context.Context, id int64) error {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Ambil data transaksi lama SEBELUM dihapus
	var oldTx models.Transaction
	queryGet := `
		SELECT amount, type, account_id, destination_account_id 
		FROM transactions WHERE id = $1`

	err = tx.QueryRow(ctx, queryGet, id).Scan(
		&oldTx.Amount,
		&oldTx.Type,
		&oldTx.AccountID,
		&oldTx.DestinationAccountID,
	)
	if err != nil {
		return errors.New("transaction not found")
	}

	// 2. Hapus transaksi
	if _, err := tx.Exec(ctx, `DELETE FROM transactions WHERE id = $1`, id); err != nil {
		return err
	}

	// 3. Tentukan cara mengembalikan saldo
	if oldTx.Type == "income" {
		// Dulu income, sekarang hapus. Saldo BERKURANG.
		if err := updateAccountBalance(ctx, tx, oldTx.AccountID, -oldTx.Amount); err != nil {
			return err
		}
	} else if oldTx.Type == "expense" {
		// Dulu expense, sekarang hapus. Saldo BERTAMBAH.
		if err := updateAccountBalance(ctx, tx, oldTx.AccountID, oldTx.Amount); err != nil {
			return err
		}
	} else if oldTx.Type == "transfer" {
		// Dulu transfer. Kembalikan uang ke akun ASAL.
		if err := updateAccountBalance(ctx, tx, oldTx.AccountID, oldTx.Amount); err != nil {
			return err
		}
		// Ambil uang dari akun TUJUAN.
		if err := updateAccountBalance(ctx, tx, *oldTx.DestinationAccountID, -oldTx.Amount); err != nil {
			return err
		}
	}

	// 4. Commit
	return tx.Commit(ctx)
}

func (s *Store) GetTransactionByID(ctx context.Context, id int64) (models.Transaction, error) {
	query := `
		SELECT id, amount, type, category, description, date, created_at
		FROM transactions
		WHERE id = $1`

	var tx models.Transaction

	err := s.Pool.QueryRow(ctx, query, id).Scan(
		&tx.ID,
		&tx.Amount,
		&tx.Type,
		&tx.Category,
		&tx.Description,
		&tx.Date,
		&tx.CreatedAt,
	)

	return tx, err // Jika tidak ada, 'err' akan otomatis 'no rows in result set'
}

func (s *Store) UpdateTransaction(ctx context.Context, newTxData *models.Transaction) error {
	// Pastikan amount selalu positif
	if newTxData.Amount < 0 {
		newTxData.Amount = -newTxData.Amount
	}

	// 1. Mulai Transaksi Database
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 2. Ambil data transaksi LAMA (di dalam tx)
	oldTx, err := getTransactionByID_withinTX(ctx, tx, newTxData.ID)
	if err != nil {
		return errors.New("transaction not found")
	}

	// 3. Batalkan/Revert efek saldo dari transaksi LAMA
	if err := revertTransactionBalance(ctx, tx, oldTx); err != nil {
		return fmt.Errorf("failed to revert old balance: %w", err)
	}

	// 4. Update data di tabel transactions dengan data BARU
	// (Kita asumsikan 'transfer' tidak bisa diubah jadi 'income/expense' atau sebaliknya)
	queryUpdate := `
		UPDATE transactions
		SET amount = $1, type = $2, category = $3, description = $4, date = $5, 
		    account_id = $6, destination_account_id = $7
		WHERE id = $8
	`
	_, err = tx.Exec(ctx, queryUpdate,
		newTxData.Amount,
		newTxData.Type,
		newTxData.Category,
		newTxData.Description,
		newTxData.Date,
		newTxData.AccountID,
		newTxData.DestinationAccountID,
		newTxData.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update transaction row: %w", err)
	}

	// 5. Terapkan/Apply efek saldo dari data BARU
	// (Kita gunakan data dari newTxData karena sudah ter-update)
	if err := applyTransactionBalance(ctx, tx, *newTxData); err != nil {
		return fmt.Errorf("failed to apply new balance: %w", err)
	}

	// 6. Commit
	return tx.Commit(ctx)
}

func (s *Store) SetBudget(ctx context.Context, budget *models.Budget) error {
	query := `
		INSERT INTO budgets (category_name, month, year, amount)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (category_name, month, year)
		DO UPDATE SET amount = $4
		RETURNING id, created_at
	`

	err := s.Pool.QueryRow(ctx, query,
		budget.CategoryName,
		budget.Month,
		budget.Year,
		budget.Amount,
	).Scan(&budget.ID, &budget.CreatedAt)

	return err
}

// GetBudgets mengambil semua data budget untuk bulan & tahun tertentu
func (s *Store) GetBudgets(ctx context.Context, month int, year int) ([]models.Budget, error) {
	query := `
		SELECT id, category_name, amount, month, year, created_at
		FROM budgets
		WHERE month = $1 AND year = $2
	`

	rows, err := s.Pool.Query(ctx, query, month, year)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	budgets := make([]models.Budget, 0)
	for rows.Next() {
		var b models.Budget
		if err := rows.Scan(&b.ID, &b.CategoryName, &b.Amount, &b.Month, &b.Year, &b.CreatedAt); err != nil {
			return nil, err
		}
		budgets = append(budgets, b)
	}

	return budgets, nil
}

func (s *Store) CreateRecurringTransaction(ctx context.Context, rt *models.RecurringTransaction) error {
	query := `
		INSERT INTO recurring_transactions 
			(amount, type, category, description, frequency, "interval", start_date, next_due_date)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at`

	// 'next_due_date' saat pertama kali dibuat adalah sama dengan 'start_date'
	err := s.Pool.QueryRow(ctx, query,
		rt.Amount, rt.Type, rt.Category, rt.Description,
		rt.Frequency, rt.Interval, rt.StartDate, rt.StartDate,
	).Scan(&rt.ID, &rt.CreatedAt)
	rt.NextDueDate = rt.StartDate // Pastikan struct-nya update
	return err
}

// GetRecurringTransactions mengambil semua jadwal
func (s *Store) GetRecurringTransactions(ctx context.Context) ([]models.RecurringTransaction, error) {
	query := `SELECT * FROM recurring_transactions ORDER BY next_due_date ASC`

	rows, err := s.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	transactions := make([]models.RecurringTransaction, 0)
	for rows.Next() {
		var rt models.RecurringTransaction
		// Hati-hati: urutan scan harus sama dengan kolom tabel
		err := rows.Scan(
			&rt.ID, &rt.Amount, &rt.Type, &rt.Category, &rt.Description,
			&rt.Frequency, &rt.Interval, &rt.StartDate, &rt.NextDueDate, &rt.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		transactions = append(transactions, rt)
	}
	return transactions, nil
}

// DeleteRecurringTransaction menghapus jadwal
func (s *Store) DeleteRecurringTransaction(ctx context.Context, id int64) error {
	_, err := s.Pool.Exec(ctx, `DELETE FROM recurring_transactions WHERE id = $1`, id)
	return err
}

// === FUNGSI WORKER (INTI FITUR) ===

// ProcessRecurringTransactions adalah fungsi yang akan dijalankan oleh Cron Job
func (s *Store) ProcessRecurringTransactions(ctx context.Context) (int, error) {
	// 1. Ambil semua jadwal yang sudah jatuh tempo (kemarin, hari ini)
	query := `SELECT * FROM recurring_transactions WHERE next_due_date <= NOW()`

	rows, err := s.Pool.Query(ctx, query)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	processedCount := 0

	// 2. Mulai transaksi database
	// Kita ingin semua proses ini berhasil, atau tidak sama sekali
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	// Pastikan di-rollback jika ada error
	defer tx.Rollback(ctx)

	for rows.Next() {
		var rt models.RecurringTransaction
		// ... (scan data rt) ...
		err := rows.Scan(
			&rt.ID, &rt.Amount, &rt.Type, &rt.Category, &rt.Description,
			&rt.Frequency, &rt.Interval, &rt.StartDate, &rt.NextDueDate, &rt.CreatedAt,
		)
		if err != nil {
			return 0, err
		}

		// 3. MASUKKAN ke tabel 'transactions' utama
		insertQuery := `
			INSERT INTO transactions (amount, type, category, description, date)
			VALUES ($1, $2, $3, $4, $5)`
		// Kita masukkan dengan 'date' = tanggal jatuh tempo
		_, err = tx.Exec(ctx, insertQuery, rt.Amount, rt.Type, rt.Category, rt.Description, rt.NextDueDate)
		if err != nil {
			return 0, err
		}

		// 4. Hitung TANGGAL JATUH TEMPO BERIKUTNYA
		var nextDueDate time.Time
		switch rt.Frequency {
		case "daily":
			nextDueDate = rt.NextDueDate.AddDate(0, 0, rt.Interval)
		case "weekly":
			nextDueDate = rt.NextDueDate.AddDate(0, 0, 7*rt.Interval)
		case "monthly":
			nextDueDate = rt.NextDueDate.AddDate(0, rt.Interval, 0)
		case "yearly":
			nextDueDate = rt.NextDueDate.AddDate(rt.Interval, 0, 0)
		}

		// 5. UPDATE jadwal 'recurring' dengan tanggal jatuh tempo baru
		updateQuery := `UPDATE recurring_transactions SET next_due_date = $1 WHERE id = $2`
		_, err = tx.Exec(ctx, updateQuery, nextDueDate, rt.ID)
		if err != nil {
			return 0, err
		}

		processedCount++
	}

	// 6. Jika semua berhasil, commit transaksi
	return processedCount, tx.Commit(ctx)
}

func (s *Store) CreateAccount(ctx context.Context, acc *models.Account) error {
	query := `
		INSERT INTO accounts (name, type, current_balance) 
		VALUES ($1, $2, $3)
		RETURNING id, created_at`

	return s.Pool.QueryRow(ctx, query,
		acc.Name,
		acc.Type,
		acc.CurrentBalance, // Saldo awal
	).Scan(&acc.ID, &acc.CreatedAt)
}

// GetAccounts mengambil semua akun
func (s *Store) GetAccounts(ctx context.Context) ([]models.Account, error) {
	query := `SELECT id, name, type, current_balance, created_at FROM accounts ORDER BY name`

	rows, err := s.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	accounts := make([]models.Account, 0)
	for rows.Next() {
		var acc models.Account
		if err := rows.Scan(&acc.ID, &acc.Name, &acc.Type, &acc.CurrentBalance, &acc.CreatedAt); err != nil {
			return nil, err
		}
		accounts = append(accounts, acc)
	}
	return accounts, nil
}

func (s *Store) CreateTransfer(ctx context.Context, txData *models.Transaction) error {
	// 1. Validasi data (seharusnya sudah divalidasi di handler, tapi baik untuk double check)
	if txData.Type != "transfer" || txData.DestinationAccountID == nil || *txData.DestinationAccountID == 0 {
		return errors.New("invalid data for transfer")
	}
	if txData.AccountID == *txData.DestinationAccountID {
		return errors.New("source and destination accounts cannot be the same")
	}
	if txData.Amount <= 0 {
		return errors.New("transfer amount must be positive")
	}

	// 2. Mulai Transaksi Database
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) // Pastikan di-rollback jika ada error

	// 3. Masukkan data ke tabel 'transactions'
	queryInsert := `
		INSERT INTO transactions 
			(amount, type, category, description, date, account_id, destination_account_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at`

	err = tx.QueryRow(ctx, queryInsert,
		txData.Amount,
		"transfer",
		"Transfer", // Set kategori default
		txData.Description,
		txData.Date,
		txData.AccountID,
		*txData.DestinationAccountID, // Dereference pointer
	).Scan(&txData.ID, &txData.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to insert transfer record: %w", err)
	}

	// 4. Update Akun Asal (Mengurangi Saldo)
	// Kita gunakan helper 'updateAccountBalance' yang sudah kita buat
	if err := updateAccountBalance(ctx, tx, txData.AccountID, -txData.Amount); err != nil {
		return fmt.Errorf("failed to update source account: %w", err)
	}

	// 5. Update Akun Tujuan (Menambah Saldo)
	if err := updateAccountBalance(ctx, tx, *txData.DestinationAccountID, txData.Amount); err != nil {
		return fmt.Errorf("failed to update destination account: %w", err)
	}

	// 6. Jika semua berhasil, commit
	return tx.Commit(ctx)
}

func (s *Store) GetTransactionsForExport(ctx context.Context) ([]models.TransactionExport, error) {
	query := `
		SELECT 
			t.id, t.amount, t.type, t.category, t.description, t.date, 
			t.created_at, t.account_id, t.destination_account_id,
			a_src.name AS account_name,
			a_dest.name AS destination_account_name
		FROM transactions t
		LEFT JOIN accounts a_src ON t.account_id = a_src.id
		LEFT JOIN accounts a_dest ON t.destination_account_id = a_dest.id
		ORDER BY t.date DESC
	`

	rows, err := s.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	transactions := make([]models.TransactionExport, 0)
	for rows.Next() {
		var tx models.TransactionExport
		err := rows.Scan(
			&tx.ID, &tx.Amount, &tx.Type, &tx.Category, &tx.Description,
			&tx.Date, &tx.CreatedAt, &tx.AccountID, &tx.DestinationAccountID,
			&tx.AccountName, &tx.DestinationAccountName,
		)
		if err != nil {
			return nil, err
		}
		transactions = append(transactions, tx)
	}

	return transactions, rows.Err()
}
