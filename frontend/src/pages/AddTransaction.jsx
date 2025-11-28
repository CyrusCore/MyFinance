// src/pages/AddTransaction.jsx

import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; 
import { useAccounts } from '../context/AccountsContext'; // Import hook context

// Helper class
const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(amount / 100); // Dibagi 100 untuk mengubah sen ke Rupiah
};
const formatRupiah = (value) => {
  // Helper untuk memformat angka (misal: 5000) menjadi string (misal: "5.000")
  if (!value) return '';
  // Hapus semua selain angka
  const cleanValue = value.toString().replace(/\D/g, '');
  if (!cleanValue) return '';
  // Format ke 'id-ID' (yang menggunakan titik)
  return new Intl.NumberFormat('id-ID').format(cleanValue);
};

const parseRupiah = (formattedValue) => {
  // Helper untuk mengubah string (misal: "5.000.000") menjadi angka (misal: 5000000)
  if (!formattedValue) return 0;
  // Hapus semua titik
  return parseInt(formattedValue.replace(/\./g, ''), 10) || 0;
};

const AddTransaction = () => {
  // State untuk data
  const [categories, setCategories] = useState([]);
  const { accounts, loadingAccounts } = useAccounts(); // State akun dari context
  
  // State untuk loading
  const [loadingCategories, setLoadingCategories] = useState(true);
  const { refreshAccounts } = useAccounts();

  // State untuk form
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountID, setAccountID] = useState(''); // Dimulai dari string kosong

  const navigate = useNavigate();

  // 1. Ambil daftar kategori saat komponen dimuat
  useEffect(() => {
    setLoadingCategories(true); // Mulai loading
    apiClient.get('/categories')
      .then(catRes => {
        setCategories(catRes.data);
        if (catRes.data.length > 0) {
          setCategory(catRes.data[0].name); // Set kategori default
        }
      })
      .catch(err => toast.error('Gagal memuat kategori.'))
      .finally(() => setLoadingCategories(false)); // Selesai loading
  }, []); // Hanya jalan sekali

  // 2. Efek untuk memantau data akun dari context
  useEffect(() => {
    // Jalankan hanya jika loading akun selesai
    if (!loadingAccounts) {
      if (accounts.length > 0) {
        // Set akun default HANYA jika belum ada yang dipilih
        if (accountID === '') {
          setAccountID(accounts[0].id); 
        }
      } else {
        // Jika tidak ada akun, paksa pengguna membuatnya
        toast.error('Anda harus membuat Akun terlebih dahulu!', { duration: 4000 });
        navigate('/accounts');
      }
    }
  }, [accounts, loadingAccounts, accountID, navigate]);
  
  // 3. Tentukan status loading gabungan
  const isDataLoading = loadingCategories || loadingAccounts;

  const handleAmountChange = (e) => {
    // Ambil nilai dari input (misal: "5000000" atau "5.000.0a")
    const value = e.target.value;
    // Format nilai tersebut (misal: "5.000.000")
    const formattedValue = formatRupiah(value);
    // Simpan string yang terformat ke state
    setAmount(formattedValue);
  };

  // 4. Handle submit form
  const handleSubmit = (e) => {
    e.preventDefault();
    const rupiahValue = parseRupiah(amount);
    // Validasi
    if (parseFloat(amount) <= 0 || amount === '') {
      toast.error('Jumlah harus lebih besar dari 0');
      return;
    }
    if (accountID === '' || accountID === null) {
      toast.error('Anda harus memilih akun.');
      return;
    }

    const amountInCents = Math.round(rupiahValue * 100);

    const transactionData = {
      amount: amountInCents, // <-- Kirim jumlah 'sen'
      type: type,
      category: type === 'income' ? 'Income' : category, 
      description: description,
      date: new Date(date).toISOString(),
      account_id: parseInt(accountID, 10), 
    };
    
    const promise = apiClient.post('/transactions', transactionData);
    
    toast.promise(promise, {
      loading: 'Menyimpan transaksi...',
      success: () => {
        navigate('/');
        refreshAccounts(); 
        return 'Transaksi berhasil disimpan!';
      },
      error: (err) => `Gagal menyimpan: ${err.response?.data?.error || err.message}`,
    });
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">
        Tambah Transaksi Baru
      </h2>
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* --- Field Akun --- */}
            <div>
              <label htmlFor="account" className={labelClass}>Akun</label>
              <select 
                id="account"
                value={accountID} 
                onChange={(e) => setAccountID(e.target.value)}
                className={inputClass}
                required
                disabled={isDataLoading} // <-- NONAKTIFKAN SAAT LOADING
              >
                <option value="" disabled>
                  {isDataLoading ? "Memuat akun..." : "Pilih Akun..."}
                </option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.current_balance)})
                  </option>
                ))}
              </select>
            </div>

            {/* --- Field Tipe --- */}
            <div>
              <label htmlFor="type" className={labelClass}>Tipe Transaksi</label>
              <select 
                id="type" 
                value={type} 
                onChange={(e) => setType(e.target.value)} 
                className={inputClass}
                disabled={isDataLoading}
              >
                <option value="expense">Pengeluaran</option>
                <option value="income">Pemasukan</option>
              </select>
            </div>
            
            {/* --- Field Jumlah --- */}
            <div>
              <label htmlFor="amount" className={labelClass}>Jumlah (Rp)</label>
              <input 
                id="amount" 
                type="text" // <-- Ganti ke "text"
                inputMode="numeric" // <-- (Opsional: keyboard HP jadi angka)
                value={amount} 
                onChange={handleAmountChange} // <-- Panggil fungsi format
                className={inputClass} 
                placeholder="0" 
                required 
                disabled={isDataLoading}
              />
            </div>

            {/* --- Field Tanggal --- */}
            <div>
              <label htmlFor="date" className={labelClass}>Tanggal</label>
              <input 
                id="date" 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className={inputClass} 
                required 
                disabled={isDataLoading}
              />
            </div>

            {/* --- Field Kategori --- */}
            <div>
              <label htmlFor="category" className={labelClass}>Kategori</label>
              <select 
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
                disabled={type === 'income' || isDataLoading} // <-- NONAKTIFKAN SAAT LOADING
                required
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* --- Field Deskripsi --- */}
            <div>
              <label htmlFor="description" className={labelClass}>Deskripsi (Opsional)</label>
              <input 
                id="description"
                type="text" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
                placeholder="Makan siang"
                disabled={isDataLoading}
              />
            </div>

            {/* --- Tombol Simpan --- */}
            <div className="md:col-span-2">
              <button 
                type="submit" 
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 shadow-md transition-colors
                           disabled:bg-gray-400 disabled:cursor-not-allowed" // Style saat nonaktif
                disabled={isDataLoading} // <-- NONAKTIFKAN SAAT LOADING
              >
                {isDataLoading ? "Memuat data..." : "Simpan Transaksi"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransaction;