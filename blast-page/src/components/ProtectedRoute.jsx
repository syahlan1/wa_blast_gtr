import { Navigate } from "react-router-dom";
import PropTypes from 'prop-types';

// Fungsi untuk mendapatkan nilai cookie berdasarkan namanya
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

// Fungsi untuk mengecek apakah user sudah login
const isAuthenticated = () => {
  const token = getCookie('session_token'); // Ambil token dari cookie
  return !!token; // Mengembalikan true jika token ada
};

// ProtectedRoute: Melindungi route agar hanya bisa diakses jika sudah login
const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    // Jika user belum login, arahkan ke halaman login
    return <Navigate to="/login" />;
  }

  // Jika sudah login, render komponen yang diminta
  return children;
};

// Validasi props
ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ProtectedRoute;
