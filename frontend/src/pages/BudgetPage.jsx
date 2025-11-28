// src/pages/BudgetPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api';
import toast from 'react-hot-toast';

// Helper format
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(amount / 100);
};

// Komponen Progress Bar
const ProgressBar = ({ actual, budget }) => {
  if (budget === 0) return <div className="text-sm text-gray-500">Budget belum di-set</div>;
  
  const percentage = Math.round((actual / budget) * 100);
  let barColor = 'bg-blue-500'; // Biru jika aman
  if (percentage > 75) barColor = 'bg-yellow-500'; // Kuning jika hati-hati
  if (percentage > 100) barColor = 'bg-red-500'; // Merah jika lewat

  return (
    <div className="w-full bg-gray-200 rounded-full h-4">
      <div 
        className={`h-4 rounded-full ${barColor}`} 
        style={{ width: `${Math.min(percentage, 100)}%` }} // Batasi 100%
      ></div>
    </div>
  );
};

// Komponen untuk satu baris budget
const BudgetRow = ({ category, actual, budget, onSave, month, year }) => {
  const [amount, setAmount] = useState(budget / 100); // Tampilkan dlm Rupiah

  const handleSave = () => {
    const amountInCents = Math.round(parseFloat(amount) * 100);
    const promise = apiClient.post('/budgets', {
      category_name: category,
      amount: amountInCents,
      month: month,
      year: year,
    });
    
    toast.promise(promise, {
      loading: 'Menyimpan...',
      success: 'Budget disimpan!',
      error: 'Gagal menyimpan.',
    });
  };
  
  const remaining = budget - actual;

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-4 border-b">
      {/* Nama Kategori */}
      <div className="md:col-span-1 font-semibold text-gray-800">{category}</div>
      
      {/* Progress Bar & Info */}
      <div className="md:col-span-2">
        <ProgressBar actual={actual} budget={budget} />
        <div className="flex justify-between text-sm mt-1">
          <span className="text-red-600">Terpakai: {formatCurrency(actual)}</span>
          <span className="font-medium">
            {remaining >= 0 ? `${formatCurrency(remaining)} Sisa` : `${formatCurrency(Math.abs(remaining))} Lewat`}
          </span>
        </div>
      </div>
      
      {/* Input Budget */}
      <div className="md:col-span-2 flex gap-2">
        <input 
          type="number" 
          step="1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Set Budget (Rp)"
        />
        <button 
          onClick={handleSave}
          className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700"
        >
          Simpan
        </button>
      </div>
    </div>
  );
};


const BudgetPage = () => {
  const [data, setData] = useState([]); // State gabungan
  const [loading, setLoading] = useState(true);
  
  // State untuk filter bulan/tahun
  const [month, setMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchData = useCallback(() => {
    setLoading(true);

    const params = `?month=${month}&year=${year}`;
    
    // 1. Ambil daftar kategori (dasar)
    const categoriesPromise = apiClient.get('/categories');
    // 2. Ambil data budget (rencana)
    const budgetsPromise = apiClient.get(`/budgets${params}`);
    // 3. Ambil data aktual (pengeluaran)
    const actualsPromise = apiClient.get(`/summary/categories${params}`);

    Promise.all([categoriesPromise, budgetsPromise, actualsPromise])
      .then(([catRes, budRes, actRes]) => {
        
        const categories = catRes.data;
        const budgets = budRes.data;
        const actuals = actRes.data;
        
        // Gabungkan 3 data ini
        const combinedData = categories.map(cat => {
          // Cari budget untuk kategori ini
          const budget = budgets.find(b => b.category_name === cat.name);
          // Cari pengeluaran untuk kategori ini
          const actual = actuals.find(a => a.category === cat.name);
          
          return {
            category: cat.name,
            budgetAmount: budget ? budget.amount : 0, // 0 jika belum di-set
            actualAmount: actual ? actual.total_amount : 0, // 0 jika belum ada pengeluaran
          };
        });
        
        setData(combinedData);
        setLoading(false);
      })
      .catch(err => {
        toast.error('Gagal memuat data budget.');
        setLoading(false);
      });

  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">
        Anggaran (Budgeting)
      </h2>
      
      {/* TODO: Tambahkan filter ganti bulan/tahun di sini */}
      
      <div className="bg-white rounded-xl shadow-lg">
        {loading ? (
          <p className="text-center p-8">Loading data...</p>
        ) : (
          data.map(item => (
            <BudgetRow 
              key={item.category}
              category={item.category}
              actual={item.actualAmount}
              budget={item.budgetAmount}
              onSave={fetchData} // Refresh data setelah simpan
              month={month}
              year={year}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default BudgetPage;