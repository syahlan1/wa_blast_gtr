import { useState, useEffect, useContext } from 'react';
import "../dist/css/sidebar.css";
import { FaBars } from 'react-icons/fa';
import { LiaBullhornSolid } from "react-icons/lia";
import { RiHistoryFill, RiHome5Line } from "react-icons/ri";
import { IoIosArrowForward, IoIosArrowDown } from "react-icons/io";
import { LuLogOut } from "react-icons/lu";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2'; 
import { AuthContext } from './AuthContext';

// eslint-disable-next-line react/prop-types
const SidebarComponent = ({ children }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [submenuOpen, setSubmenuOpen] = useState({});
  const [userInfo, setUserInfo] = useState(null); // State untuk menyimpan informasi user
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const toggleSubmenu = (index) => {
    setSubmenuOpen((prevState) => ({
      ...prevState,
      [index]: !prevState[index],
    }));
  };

  useEffect(() => {
    // Fungsi untuk mengambil informasi user dari API
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:3002/api/user-info', {
          withCredentials: true, // Sertakan cookie dalam permintaan
        });
        setUserInfo(response.data); // Simpan data user
      } catch (error) {
        console.error('Failed to fetch user info', error);
      }
    };

    fetchUserInfo();
  }, []);

  const handleLogout = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to log out?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, log out',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        logout(); // Hapus session token
        navigate('/login'); // Redirect ke halaman login
      }
    });
  };

  return (
    <div className={`layout ${isOpen ? '' : 'sidebar-closed'}`}>
      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <h2>Broadcast WA</h2>
        <ul>
          <li>
            <a href="/">
              <RiHome5Line className="icon-left" /> Dashboard
            </a>
          </li>
          <li onClick={() => toggleSubmenu(1)}>
            <a href="#blast">
              <LiaBullhornSolid className="icon-left" /> Buat Blast
              {submenuOpen[1] ? (
                <IoIosArrowDown className="icon-right" />
              ) : (
                <IoIosArrowForward className="icon-right" />
              )}
            </a>
            <ul className={`submenu ${submenuOpen[1] ? 'open' : ''}`}>
              <li><a href="/campaign-page">Buat Kampanye</a></li>
              <li><a href="/create-message">Kirim Cepat</a></li>
            </ul>
          </li>
          <li>
            <a href="/history">
              <RiHistoryFill className="icon-left" /> Riwayat
            </a>
          </li>
        </ul>
        <div className="sidebar-footer">
          <img src='img/assets/icon-user.png' alt="Profile" />
          {/* Tampilkan username dari API */}
          <p>{userInfo ? userInfo.username : 'User'}</p>
          <a onClick={handleLogout}><LuLogOut className='signout' alt="Sign Out" /></a>
        </div>
      </div>

      {/* Toggle button only appears in small screens */}
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        <FaBars />
      </button>

      {/* Content (children) */}
      <div className={`content ${isOpen ? 'sidebar-open' : ''}`}>
        {children}
      </div>
    </div>
  );
};

SidebarComponent.propTypes = {
  children: PropTypes.node.isRequired,
};

export default SidebarComponent;
