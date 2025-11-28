// src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout'; // Kita akan ganti nama ini jadi Sidebar
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import AddTransaction from './pages/AddTransaction';
import Categories from './pages/Categories';
import BudgetPage from './pages/BudgetPage';
import RecurringPage from './pages/RecurringPage';
import AccountsPage from './pages/AccountsPage';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';// Jika Anda ingin menambahkan toast

function App() {
  return (
<>
      <Toaster position="top-right" />
      
      <Routes>
        
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/add" element={<AddTransaction />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/recurring" element={<RecurringPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
          </Route>
        </Route>

      </Routes>
    </>
  );
}

export default App;