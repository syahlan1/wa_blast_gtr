import { createContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

// Membuat Auth Context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fungsi untuk mendapatkan token dari cookie
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  // Fungsi untuk memeriksa apakah user sudah login
  const checkAuth = () => {
    const token = getCookie('session_token'); // Ambil token dari cookie
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
    setLoading(false); // Set loading menjadi false setelah pengecekan
  };

  // Lakukan pengecekan saat komponen pertama kali dimuat
  useEffect(() => {
    checkAuth();
  }, []);

  // Fungsi untuk login
  const login = (token) => {
    const expirationDays = 2; // Set waktu kedaluwarsa token, misal 2 hari
    const date = new Date();
    date.setTime(date.getTime() + (expirationDays * 24 * 60 * 60 * 1000));
    document.cookie = `session_token=${token}; path=/; expires=${date.toUTCString()}; SameSite=Lax; Secure`;

    setIsAuthenticated(true);
  };

  // Fungsi untuk logout
  const logout = async () => {
    try {
      // Memanggil route backend untuk menghapus session token dari server
      await axios.post('http://127.0.0.1:3002/api/logout', {}, { withCredentials: true });

      // Hapus cookie session_token di frontend
      document.cookie = 'session_token=; Max-Age=-99999999; path=/;';
      
      // Update state autentikasi
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
