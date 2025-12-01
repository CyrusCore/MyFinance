import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../api';
import toast from 'react-hot-toast';
import { MdDelete, MdEdit } from 'react-icons/md';
import EditTransactionModal from '../components/EditTransactionModal';
import { useAccounts } from '../context/AccountsContext';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(amount / 100);
};

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingID, setEditingID] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { accounts, fetchAccounts } = useAccounts();

  const accountNameMap = useMemo(() => {
    const map = new Map();
    accounts.forEach(acc => {
      map.set(acc.id, acc.name);
    });
    return map;
  }, [accounts]);

  const getAccountName = (id) => {
    return accountNameMap.get(id) || `Akun #${id}`;
  };

  const fetchTransactions = useCallback(() => {
    setLoading(true);
    apiClient.get(`/transactions?page=${page}&limit=25`)
      .then(response => {
        const res = response.data;
        setTransactions(res.data || []);
        setTotalPages(res.total_pages || 1);
        setPage(res.page || 1);
        setError(null);
      })
      .catch(err => {
        setError('Gagal mengambil data transaksi');
        toast.error('Gagal mengambil data transaksi.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

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
          fetchAccounts();
          if (transactions.length === 1 && page > 1) {
            setPage(p => p - 1);
          } else {
            fetchTransactions();
          }
          return 'Transaksi berhasil dihapus!';
        },
        error: 'Gagal menghapus transaksi.',
      }
    );
  };

  if (loading && transactions.length === 0) return <p className="text-center text-gray-500 dark:text-gray-400">Loading transactions...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;

  return (
    <div>
      <div className="flex justify-end md:justify-between items-center mb-6">
        <h2 className="hidden md:block text-3xl font-bold text-gray-800 dark:text-white">
          Riwayat Transaksi
        </h2>

        <a
          href="/api/export/csv"
          download="laporan-transaksi.csv"
          className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 font-semibold"
        >
          Export Semua (CSV)
        </a>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg overflow-x-auto">
        {transactions.length === 0 && !loading ? (
          <p className="text-center text-gray-500 dark:text-gray-400">Belum ada transaksi.</p>
        ) : (
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-300 p-3">Tanggal</th>
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-300 p-3">Tipe</th>
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-300 p-3">Akun</th>
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-300 p-3">Kategori</th>
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-300 p-3">Jumlah</th>
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-300 p-3">Deskripsi</th>
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-300 p-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{formatDate(tx.date)}</td>

                  <td className="p-3 text-sm">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${tx.type === 'income' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      tx.type === 'expense' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                      {tx.type}
                    </span>
                  </td>

                  <td className="p-3 text-sm text-gray-700 dark:text-gray-300">
                    {tx.type === 'transfer'
                      ? `Dari ${getAccountName(tx.account_id)} ke ${getAccountName(tx.destination_account_id)}`
                      : getAccountName(tx.account_id)
                    }
                  </td>

                  <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{tx.category}</td>

                  <td className={`p-3 text-sm font-medium ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' :
                    tx.type === 'expense' ? 'text-red-600 dark:text-red-400' :
                      'text-gray-700 dark:text-gray-300'
                    }`}>
                    {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                    {formatCurrency(tx.amount)}
                  </td>

                  <td className="p-3 text-sm text-gray-500 dark:text-gray-400">{tx.description}</td>

                  <td className="p-3 text-sm">
                    {tx.type !== 'transfer' && (
                      <button
                        onClick={() => setEditingID(tx.id)}
                        className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors mr-2"
                        title="Edit"
                      >
                        <MdEdit size={20} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
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

      <div className="flex justify-between items-center mt-6">
        <button
          onClick={() => setPage(p => p - 1)}
          disabled={page <= 1 || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
        >
          Sebelumnya
        </button>

        <span className="text-gray-700 dark:text-gray-300 font-medium">
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

      <EditTransactionModal
        id={editingID}
        onClose={() => setEditingID(null)}
        onSuccess={() => {
          fetchTransactions();
          fetchAccounts();
        }}
      />
    </div>
  );
};

export default Transactions;