// src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import apiClient from '../api';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

// (Helper class bisa Anda tambahkan)
const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

const RegisterPage = () => {
    const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Password tidak cocok!');
      return;
    }
    if (password.length < 8) {
      toast.error('Password minimal harus 8 karakter.');
      return;
    }
    
    setLoading(true);

    const promise = apiClient.post('/auth/register', {
        name: name,
      email: email,
      password: password,
    });

    toast.promise(promise, {
      loading: 'Mendaftarkan...',
      success: (res) => {
        setLoading(false);
        navigate('/login'); // Redirect ke halaman Login setelah sukses
        return 'Registrasi berhasil! Silakan login.';
      },
      error: (err) => {
        setLoading(false);
        return err.response?.data?.error || 'Registrasi gagal.';
      },
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold text-center text-gray-800">Daftar Akun Baru</h2>
        <form onSubmit={handleRegister} className="space-y-6">
            <div>
            <label htmlFor="name" className={labelClass}>Nama</label>
            <input
              id="name" type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass} required
            />
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>Email</label>
            <input
              id="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass} required
            />
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>Password</label>
            <input
              id="password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass} required
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className={labelClass}>Konfirmasi Password</label>
            <input
              id="confirmPassword" type="password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass} required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Membuat akun...' : 'Daftar'}
          </button>
        </form>
        <p className="text-sm text-center text-gray-600">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Login di sini
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;