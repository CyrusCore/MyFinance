// src/components/ThemeToggle.jsx
import React from 'react';
import { MdDarkMode, MdLightMode } from 'react-icons/md';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ className = "" }) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-colors duration-200 focus:outline-none ${theme === 'dark'
                    ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                } ${className}`}
            aria-label="Toggle Dark Mode"
        >
            {theme === 'dark' ? <MdLightMode size={20} /> : <MdDarkMode size={20} />}
        </button>
    );
};

export default ThemeToggle;
