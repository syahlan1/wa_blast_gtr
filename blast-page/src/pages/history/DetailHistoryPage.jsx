import { FaArrowLeft } from "react-icons/fa6";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import axios from "axios";

function formatDate(dateString) {
    // Ambil bagian tanggal dan waktu dari string
    const datePart = dateString.split("T")[0]; // Ambil bagian tanggal (YYYY-MM-DD)
    const timePart = dateString.split("T")[1].split(".")[0]; // Ambil bagian waktu (HH:MM:SS)

    // Format menjadi "DD/MM/YYYY, HH:mm:ss"
    const [year, month, day] = datePart.split("-");
    return `${day}/${month}/${year}, ${timePart}`;
}


const DetailHistoryPage = () => {
  const { id } = useParams(); // Mengambil id dari parameter URL
  const [currentPage, setCurrentPage] = useState(1);
  const [dataPerPage, setDataPerPage] = useState(10);
  const [historyDetail, setHistoryDetail] = useState(null); // State for storing history detail data
  const [filteredContacts, setFilteredContacts] = useState([]); // State for storing filtered contacts
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate(-1); // Navigasi ke halaman sebelumnya
  };

  // Fetch detail history data from backend using the ID
  useEffect(() => {
    const fetchHistoryDetail = async () => {
      try {
        const response = await axios.get(`http://localhost:3002/api/history/${id}`);
        setHistoryDetail(response.data); // Store the history detail data
        setFilteredContacts(response.data.contact_list); // Set the contact list for display
      } catch (error) {
        console.error("Failed to fetch history detail", error);
      }
    };

    fetchHistoryDetail();
  }, [id]);

  // Logic untuk Pagination
  const indexOfLastData = currentPage * dataPerPage;
  const indexOfFirstData = indexOfLastData - dataPerPage;
  const currentData = filteredContacts.slice(indexOfFirstData, indexOfLastData);

  const totalPages = Math.ceil(filteredContacts.length / dataPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleDataPerPageChange = (e) => {
    setDataPerPage(Number(e.target.value));
    setCurrentPage(1); // Kembali ke halaman pertama saat mengganti jumlah data
  };

  return (
    <div>
      <div className="container">
        <div className="container-head">
          <FaArrowLeft onClick={handleBackClick} />
          <h1>Detail Riwayat</h1>
        </div>

        {historyDetail ? (
          <>
            <div className="sender-info">
              <div className="sender-left">
                <p>Pengirim : <strong>{historyDetail.contact_name}</strong></p>
                <p>Nomor Pengirim : <strong>{historyDetail.ContactNumber}</strong></p>
              </div>
              <div className="sender-right">
                <p>Berhasil : <strong>{historyDetail.success}</strong> &nbsp;&nbsp;&nbsp; Gagal : <strong>{historyDetail.failed}</strong></p>
                <p>Tanggal & Waktu : <strong>{formatDate(historyDetail.created_at)}</strong></p>
              </div>
            </div>
            <br />
            <div className="sender-info">
              <div className="sender-left">
                <p>Pesan :</p>
              </div>
            </div>
            <div className="message-box">
              <textarea
                id="message"
                placeholder="pesan nya disisni"
                value={historyDetail.message} // Masukkan pesan ke dalam textarea
                disabled={true}
              />
            </div><br />

            <div className="sender-info">
              <div className="sender-left">
                <p>Nomor Penerima :</p>
              </div>
            </div>
            <table className="campaign-table">
              <thead>
                <tr>
                  <th>Nomor Telepon</th>
                </tr>
              </thead>
              <tbody>
                {currentData.length > 0 ? (
                  currentData.map((contact, index) => (
                    <tr key={index} style={{ cursor: "pointer" }}>
                      <td>{contact}</td> {/* Display contact numbers */}
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

            {/* Pagination Controls */}
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
          </>
        ) : (
          <p>Memuat detail riwayat...</p>
        )}
      </div>
    </div>
  );
};

export default DetailHistoryPage;
