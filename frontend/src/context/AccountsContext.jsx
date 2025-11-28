// src/context/AccountsContext.jsx
import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import apiClient from '../api';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const fetchAccounts = async () => {
  const { data } = await apiClient.get('/accounts');
  return data;
};
// 1. Buat Context

// 2. Buat Provider (komponen "pembungkus")
const AccountsContext = createContext();

export const AccountsProvider = ({ children }) => {
  
  // vvvv 2. GANTI SEMUA useState/useEffect LAMA vvvv
  const { 
    data: accounts = [], // 'data' diganti nama jadi 'accounts', defaultnya array kosong
    isLoading: isLoadingAccounts,
    isError: isErrorAccounts,
  } = useQuery({ 
    queryKey: ['accounts'], // <-- Kunci unik untuk data ini
    queryFn: fetchAccounts, // <-- Fungsi untuk mengambilnya
  });
  // ^^^^ `react-query` sekarang MENGELOLA SEMUA FETCHING AKUN ^^^^

  // Ambil query client
  const queryClient = useQueryClient();

  // vvvv 3. Buat Fungsi REFRESH (Invalidate) vvvv
  const refreshAccounts = () => {
    // Ini memberi tahu react-query untuk mengambil ulang data ['accounts']
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
  };

  const value = {
    accounts,
    isLoadingAccounts,
    isErrorAccounts,
    refreshAccounts, // <-- Kirim fungsi refresh
    
    // Kita tidak lagi mengirim 'fetchAccounts'
  };

  return (
    <AccountsContext.Provider value={value}>
      {children}
    </AccountsContext.Provider>
  );
};

// Tetap gunakan hook kustom
export const useAccounts = () => {
  return useContext(AccountsContext);
};