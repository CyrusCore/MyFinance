// src/components/AppLayout.jsx
import React from 'react';
import Navbar from './Navbar';
import { Outlet } from 'react-router-dom';

// Layout ini berisi Navbar dan placeholder (Outlet) untuk konten utama
const AppLayout = () => {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar />
      <main className="flex-1 p-8 overflow-y-auto scrollbar-hide">
        <Outlet /> {/* Ini akan merender Dashboard, Transactions, dll */}
      </main>
    </div>
  );
};

export default AppLayout;