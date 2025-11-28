// src/components/EditTransactionModal.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import toast from 'react-hot-toast';
import { useAccounts } from '../context/AccountsContext';

// --- Helper class (salin dari AddTransaction) ---
const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

// Modal menerima 3 props:
// id: ID transaksi yang akan diedit (jika null, modal tidak tampil)
// onClose: Fungsi untuk menutup modal
// onSuccess: Fungsi untuk me-refresh data di halaman Transactions
const EditTransactionModal = ({ id, onClose, onSuccess }) => {
    const { accounts, loadingAccounts } = useAccounts();
    const [categories, setCategories] = useState([]);
    const [type, setType] = useState('expense');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [accountID, setAccountID] = useState('');

  // 1. Ambil data kategori (sekali saja)
    useEffect(() => {
    apiClient.get('/categories')
      .then(response => setCategories(response.data))
      .catch(err => toast.error('Gagal memuat kategori'));
  }, []);

  // 2. Ambil data transaksi SETIAP KALI 'id' berubah
    useEffect(() => {
    if (id) {
      setLoading(true);
      apiClient.get(`/transactions/${id}`) // API GET by ID (pastikan ini ada)
        .then(response => {
          const tx = response.data;
          setType(tx.type);
          setAmount(tx.amount / 100); 
          setCategory(tx.category);
          setDescription(tx.description);
          setDate(tx.date.split('T')[0]);
          setAccountID(tx.account_id); // <-- SET ACCOUNT ID
          setLoading(false);
        })
        .catch(err => {
          toast.error('Gagal mengambil data transaksi');
          setLoading(false);
          onClose();
        });
    }
  }, [id, onClose]);

  // 3. Handle submit form
  const handleSubmit = (e) => {
    e.preventDefault();
    if (parseFloat(amount) <= 0 || amount === '') {
      toast.error('Jumlah (amount) harus lebih besar dari 0');
      return;
    }

    const updatedData = {
      id: id,
      amount: Math.round(parseFloat(amount) * 100), // Ubah ke sen
      type: type,
      category: type === 'income' ? 'Income' : category,
      description: description,
      date: new Date(date).toISOString(),
    };
    
    // Gunakan .put()
const promise = apiClient.put(`/transactions/${id}`, updatedData);

    toast.promise(promise, {
      loading: 'Menyimpan perubahan...',
      success: () => {
        onSuccess(); // Ini akan panggil fetchTransactions & fetchAccounts
        onClose();   // Tutup modal
        return 'Transaksi berhasil diperbarui!';
      },
      error: 'Gagal memperbarui transaksi.',
    });
  };

  // Jangan tampilkan apa-apa jika tidak ada ID
  if (!id) {
    return null;
  }

  return (
    // --- Ini adalah scaffold Modal ---
    // Overlay gelap
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={onClose} // Tutup modal jika klik di luar
    >
      {/* Box Modal */}
      <div 
        className="bg-white p-6 md:p-8 rounded-xl shadow-lg w-full max-w-2xl"
        onClick={e => e.stopPropagation()} // Cegah klik di dalam modal
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Edit Transaksi</h2>
        
        {loading ? <p>Loading data...</p> : (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* --- Form field (sama seperti AddTransaction) --- */}
              <div>
                <label htmlFor="edit-type" className={labelClass}>Tipe Transaksi</label>
                <select id="edit-type" value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                  <option value="expense">Pengeluaran</option>
                  <option value="income">Pemasukan</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-amount" className={labelClass}>Jumlah (Rupiah)</label>
                <input id="edit-amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} required />
              </div>

              <div>
                <label htmlFor="edit-date" className={labelClass}>Tanggal</label>
                <input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} required />
              </div>

              <div>
                <label htmlFor="edit-category" className={labelClass}>Kategori</label>
                <select id="edit-category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} disabled={type === 'income'}>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="edit-description" className={labelClass}>Deskripsi</label>
                <textarea id="edit-description" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
              </div>
              
              {/* --- Tombol Aksi --- */}
              <div className="md:col-span-2 flex justify-end space-x-3">
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
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditTransactionModal;