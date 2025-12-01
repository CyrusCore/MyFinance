

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api';
import toast from 'react-hot-toast';


const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
// ---

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  const [newName, setNewName] = useState('');


  const fetchCategories = useCallback(() => {
    setLoading(true);
    apiClient.get('/categories')
      .then(response => {
        setCategories(response.data || []);
        setError(null);
      })
      .catch(err => {
        setError('Gagal memuat kategori');
        toast.error('Gagal memuat kategori.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);


  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);


  const handleSubmit = (e) => {
    e.preventDefault();

    if (newName.trim() === '') {
      toast.error('Nama kategori tidak boleh kosong');
      return;
    }

    const promise = apiClient.post('/categories', { name: newName });

    toast.promise(
      promise,
      {
        loading: 'Menyimpan kategori...',
        success: (response) => {
          setNewName(''); // Kosongkan input
          fetchCategories(); // Ambil ulang daftar kategori
          return `Kategori "${response.data.name}" berhasil ditambahkan!`;
        },
        error: (err) => {
          if (err.response && err.response.status === 409) {
            return 'Nama kategori sudah ada';
          }
          return 'Gagal menambahkan kategori';
        }
      }
    );
  };

  return (
    <div>
      <h2 className="hidden md:block text-3xl font-bold text-gray-800 dark:text-white mb-6">
        Kelola Kategori
      </h2>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12 md:mt-0">


        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Daftar Kategori</h3>
          {loading && <p className="text-center text-gray-500 dark:text-gray-400">Loading...</p>}
          {error && !loading && (
            <p className="text-center text-red-500">{error}</p>
          )}
          {!loading && !error && (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {categories.length === 0 ? (
                <li className="py-3 text-gray-500 dark:text-gray-400">Belum ada kategori.</li>
              ) : (
                categories.map(cat => (
                  <li key={cat.id} className="py-3 font-medium text-gray-700 dark:text-gray-300">
                    {cat.name}
                  </li>
                  // Nanti di sini kita bisa tambahkan tombol Edit/Delete
                ))
              )}
            </ul>
          )}
        </div>


        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Tambah Kategori Baru</h3>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="categoryName" className={labelClass}>
                  Nama Kategori Baru
                </label>
                <input
                  id="categoryName"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Investasi"
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 shadow-md transition-colors"
              >
                Tambah Kategori
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Categories;