// src/pages/AccountsPage.jsx

import React, { useState } from 'react'; // Hapus useEffect, useCallback
import apiClient from '../api';
import toast from 'react-hot-toast';
import { useAccounts } from '../context/AccountsContext'; // <-- 1. IMPORT HOOK

// Helper class
const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount / 100);

// --- Form untuk Akun Baru ---
// 'onSuccess' di sini adalah 'fetchAccounts' dari context
const AddAccountForm = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('bank');
  const [initialBalance, setInitialBalance] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Konversi ke 'sen'
    const balanceInCents = Math.round(parseFloat(initialBalance) * 100);
    
    const promise = apiClient.post('/accounts', {
      name: name,
      type: type,
      current_balance: balanceInCents,
    });

    toast.promise(promise, {
      loading: 'Menyimpan akun...',
      success: () => {
        onSuccess(); // Refresh daftar (memanggil fetchAccounts)
        // Reset form
        setName('');
        setInitialBalance(0);
        setType('bank');
        return 'Akun berhasil dibuat!';
      },
      error: 'Gagal membuat akun.',
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-semibold text-gray-700 mb-4">Buat Akun Baru</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="accName" className={labelClass}>Nama Akun</label>
          <input 
            id="accName" 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className={inputClass} 
            placeholder="Contoh: Bank BCA" 
            required 
          />
        </div>
        <div>
          <label htmlFor="accType" className={labelClass}>Tipe Akun</label>
          <select id="accType" value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
            <option value="bank">Bank</option>
            <option value="cash">Dompet Tunai</option>
            <option value="e-wallet">E-Wallet</option>
            <option value="credit">Kartu Kredit</option>
            <option value="other">Lainnya</option>
          </select>
        </div>
        <div>
          <label htmlFor="accBalance" className={labelClass}>Saldo Awal (Rp)</label>
          <input 
            id="accBalance" 
            type="number" 
            step="0.01" 
            value={initialBalance} 
            onChange={(e) => setInitialBalance(e.target.value)} 
            className={inputClass} 
          />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 shadow-md">
          Simpan Akun
        </button>
      </form>
    </div>
  );
};

// --- Halaman Utama Akun ---
const AccountsPage = () => {
  // Ambil state dari context
  const { accounts, fetchAccounts, loadingAccounts } = useAccounts();

  // Tidak perlu useEffect atau useCallback lokal lagi

  if (loadingAccounts) return <p className="text-center">Loading...</p>;

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Kelola Akun</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kolom Form */}
        <div className="lg:col-span-1">
          {/* Kirim 'fetchAccounts' dari context sebagai prop 'onSuccess' */}
          <AddAccountForm onSuccess={fetchAccounts} />
        </div>
        
        {/* Kolom Daftar Akun */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Daftar Akun Anda</h3>
          <div className="space-y-4">
            {/* Gunakan 'accounts' dari context */}
            {accounts.length === 0 ? <p className="text-gray-500">Belum ada akun.</p> : null}
            {accounts.map(acc => (
              <div key={acc.id} className="p-4 border rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg text-gray-800">{acc.name}</p>
                  <p className="text-sm text-gray-500 capitalize">{acc.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-blue-700">{formatCurrency(acc.current_balance)}</p>
                  <p className="text-xs text-gray-400">Saldo Saat Ini</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountsPage;