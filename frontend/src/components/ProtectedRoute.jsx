// src/components/ProtectedRoute.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  // 1. Tampilkan loading jika kita belum selesai mengecek token
  if (loading) {
    return <div>Loading...</div>; // Atau tampilkan spinner
  }

  // 2. Jika sudah selesai loading DAN tidak terautentikasi,
  //    redirect ke halaman /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 3. Jika terautentikasi, tampilkan halaman yang diminta
  //    (Outlet adalah placeholder untuk children route, misal: <Dashboard />)
  return <Outlet />;
};

export default ProtectedRoute;