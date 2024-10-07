import { useState, useContext } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../components/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext); // Ambil fungsi login dari context

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://127.0.0.1:3002/api/login', { email, password }, {
        withCredentials: true, // Sertakan cookie dengan request
      });

      if (response.status === 200) {
        login(response.data.token);
        navigate('/'); // Redirect ke dashboard setelah login
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Login Gagal',
          text: 'Email atau password salah',
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Login Gagal',
        text: 'Terjadi kesalahan, coba lagi nanti.',
      });
    }
  };

  return (
    <div className='login-container'>
      <div className="login-box">
        <div className="login-left">
          <h2>Sign In</h2>
          <form onSubmit={handleLogin}>
            <div className="input-field">
              <input
                type="text"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-field password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span onClick={togglePasswordVisibility} className="toggle-password">
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

            <div className="forgot-password">
              <a href="">Lupa Password?</a>
            </div>

            <button type="submit" className="login-btn">Sign In</button>
          </form>
        </div>

        <div className="login-right">
          <img src="/img/assets/login-img.png" alt="Login Illustration" />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
