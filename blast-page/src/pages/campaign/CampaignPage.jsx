import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import { FaRegTrashAlt } from "react-icons/fa";
import { RiPencilFill, RiAddLargeLine } from "react-icons/ri";
import { LuSendHorizonal } from "react-icons/lu";
import { IoMdClose } from "react-icons/io";
import axios from "axios";
import Swal from "sweetalert2";

const CampaignPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dataPerPage, setDataPerPage] = useState(10);
  const [campaigns, setCampaigns] = useState([]); // Default to an empty array
  const [createCampaignModal, setCreateCampaignModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [createMessage, setCreateMessage] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteCampaignModal, setDeleteCampaignModal] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState(null);

  // Fetch data campaign dari API
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:3002/api/get-campaign");
        setCampaigns(response.data || []); // Ensure it's always an array
      } catch (error) {
        console.error("Failed to fetch campaigns", error);
      }
    };
    fetchCampaigns();
  }, []);

  const confirmDelete = (campaign) => {
    setDeleteCampaignModal(true);
    setCampaignToDelete(campaign);
  };

  // Fungsi untuk menghapus campaign dari backend
  const handleDeleteCampaign = async () => {
    if (campaignToDelete) {
      try {
        await axios.delete(`http://127.0.0.1:3002/api/delete-campaign/${campaignToDelete.id}`);
        setDeleteMessage("Campaign berhasil dihapus.");
        setCampaigns((prevCampaigns) =>
          prevCampaigns.filter((campaign) => campaign.id !== campaignToDelete.id)
        );
        setDeleteCampaignModal(false);
        setCampaignToDelete(null);

        Swal.fire({
          title: 'Berhasil!',
          text: `Campaign "${campaignToDelete.name}" berhasil dihapus.`,
          icon: 'success',
          confirmButtonText: 'OK',
        }).then(() => {
          window.location.reload(); // Refresh halaman setelah delete
        });
      } catch (error) {
        console.error("Gagal menghapus campaign:", error);
        Swal.fire({
          title: 'Gagal!',
          text: `Gagal menghapus campaign "${campaignToDelete.name}".`,
          icon: 'error',
          confirmButtonText: 'OK',
        });
      }
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Logic untuk Pagination
  const indexOfLastData = currentPage * dataPerPage;
  const indexOfFirstData = indexOfLastData - dataPerPage;
  const currentData = filteredCampaigns.slice(indexOfFirstData, indexOfLastData);

  const totalPages = Math.ceil(filteredCampaigns.length / dataPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleDataPerPageChange = (e) => {
    setDataPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleCreateCampaign = () => {
    setCreateCampaignModal(true);
  };

  const confirmCreate = async () => {
    if (newCampaignName.trim() === "") {
      Swal.fire({
        title: 'Error!',
        text: 'Nama campaign harus diisi!',
        icon: 'error',
        confirmButtonText: 'OK',
      });
      return;
    }

    try {
      // Kirim request ke backend untuk membuat campaign baru
      await axios.post("http://127.0.0.1:3002/api/create-campaign", {
        name: newCampaignName,
      });

      // Tampilkan alert sukses
      Swal.fire({
        title: 'Berhasil!',
        text: `Campaign "${newCampaignName}" berhasil dibuat.`,
        icon: 'success',
        confirmButtonText: 'OK',
      }).then(() => {
        window.location.reload(); // Refresh halaman setelah campaign dibuat
      });

      // Reset form dan tutup modal
      setCreateCampaignModal(false);
      setNewCampaignName("");
    } catch (error) {
      console.error("Error creating campaign:", error);
      Swal.fire({
        title: 'Gagal!',
        text: `Gagal membuat campaign "${newCampaignName}".`,
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  };

  const cancelCreate = () => {
    setCreateCampaignModal(false);
    setNewCampaignName("");
  };

  return (
    <div>
      <div className="container">
        <div className="container-head">
          <h1>Daftar Kampanye ({filteredCampaigns.length})</h1>
          <a onClick={handleCreateCampaign}>
            <RiAddLargeLine />
            <p>Buat Kampanye Baru</p>
          </a>
        </div>

        {createMessage && <div className="success-message">{createMessage}</div>}

        <div className="campaign-page">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Cari Campaign"
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
                <th>No.</th>
                <th>Nama Kampanye</th>
                <th>Jumlah Kontak</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length > 0 ? (
                currentData.map((campaign, index) => (
                  <tr key={campaign.id}>
                    <td>{indexOfFirstData + index + 1}</td>
                    <td>{campaign.name}</td>
                    <td>{campaign.contact_count}</td>
                    <td className="action-icons">
                      <button
                        className="btn delete-btn"
                        onClick={() => confirmDelete(campaign)}
                      >
                        <FaRegTrashAlt />
                      </button>
                      <Link to={`/campaign-contact/${campaign.id}`}>
                        <button className="btn edit-btn">
                          <RiPencilFill />
                        </button>
                      </Link>
                      <Link to={`/campaign-message/${campaign.id}`}>
                        <button className="btn send-btn">
                          <LuSendHorizonal />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
                    Tidak ada kampanye ditemukan
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

        {createCampaignModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Buat Kampanye</h3>
                <IoMdClose
                  className="close-icon"
                  onClick={cancelCreate}
                />
              </div>
              <div>
                <input
                  type="text"
                  id="campaign-name"
                  placeholder="Masukkan nama campaign"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="datepicker-input"
                />
              </div>
              <div className="button-action">
                <button className="btn-back" onClick={cancelCreate}>
                  Batal
                </button>
                <button className="modal-button" onClick={confirmCreate}>
                  Tambah Kampanye
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteCampaignModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Konfirmasi Hapus</h3>
                <IoMdClose
                  className="close-icon"
                  onClick={() => setDeleteCampaignModal(false)}
                />
              </div>
              <div className="modal-body">
                <p>
                  Apakah Anda yakin ingin menghapus campaign "
                  {campaignToDelete?.name}"?
                </p>
              </div>
              <div className="button-action">
                <button
                  className="btn-back"
                  onClick={() => setDeleteCampaignModal(false)}
                >
                  Batal
                </button>
                <button className="modal-button" onClick={handleDeleteCampaign}>
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

export default CampaignPage;
