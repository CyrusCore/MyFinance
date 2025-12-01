

import React, { useState } from 'react';
import apiClient from '../api';
import toast from 'react-hot-toast';
import { useAccounts } from '../context/AccountsContext';


const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount / 100);


const AddAccountForm = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('bank');
  const [initialBalance, setInitialBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const { refreshAccounts } = useAccounts();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);


    const balanceInCents = Math.round(parseFloat(initialBalance) * 100);

    try {
      await apiClient.post('/accounts', {
        name: name,
        type: type,
        current_balance: balanceInCents,
      });

      toast.success('Akun berhasil dibuat!');
      if (onSuccess) onSuccess(); // Refresh daftar

      // Reset form
      refreshAccounts();
      setName('');
      setInitialBalance(0);
      setType('bank');
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error('Gagal membuat akun.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg mt-12 md:mt-0">
      <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Buat Akun Baru</h3>
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
        <button
          type="submit"
          disabled={loading}
          className={`w-full text-white font-bold py-3 px-4 rounded-lg shadow-md ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {loading ? 'Menyimpan...' : 'Simpan Akun'}
        </button>
      </form>
    </div>
  );
};


const AccountsPage = () => {

  const { accounts, fetchAccounts, loadingAccounts } = useAccounts();

  if (loadingAccounts) return <p className="text-center dark:text-gray-300">Loading...</p>;

  return (
    <div>
      <h2 className="hidden md:block text-3xl font-bold text-gray-800 dark:text-white mb-6">Kelola Akun</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">


        <div className="lg:col-span-1">
          <AddAccountForm onSuccess={fetchAccounts} />
        </div>


        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Daftar Akun Anda</h3>
          <div className="space-y-4">
            {accounts.length === 0 ? <p className="text-gray-500 dark:text-gray-400">Belum ada akun.</p> : null}
            {accounts.map(acc => (
              <div key={acc.id} className="p-4 border dark:border-gray-700 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg text-gray-800 dark:text-white">{acc.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{acc.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-blue-700 dark:text-blue-400">{formatCurrency(acc.current_balance)}</p>
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