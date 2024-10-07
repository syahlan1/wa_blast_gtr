import { useState, useEffect } from "react";
import { FaSearch, FaRegTrashAlt } from "react-icons/fa";
import { FaInfo } from "react-icons/fa6";
import { IoMdClose } from "react-icons/io";
import axios from "axios";
import Swal from 'sweetalert2';

function formatDate(dateString) {
  const datePart = dateString.split("T")[0];
  const timePart = dateString.split("T")[1].split(".")[0];
  const [year, month, day] = datePart.split("-");
  return `${day}/${month}/${year}, ${timePart}`;
}

const ShowHistoryPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dataPerPage, setDataPerPage] = useState(10);
  const [historyData, setHistoryData] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false); 
  const [selectedHistory, setSelectedHistory] = useState(null); 

  useEffect(() => {
    const fetchHistoryData = async () => {
      try {
        const response = await axios.get("http://localhost:3002/api/history");
        setHistoryData(response.data || []); // Jika data dari server null, set historyData sebagai array kosong
      } catch (error) {
        console.error("Failed to fetch history data", error);
        setHistoryData([]); // Pastikan set historyData sebagai array kosong jika terjadi error
      }
    };

    fetchHistoryData();
  }, []);

  const filteredHistory = historyData.filter((history) =>
    history.contact_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastData = currentPage * dataPerPage;
  const indexOfFirstData = indexOfLastData - dataPerPage;
  const currentData = filteredHistory.slice(indexOfFirstData, indexOfLastData);

  const totalPages = Math.ceil(filteredHistory.length / dataPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleDataPerPageChange = (e) => {
    setDataPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Fungsi untuk menghapus data riwayat
  const handleDelete = async () => {
    if (!selectedHistory) return;

    try {
      await axios.delete(`http://localhost:3002/api/history/${selectedHistory}`);
      setHistoryData(historyData.filter((history) => history.id !== selectedHistory)); // Update state setelah penghapusan
      setShowDeleteModal(false); // Tutup modal setelah penghapusan

      // Tampilkan pesan sukses menggunakan SweetAlert2
      Swal.fire({
        position: 'top-end',
        text: 'Riwayat berhasil dihapus',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Failed to delete history", error);
      // Tampilkan pesan error jika gagal
      Swal.fire({
        position: 'top-end',
        text: 'Riwayat gagal dihapus',
        icon: 'error',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  return (
    <div>
      <div className="container">
        <div className="container-head">
          <h1>Riwayat</h1>
        </div>
        <div className="campaign-page">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Cari Riwayat"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i className="search-icon">
              <FaSearch />
            </i>
          </div>
          <table className="campaign-table">
            <thead>
              <tr>
                <th>Pengirim</th>
                <th>Pesan Berhasil</th>
                <th>Pesan Gagal</th>
                <th>Tanggal & Waktu</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length > 0 ? (
                currentData.map((history) => (
                  <tr key={history.id} style={{ cursor: "pointer" }}>
                    <td>{history.contact_name}</td>
                    <td>{history.success}</td>
                    <td>{history.failed}</td>
                    <td>{formatDate(history.created_at)}</td>
                    <td className="action-icons">
                      <button
                        className="btn delete-btn"
                        onClick={() => {
                          setSelectedHistory(history.id); 
                          setShowDeleteModal(true); 
                        }}
                      >
                        <FaRegTrashAlt />
                      </button>
                      <a href={`/detail-history/${history.id}`}>
                        <button className="btn send-btn">
                          <FaInfo />
                        </button>
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
                    Tidak ada Riwayat ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="pagination-container">
            <label htmlFor="dataPerPage">Tampilkan: </label>
            <select
              id="dataPerPage"
              value={dataPerPage}
              onChange={handleDataPerPageChange}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="40">40</option>
              <option value="50">50</option>
            </select>

            <div className="pagination">
              {[...Array(totalPages)].map((_, index) => (
                <a
                  key={index + 1}
                  onClick={() => handlePageChange(index + 1)}
                  className={currentPage === index + 1 ? "active" : ""}
                  href="#!"
                >
                  {index + 1}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Modal konfirmasi penghapusan */}
        {showDeleteModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Hapus Riwayat</h3>
                <button className="close-icon" onClick={() => setShowDeleteModal(false)}>
                  <IoMdClose />
                </button>
              </div>
              <div className="modal-body">
                <p>Apakah Anda yakin ingin menghapus riwayat ini?</p>
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => setShowDeleteModal(false)}>
                  Batal
                </button>
                <button className="btn-back" onClick={handleDelete}>
                  Hapus
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowHistoryPage;
