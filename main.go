package main

import (
	"context"
	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"
	"github.com/rs/cors"
	"log"
	"net/http"
	"os"

	"github.com/bramszs/finance-tracker/internal/api"
)

func runCronJob(store *api.Store) {
	log.Println("Running recurring transactions worker...")
	// Gunakan context.Background() untuk proses background
	count, err := store.ProcessRecurringTransactions(context.Background())
	if err != nil {
		log.Printf("Error processing recurring transactions: %v", err)
		return
	}
	log.Printf("Successfully processed %d recurring transactions.", count)
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Request Diterima: %s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

func main() {
	// 1. Load file .env
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: Could not load .env file")
	}
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		log.Fatal("DB_URL is not set")
	}
	jwtSecret := os.Getenv("JWT_SECRET") // <-- BACA SECRET
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET is not set")
	}
	// --- PERBAIKAN DIMULAI DARI SINI ---

	// 1. Parse config dari URL
	config, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		log.Fatalf("Unable to parse database config: %v\n", err)
	}

	// 2. (INI ADALAH PERBAIKANNYA)
	// Nonaktifkan 'prepared statement' otomatis di level pool
	// Ini mencegah error "prepared statement name is already in use"
	config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	// 3. Buat pool koneksi menggunakan config yang sudah diubah
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		log.Fatalf("Unable to connect to database with new config: %v\n", err)
	}
	defer pool.Close()
	// 3. Inisialisasi Store (logika DB)
	store := api.NewStore(pool, jwtSecret)

	cr := cron.New()
	cr.AddFunc("0 1 * * *", func() { runCronJob(store) })
	cr.Start()
	log.Println("Cron job for recurring transactions started. Will run at 1:00 AM.")

	// 4. Setup Router (mux)
	r := mux.NewRouter()

	// Buat sub-router untuk /api
	apiRouter := r.PathPrefix("/api").Subrouter()
	apiRouter.HandleFunc("/transactions", store.HandleGetTransactions).Methods("GET")
	apiRouter.HandleFunc("/transactions", store.CreateTransactionHandler).Methods("POST")

	apiRouter.HandleFunc("/summary", store.GetSummaryHandler).Methods("GET")
	apiRouter.HandleFunc("/categories", store.GetCategoriesHandler).Methods("GET")
	apiRouter.HandleFunc("/categories", store.CreateCategoryHandler).Methods("POST")
	apiRouter.HandleFunc("/summary/categories", store.GetCategorySummaryHandler).Methods("GET")

	apiRouter.HandleFunc("/transactions/{id:[0-9]+}", store.DeleteTransactionHandler).Methods("DELETE")
	apiRouter.HandleFunc("/transactions/{id:[0-9]+}", store.GetTransactionByIDHandler).Methods("GET")
	apiRouter.HandleFunc("/transactions/{id:[0-9]+}", store.UpdateTransactionHandler).Methods("PUT")

	apiRouter.HandleFunc("/budgets", store.HandleGetBudgets).Methods("GET")
	apiRouter.HandleFunc("/budgets", store.HandleSetBudget).Methods("POST")

	apiRouter.HandleFunc("/recurring", store.HandleGetRecurringTransactions).Methods("GET")
	apiRouter.HandleFunc("/recurring", store.HandleCreateRecurringTransaction).Methods("POST")
	apiRouter.HandleFunc("/recurring/{id:[0-9]+}", store.HandleDeleteRecurringTransaction).Methods("DELETE")

	apiRouter.HandleFunc("/accounts", store.HandleGetAccounts).Methods("GET")
	apiRouter.HandleFunc("/accounts", store.HandleCreateAccount).Methods("POST")

	apiRouter.HandleFunc("/transfers", store.HandleCreateTransfer).Methods("POST")

	apiRouter.HandleFunc("/export/csv", store.HandleExportCSV).Methods("GET")

	apiRouter.HandleFunc("/auth/register", store.HandleRegister).Methods("POST")
	apiRouter.HandleFunc("/auth/login", store.HandleLogin).Methods("POST")

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"}, // <-- Alamat frontend React Anda
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization"},
	})
	loggedRouter := loggingMiddleware(r)
	handler := c.Handler(loggedRouter)

	// 5. Jalankan Server
	port := ":8080"
	log.Printf("Starting server on port %s", port)
	if err := http.ListenAndServe(port, handler); err != nil {
		log.Fatalf("Could not start server: %v", err)
	}
}
