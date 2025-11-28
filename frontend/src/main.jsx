// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { Toaster } from 'react-hot-toast';
import { AccountsProvider } from './context/AccountsContext';
import { AuthProvider } from './context/AuthContext.jsx'; // Hapus/sesuaikan CSS default jika perlu
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
    <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AccountsProvider>
          <App />
          <Toaster position="top-right" />
        </AccountsProvider> 
      </AuthProvider> 
    </QueryClientProvider>
    </BrowserRouter>
  // </React.StrictMode>
);