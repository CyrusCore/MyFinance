// src/components/Navbar.jsx
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  MdDashboard, MdSwapHoriz, MdAddCircle, MdCategory,
  MdAssessment, MdAutorenew, MdAccountBalanceWallet, MdLogout,
  MdMenu, MdClose
} from 'react-icons/md';
import TransferModal from './TransferModal';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

// Helper untuk NavLink
const baseLinkClass = "flex items-center p-3 rounded-lg transition-colors";
const activeLinkClass = "bg-blue-600 text-white shadow-lg";
const inactiveLinkClass = "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const { isAuthenticated, logout } = useAuth();

  const handleTransferSuccess = () => {
    setIsModalOpen(false);
    navigate('/');
  };

  if (!isAuthenticated) {
    return null;
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Hamburger Button (Floating, visible only when closed) */}
      {!isMobileMenuOpen && (
        <button
          onClick={toggleMobileMenu}
          className="md:hidden fixed top-4 left-4 z-50 text-gray-600 dark:text-gray-300 focus:outline-none bg-white dark:bg-gray-800 p-2 rounded-full shadow-md"
        >
          <MdMenu size={28} />
        </button>
      )}

      {/* Overlay (Visible only when mobile menu is open) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={closeMobileMenu}
        ></div>
      )}

      {/* Container Navbar (Sidebar) */}
      <nav className={`
        fixed md:sticky top-0 left-0 h-screen w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col z-40 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:z-auto
      `}>

        {/* Logo (Desktop only) */}
        <div className="hidden md:flex justify-between items-center p-6">
          <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400">Finance App</h1>
          <ThemeToggle />
        </div>

        {/* Header Mobile Menu (Inside Sidebar) */}
        <div className="md:hidden p-4 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
          <span className="font-semibold text-gray-700 dark:text-gray-200">Menu</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={closeMobileMenu} className="text-gray-500 dark:text-gray-400">
              <MdClose size={24} />
            </button>
          </div>
        </div>

        {/* Kontainer Link (Scrollable) */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-2 space-y-2">
          <div onClick={closeMobileMenu}>
            <NavLinkItem to="/" icon={MdDashboard} label="Dashboard" />
          </div>
          <div onClick={closeMobileMenu}>
            <NavLinkItem to="/transactions" icon={MdSwapHoriz} label="Transaksi" />
          </div>
          <div onClick={closeMobileMenu}>
            <NavLinkItem to="/accounts" icon={MdAccountBalanceWallet} label="Daftar Akun" />
          </div>
          <div onClick={closeMobileMenu}>
            <NavLinkItem to="/add" icon={MdAddCircle} label="Tambah Transaksi" />
          </div>
          <div onClick={closeMobileMenu}>
            <NavLinkItem to="/categories" icon={MdCategory} label="Kategori" />
          </div>
          <div onClick={closeMobileMenu}>
            <NavLinkItem to="/budget" icon={MdAssessment} label="Anggaran" />
          </div>
          <div onClick={closeMobileMenu}>
            <NavLinkItem to="/recurring" icon={MdAutorenew} label="Transaksi Berulang" />
          </div>
        </div>

        {/* Bagian Bawah Navbar */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {/* Tombol Transfer */}
          <button
            onClick={() => {
              setIsModalOpen(true);
              closeMobileMenu();
            }}
            className="w-full flex items-center justify-center p-3 rounded-lg font-semibold text-white bg-green-500 hover:bg-green-600 transition-colors shadow-md"
          >
            <MdSwapHoriz size={20} className="mr-2" />
            Buat Transfer
          </button>

          <button
            onClick={() => {
              logout();
              closeMobileMenu();
            }}
            className="w-full flex items-center justify-center p-3 rounded-lg font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition-colors"
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