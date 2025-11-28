// src/pages/Transactions.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../api';
import toast from 'react-hot-toast';
import { MdDelete, MdEdit } from 'react-icons/md';
import EditTransactionModal from '../components/EditTransactionModal';
import { useAccounts } from '../context/AccountsContext'; // Import context

/**
 * Helper Functions
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(amount / 100); // Dibagi 100 untuk 'sen'
};

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};


/**
 * Komponen Utama Halaman Transaksi
 */
const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State untuk modal edit
  const [editingID, setEditingID] = useState(null);
  
  // --- State Paginasi ---
  const [page, setPage] = useState(1); // Halaman saat ini
  const [totalPages, setTotalPages] = useState(1); // Total halaman dari API

  // Ambil data akun dari context
  const { accounts, fetchAccounts } = useAccounts();

  // Buat 'map' (kamus) untuk mencari nama akun dengan cepat
  const accountNameMap = useMemo(() => {
    const map = new Map();
    accounts.forEach(acc => {
      map.set(acc.id, acc.name);
    });
    return map;
  }, [accounts]); // Dibuat ulang hanya jika daftar akun berubah

  // Helper untuk mendapatkan nama akun dari ID
  const getAccountName = (id) => {
    return accountNameMap.get(id) || `Akun #${id}`;
  };

  // --- Fungsi Fetch Data (dengan Pagination) ---
  // Kita bungkus dengan useCallback agar bisa dipanggil ulang
  const fetchTransactions = useCallback(() => {
    setLoading(true);
    // Panggil API dengan parameter 'page'
    apiClient.get(`/transactions?page=${page}&limit=25`)
      .then(response => {
        const res = response.data;
        setTransactions(res.data || []);      // Data ada di dalam 'res.data'
        setTotalPages(res.total_pages || 1);  // Ambil total halaman
        setPage(res.page || 1);               // Sinkronkan halaman saat ini
        setError(null);
      })
      .catch(err => {
        setError('Gagal mengambil data transaksi');
        toast.error('Gagal mengambil data transaksi.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page]); // Dependensi adalah 'page'

  // Panggil fetchTransactions saat 'page' berubah
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]); // fetchTransactions akan berubah saat 'page' berubah

  
  // --- Handle Delete (di-update untuk pagination) ---
  const handleDelete = (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
      return;
    }

    const promise = apiClient.delete(`/transactions/${id}`);

    toast.promise(
      promise,
      {
        loading: 'Menghapus transaksi...',
        success: () => {
          fetchAccounts(); // <-- Refresh saldo akun global
          
          // Cek jika ini item terakhir di halaman, pindah ke halaman sebelumnya
          if (transactions.length === 1 && page > 1) {
            setPage(p => p - 1); // Ini akan memicu useEffect untuk fetch ulang
          } else {
            fetchTransactions(); // Fetch ulang halaman saat ini
          }
          return 'Transaksi berhasil dihapus!';
        },
        error: 'Gagal menghapus transaksi.',
      }
    );
  };

  // Tampilkan loading hanya jika belum ada data sama sekali
  if (loading && transactions.length === 0) return <p className="text-center text-gray-500">Loading transactions...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;

  return (
    <div>
      {/* --- Header Halaman & Tombol Export --- */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">
          Riwayat Transaksi
        </h2>
        
        {/* Tombol Export CSV */}
        <a 
          href="/api/export/csv" 
          download="laporan-transaksi.csv"
          className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 font-semibold"
        >
          Export Semua (CSV)
        </a>
      </div>

      {/* --- Tabel Data --- */}
      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        {transactions.length === 0 && !loading ? (
          <p className="text-center text-gray-500">Belum ada transaksi.</p>
        ) : (
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-sm font-semibold text-gray-600 p-3">Tanggal</th>
                <th className="text-left text-sm font-semibold text-gray-600 p-3">Tipe</th>
                <th className="text-left text-sm font-semibold text-gray-600 p-3">Akun</th>
                <th className="text-left text-sm font-semibold text-gray-600 p-3">Kategori</th>
                <th className="text-left text-sm font-semibold text-gray-600 p-3">Jumlah</th>
                <th className="text-left text-sm font-semibold text-gray-600 p-3">Deskripsi</th>
                <th className="text-left text-sm font-semibold text-gray-600 p-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="p-3 text-sm text-gray-700">{formatDate(tx.date)}</td>
                  
                  {/* Kolom Tipe */}
                  <td className="p-3 text-sm">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      tx.type === 'income' ? 'bg-green-100 text-green-800' :
                      tx.type === 'expense' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  
                  {/* Kolom Akun (dengan Nama) */}
                  <td className="p-3 text-sm text-gray-700">
                    {tx.type === 'transfer'
                      ? `Dari ${getAccountName(tx.account_id)} ke ${getAccountName(tx.destination_account_id)}`
                      : getAccountName(tx.account_id)
                    }
                  </td>

                  {/* Kolom Kategori */}
                  <td className="p-3 text-sm text-gray-700">{tx.category}</td>

                  {/* Kolom Jumlah */}
                  <td className={`p-3 text-sm font-medium ${
                    tx.type === 'income' ? 'text-green-600' :
                    tx.type === 'expense' ? 'text-red-600' :
                    'text-gray-700'
                  }`}>
                    {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                    {formatCurrency(tx.amount)}
                  </td>
                  
                  {/* Kolom Deskripsi */}
                  <td className="p-3 text-sm text-gray-500">{tx.description}</td>
                  
                  {/* Kolom Aksi */}
                  <td className="p-3 text-sm">
                    {/* Sembunyikan tombol Edit jika tipe-nya 'transfer' */}
                    {tx.type !== 'transfer' && (
                      <button 
                        onClick={() => setEditingID(tx.id)}
                        className="text-blue-500 hover:text-blue-700 transition-colors mr-2"
                        title="Edit"
                      >
                        <MdEdit size={20} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(tx.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      title="Hapus"
                    >
                      <MdDelete size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- Kontrol Paginasi --- */}
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={() => setPage(p => p - 1)}
          disabled={page <= 1 || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
        >
          Sebelumnya
        </button>
        
        <span className="text-gray-700 font-medium">
          Halaman {page} dari {totalPages}
        </span>
        
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={page >= totalPages || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
        >
          Berikutnya
        </button>
      </div>

      {/* --- Modal Edit --- */}
      <EditTransactionModal 
        id={editingID}
        onClose={() => setEditingID(null)}
        onSuccess={() => {
          fetchTransactions(); // <-- Refresh list di halaman saat ini
          fetchAccounts();   // <-- Refresh saldo global
        }}
      />
    </div>
  );
};

export default Transactions;