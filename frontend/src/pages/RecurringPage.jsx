
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api';
import toast from 'react-hot-toast';
import { MdDelete } from 'react-icons/md';


const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount / 100);
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });


const AddRecurringForm = ({ categories, onSuccess }) => {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || '');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [interval, setInterval] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      amount: Math.round(parseFloat(amount) * 100),
      type: type,
      category: type === 'income' ? 'Income' : category,
      description: description,
      frequency: frequency,
      interval: parseInt(interval, 10),
      start_date: new Date(startDate).toISOString(),
    };

    const promise = apiClient.post('/recurring', data);
    toast.promise(promise, {
      loading: 'Menyimpan jadwal...',
      success: () => {
        onSuccess(); // Refresh daftar
        // Reset form
        setAmount('');
        setDescription('');
        return 'Jadwal berhasil disimpan!';
      },
      error: 'Gagal menyimpan jadwal.',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Tambah Transaksi Berulang</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div>
          <label className={labelClass}>Tipe</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Jumlah (Rp)</label>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Kategori</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} disabled={type === 'income'}>
            {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Deskripsi</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} placeholder="Contoh: Tagihan Listrik" />
        </div>


        <div>
          <label className={labelClass}>Frekuensi</label>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={inputClass}>
            <option value="daily">Harian</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
            <option value="yearly">Tahunan</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Setiap (Interval)</label>
          <input type="number" min="1" value={interval} onChange={(e) => setInterval(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Tanggal Mulai</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} required />
        </div>

        <div className="md:col-span-2">
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 shadow-md">
            Simpan Jadwal
          </button>
        </div>
      </form>
    </div>
  );
};



const RecurringPage = () => {
  const [categories, setCategories] = useState([]);
  const [recurringTxs, setRecurringTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    const catPromise = apiClient.get('/categories');
    const recurringPromise = apiClient.get('/recurring');

    Promise.all([catPromise, recurringPromise])
      .then(([catRes, recurringRes]) => {
        setCategories(catRes.data);
        setRecurringTxs(recurringRes.data);
      })
      .catch(() => toast.error('Gagal memuat data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = (id) => {
    if (!window.confirm('Yakin ingin menghapus jadwal ini?')) return;

    const promise = apiClient.delete(`/recurring/${id}`);
    toast.promise(promise, {
      loading: 'Menghapus...',
      success: () => {
        fetchData(); // Refresh daftar
        return 'Jadwal dihapus!';
      },
      error: 'Gagal menghapus.',
    });
  };

  if (loading) return <p className="text-center dark:text-gray-300">Loading...</p>;

  return (
    <div>
      <h2 className="hidden md:block text-3xl font-bold text-gray-800 dark:text-white mb-6">Transaksi Berulang</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-12 md:mt-0">

        <div className="lg:col-span-1">
          <AddRecurringForm categories={categories} onSuccess={fetchData} />
        </div>


        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Jadwal Aktif</h3>
          <div className="space-y-4">
            {recurringTxs.length === 0 ? <p className="text-gray-500 dark:text-gray-400">Belum ada jadwal.</p> : null}
            {recurringTxs.map(tx => (
              <div key={tx.id} className="p-4 border dark:border-gray-700 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-800 dark:text-white">{tx.description || tx.category}</p>
                  <p className={`font-semibold ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(tx.amount)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Setiap {tx.interval} {tx.frequency}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Berikutnya: {formatDate(tx.next_due_date)}
                  </p>
                </div>
                <button onClick={() => handleDelete(tx.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                  <MdDelete size={24} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecurringPage;