// src/pages/Dashboard.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../api';
import { useAccounts } from '../context/AccountsContext';
// 1. IMPORT PIE CHART
import { Doughnut, Pie } from 'react-chartjs-2'; // <-- Tambahkan Pie
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

// ... (Helper formatCurrency dan SummaryCard tetap sama) ...
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(amount / 100);
};

const SummaryCard = ({ title, amount, colorClass }) => (
  <div className="bg-white p-6 rounded-xl shadow-md">
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <p className={`text-3xl font-bold mt-2 ${colorClass}`}>
      {formatCurrency(amount)}
    </p>
  </div>
);

const getStartOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
};

const getEndOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
};

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [categorySummary, setCategorySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(getStartOfMonth()); 
  const [endDate, setEndDate] = useState(getEndOfMonth());      
  const { accounts: allAccounts, fetchAccounts, loadingAccounts } = useAccounts();
  const [selectedAccountID, setSelectedAccountID] = useState('all');
   // 'all' atau ID (misal: '1')

const fetchData = useCallback(() => {
    if (!startDate || !endDate) return; 
    setLoading(true); 

  
    let summaryParams = `?start=${startDate}&end=${endDate}`;
    if (selectedAccountID !== 'all') {
      summaryParams += `&account_id=${selectedAccountID}`;
    }

    // 2. Ambil summary (income/expense)
    const summaryPromise = apiClient.get(`/summary${summaryParams}`);
    // 3. Ambil summary kategori
    const categoryPromise = apiClient.get(`/summary/categories${summaryParams}`);

    Promise.all([summaryPromise, categoryPromise])
      .then(([summaryRes, categoryRes]) => {
        setSummary(summaryRes.data);
        setCategorySummary(categoryRes.data);
        setError(null);
      })
      .catch(err => {
        setError('Gagal mengambil data dashboard');
      })
      .finally(() => {
        setLoading(false);
      });
  // Dependensi 'fetchData' sekarang adalah 'selectedAccountID'
  }, [startDate, endDate, selectedAccountID]); // <-- DIMODIFIKASI


  useEffect(() => {
    fetchData(); 
    const intervalId = setInterval(fetchData, 30000); 
    
    return () => clearInterval(intervalId);
  }, [fetchData]); 

const totalNetBalance = useMemo(() => {
    if (selectedAccountID === 'all') {
      return allAccounts.reduce((sum, acc) => sum + acc.current_balance, 0);
    } else {
      const selectedAcc = allAccounts.find(acc => acc.id === parseInt(selectedAccountID, 10));
      return selectedAcc ? selectedAcc.current_balance : 0;
    }
  }, [allAccounts, selectedAccountID]);
  
  const incomeExpenseData = {
    labels: ['Total Pemasukan', 'Total Pengeluaran'],
    datasets: [
      {
        data: [summary?.total_income / 100, summary?.total_expense / 100],
        backgroundColor: ['rgba(22, 163, 74, 0.8)', 'rgba(220, 38, 38, 0.8)'],
        borderColor: ['rgba(22, 163, 74, 1)', 'rgba(220, 38, 38, 1)'],
        borderWidth: 1,
      },
    ],
  };

  // Data untuk Pie (Expense by Category)
  const categoryChartData = {
    // Ambil labels (nama kategori) dari data API
    labels: categorySummary?.map(item => item.category) || [],
    datasets: [
      {
        data: categorySummary?.map(item => item.total_amount / 100) || [],
        // Sediakan daftar warna yang lebih banyak untuk Pie Chart
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(201, 203, 207, 0.8)',
          'rgba(50, 205, 50, 0.8)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Opsi chart (bisa dipakai untuk keduanya)
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) { label += ': '; }
            if (context.parsed !== null) {
              label += new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
              }).format(context.parsed);
            }
            return label;
          }
        }
      }
    }
  };
  const formatDateForTitle = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString + 'T00:00:00').toLocaleDateString('id-ID', options);
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>
      <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Filter Laporan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Filter Akun (BARU) */}
          <div>
            <label htmlFor="accountFilter" className="block text-sm font-medium text-gray-600">Akun</label>
            <select
              id="accountFilter"
              value={selectedAccountID}
              onChange={(e) => setSelectedAccountID(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Semua Akun</option>
              {allAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-600">Tanggal Mulai</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-600">Tanggal Selesai</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
      <h3 className="text-xl font-semibold text-gray-700 mb-4">
        Laporan untuk {formatDateForTitle(startDate)} - {formatDateForTitle(endDate)}
      </h3>

      {loading && <div className="text-center text-gray-500">Memuat data...</div>}
      {error && !loading && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
          <strong className="font-bold">Error:</strong> {error}
        </div>
      )}

      {!loading && !error && summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ... (3 SummaryCard Anda tetap di sini) ... */}
            <SummaryCard 
              title="Total Pemasukan" 
              amount={summary.total_income} 
              colorClass="text-green-600" 
            />
            <SummaryCard 
              title="Total Pengeluaran" 
              amount={summary.total_expense} 
              colorClass="text-red-600"
            />
            <SummaryCard 
              title="Saldo Bersih" 
              amount={summary.net_balance} 
              colorClass={summary.net_balance >= 0 ? "text-blue-700" : "text-red-600"}
            />
          </div>

          {/* 5. BUAT LAYOUT 2-KOLOM UNTUK CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            
            {/* Chart 1: Pengeluaran per Kategori */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">Pengeluaran per Kategori</h3>
              <div className="relative" style={{ height: '350px' }}>
                {categorySummary && categorySummary.length > 0 ? (
                  <Pie data={categoryChartData} options={chartOptions} />
                ) : (
                  <p className="text-center text-gray-500 mt-16">Belum ada data pengeluaran.</p>
                )}
              </div>
            </div>

            {/* Chart 2: Pemasukan vs Pengeluaran */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">Pemasukan vs Pengeluaran</h3>
              <div className="relative" style={{ height: '350px' }}>
                <Doughnut data={incomeExpenseData} options={chartOptions} />
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;