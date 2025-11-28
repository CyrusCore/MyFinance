// src/components/Navbar.jsx
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  MdDashboard, MdSwapHoriz, MdAddCircle, MdCategory, 
  MdAssessment, MdAutorenew, MdAccountBalanceWallet, MdLogout // <-- 1. IMPORT IKON LOGOUT
} from 'react-icons/md';
import TransferModal from './TransferModal';
import { useAuth } from '../context/AuthContext'; // <-- 2. IMPORT useAuth

// Helper untuk NavLink
const baseLinkClass = "flex items-center p-3 rounded-lg transition-colors";
const activeLinkClass = "bg-blue-600 text-white shadow-lg";
const inactiveLinkClass = "text-gray-600 hover:bg-gray-100 hover:text-gray-900";

const NavLinkItem = ({ to, icon: Icon, label }) => (
  <NavLink 
    to={to}
    className={({ isActive }) => 
      `${baseLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`
    }
  >
    <Icon size={22} className="mr-3" />
    <span className="font-medium">{label}</span>
  </NavLink>
);

const Navbar = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  
  // --- 3. PANGGIL HOOK AUTH ---
  const { isAuthenticated, logout } = useAuth();
  
  const handleTransferSuccess = () => {
    setIsModalOpen(false);
    navigate('/'); // Arahkan ke dashboard setelah transfer sukses
  };

  // Jika belum login, jangan tampilkan navbar sama sekali
  // (Meskipun App.jsx sudah menangani ini, ini adalah pengaman ganda)
  if (!isAuthenticated) {
    return null; 
  }

  return (
    <>
      {/* Container Navbar */}
      <nav className="w-64 bg-white shadow-lg flex flex-col h-screen sticky top-0">
        
        {/* Logo */}
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-700">Finance App</h1>
        </div>
        
        {/* Kontainer Link (Scrollable) */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-2 space-y-2">
          <NavLinkItem to="/" icon={MdDashboard} label="Dashboard" />
          <NavLinkItem to="/transactions" icon={MdSwapHoriz} label="Transaksi" />
          <NavLinkItem to="/accounts" icon={MdAccountBalanceWallet} label="Daftar Akun" />
          <NavLinkItem to="/add" icon={MdAddCircle} label="Tambah Transaksi" />
          <NavLinkItem to="/categories" icon={MdCategory} label="Kategori" />
          <NavLinkItem to="/budget" icon={MdAssessment} label="Anggaran" />
          <NavLinkItem to="/recurring" icon={MdAutorenew} label="Transaksi Berulang" />
        </div>
        
        {/* Bagian Bawah Navbar */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          {/* Tombol Transfer */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center p-3 rounded-lg font-semibold text-white bg-green-500 hover:bg-green-600 transition-colors shadow-md"
          >
            <MdSwapHoriz size={20} className="mr-2" />
            Buat Transfer
          </button>
          
          {/* --- 4. TOMBOL LOGOUT BARU --- */}
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center p-3 rounded-lg font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <MdLogout size={20} className="mr-2" />
            Logout
          </button>
        </div>
      </nav>
      
      {/* Modal Transfer */}
      <TransferModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleTransferSuccess}
      />
    </>
  );
};

export default Navbar;