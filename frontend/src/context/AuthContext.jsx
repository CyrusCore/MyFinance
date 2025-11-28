// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../api';

// 1. Buat Context
const AuthContext = createContext(null);

// 2. Buat Provider
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true); // <-- PENTING

  // 3. Efek untuk mengecek token saat aplikasi dimuat
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    
    if (storedToken) {
      // Jika ada token, set state dan header apiClient
      setToken(storedToken);
      setIsAuthenticated(true);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    
    // Selesai loading, kita sudah tahu status login
    setLoading(false);
  }, []); // [] = Hanya berjalan sekali saat app dimuat

  // 4. Fungsi Login
  const login = (newToken) => {
    localStorage.setItem('authToken', newToken);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setIsAuthenticated(true);
  };

  // 5. Fungsi Logout
  const logout = () => {
    localStorage.removeItem('authToken');
    delete apiClient.defaults.headers.common['Authorization'];
    setToken(null);
    setIsAuthenticated(false);
  };

  // 6. Nilai yang akan diberikan ke komponen 'children'
  const value = {
    token,
    isAuthenticated,
    loading, // <-- Kirim status loading
    login,
    logout,
  };

  // 7. Render provider
  // Tampilkan loading jika kita belum selesai mengecek token
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// 8. Buat Hook kustom untuk kemudahan
export const useAuth = () => {
  return useContext(AuthContext);
};