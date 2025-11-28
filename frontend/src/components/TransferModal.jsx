// src/components/TransferModal.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import toast from 'react-hot-toast';
import { useAccounts } from '../context/AccountsContext';

// Helper class
const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

// Modal menerima 2 props:
// isOpen: boolean (apakah modal tampil)
// onClose: Fungsi untuk menutup modal
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
const TransferModal = ({ isOpen, onClose }) => {
  const { accounts, fetchAccounts } = useAccounts();
  
  const [fromAccountID, setFromAccountID] = useState('');
  const [toAccountID, setToAccountID] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Transfer');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Set default akun saat komponen dimuat
  useEffect(() => {
    if (accounts.length > 0) {
      setFromAccountID(accounts[0].id);
    }
    if (accounts.length > 1) {
      setToAccountID(accounts[1].id);
    }
  }, [accounts]);
    const handleAmountChange = (e) => {
    // Ambil nilai dari input (misal: "5000000" atau "5.000.0a")
    const value = e.target.value;
    // Format nilai tersebut (misal: "5.000.000")
    const formattedValue = formatRupiah(value);
    // Simpan string yang terformat ke state
    setAmount(formattedValue);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const rupiahValue = parseRupiah(amount);
    if (!fromAccountID || !toAccountID || !amount) {
      toast.error('Harap isi semua field.');
      return;
    }
    if (fromAccountID === toAccountID) {
      toast.error('Akun asal dan tujuan tidak boleh sama.');
      return;
    }

    const amountInCents = Math.round(rupiahValue * 100);
    

    const transferData = {
      amount: amountInCents, // ke 'sen'
      description: description,
      date: new Date(date).toISOString(),
      account_id: parseInt(fromAccountID, 10), // (from_account_id)
      destination_account_id: parseInt(toAccountID, 10), // (to_account_id)
      type: 'transfer', // Tipe-nya 'transfer'
    };
    
    // Panggil API transfer baru
    const promise = apiClient.post('/transfers', transferData);

    toast.promise(promise, {
      loading: 'Memproses transfer...',
      success: () => {
        fetchAccounts(); // <-- REFRESH SALDO AKUN
        onClose();       // Tutup modal
        // Reset form
        setAmount('');
        setDescription('Transfer');
        return 'Transfer berhasil dicatat!';
      },
      error: 'Gagal mencatat transfer.',
    });
  };

  // Jangan tampilkan apa-apa jika !isOpen
  if (!isOpen) {
    return null;
  }

  return (
    // Overlay gelap
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={onClose}
    >
      {/* Box Modal */}
      <div 
        className="bg-white p-6 md:p-8 rounded-xl shadow-lg w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Buat Transfer</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fromAccount" className={labelClass}>Dari Akun</label>
            <select id="fromAccount" value={fromAccountID} onChange={(e) => setFromAccountID(e.target.value)} className={inputClass} required>
              <option value="" disabled>Pilih Akun Asal...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.current_balance)})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="toAccount" className={labelClass}>Ke Akun</label>
            <select id="toAccount" value={toAccountID} onChange={(e) => setToAccountID(e.target.value)} className={inputClass} required>
              <option value="" disabled>Pilih Akun Tujuan...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.current_balance)})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="amount" className={labelClass}>Jumlah (Rp)</label>
            <input id="amount" type="text" inputMode="numeric" value={amount} onChange={handleAmountChange} className={inputClass} placeholder='0' required></input>
          </div>
          
          <div>
            <label htmlFor="date" className={labelClass}>Tanggal</label>
            <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} required />
          </div>
          
          <div>
            <label htmlFor="description" className={labelClass}>Deskripsi</label>
            <input id="description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Batal
            </button>
            <button 
              type="submit"
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 shadow-md transition-colors"
            >
              Simpan Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferModal;