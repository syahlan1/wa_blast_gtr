import { useState, useEffect } from "react";
import { FaSearch } from "react-icons/fa";
import { FaRegTrashAlt } from "react-icons/fa";
import { RiPencilFill } from "react-icons/ri";
import { FaUserPlus } from "react-icons/fa6";
import { TbDatabaseSearch } from "react-icons/tb";
import { IoMdClose } from "react-icons/io";
import { FaArrowRight, FaFileCsv } from "react-icons/fa";
import { useParams } from "react-router-dom";
import { IoInformationCircleOutline } from "react-icons/io5";
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import Papa from "papaparse";
import Swal from "sweetalert2";
import axios from "axios";

const CampaignContactPage = () => {
  const { id } = useParams(); 
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dataPerPage, setDataPerPage] = useState(10);
  const [availableContacts, setAvailableContacts] = useState([]); 
  const [filteredContacts, setFilteredContacts] = useState([]); 
  const [searchModalTerm, setSearchModalTerm] = useState(""); 
  const [campaignContacts, setCampaignContacts] = useState([]); 
  const [campaignName, setCampaignName] = useState(""); 
  const [createContactModal, setCreateContactModal] = useState(false); 
  const [newContactNumber, setNewContactNumber] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [editContactModal, setEditContactModal] = useState(false); 
  const [editedContact, setEditedContact] = useState(null); 
  const [originalNumber, setOriginalNumber] = useState(""); // Menyimpan nomor asli kontak
  const [showAvailableNumbersModal, setShowAvailableNumbersModal] = useState(false); 
  const [selectedContacts, setSelectedContacts] = useState([]); 
  const [uploadCSVModal, setUploadCSVModal] = useState(false); // State untuk modal upload CSV
  const [csvFile, setCsvFile] = useState(null); // State untuk menyimpan file CSV

  const handleCSVUpload = () => {
    if (!csvFile) {
      Swal.fire({
        title: "Gagal!",
        text: "Pilih file CSV terlebih dahulu.",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    // Gunakan FileReader untuk membaca file secara asinkron
    const reader = new FileReader();

    reader.onload = function (e) {
      const csvData = e.target.result;
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          const data = results.data;
          if (data.length > 0 && data[0].name && data[0].number) {
            setCampaignContacts([...campaignContacts, ...data]); // Tambahkan data CSV ke state
            setCsvFile(null); // Reset file picker
            setUploadCSVModal(false); // Tutup modal
            Swal.fire({
              title: "Berhasil!",
              text: "Kontak berhasil diunggah dari CSV.",
              icon: "success",
              confirmButtonText: "OK",
            });
          } else {
            Swal.fire({
              title: "Gagal!",
              text: "File CSV harus memiliki kolom 'name' dan 'number'.",
              icon: "error",
              confirmButtonText: "OK",
            });
          }
        },
        error: function (error) {
          console.error("Error parsing CSV:", error);
          Swal.fire({
            title: "Gagal!",
            text: "Terjadi kesalahan saat membaca file CSV.",
            icon: "error",
            confirmButtonText: "OK",
          });
        },
      });
    };

    reader.onerror = function () {
      Swal.fire({
        title: "Gagal!",
        text: "Tidak dapat membaca file CSV.",
        icon: "error",
        confirmButtonText: "OK",
      });
    };

    reader.readAsText(csvFile);
  };

  // Fungsi untuk menangani file input
  const handleFileChange = (e) => {
    setCsvFile(e.target.files[0]);
  };

  useEffect(() => {
    const fetchCampaignData = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:3002/api/get-campaign/${id}`);
        setCampaignName(response.data.name); 
        setCampaignContacts(response.data.contacts); 
      } catch (error) {
        console.error("Failed to fetch campaign data", error);
      }
    };

    fetchCampaignData();
  }, [id]);

  useEffect(() => {
    const fetchAvailableContacts = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:3002/api/get-available-contacts");
        setAvailableContacts(response.data); 
        setFilteredContacts(response.data); 
      } catch (error) {
        console.error("Failed to fetch available contacts", error);
      }
    };

    fetchAvailableContacts();
  }, []);

  const filteredCampaigns = campaignContacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.number.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  // Tambah Manual Kontak
  const confirmCreate = () => {
    const newContact = {
      number: newContactNumber,
      name: newContactName,
    };
    setCampaignContacts([...campaignContacts, newContact]); 
    setNewContactNumber(""); 
    setNewContactName("");
    setCreateContactModal(false); 
  };

  // Handle delete contact from table berdasarkan nomor telepon
  const handleDeleteContact = (number) => {
    setCampaignContacts(campaignContacts.filter((contact) => contact.number !== number));
  };

  // Buka modal edit dan set kontak yang sedang diedit
  const handleEditContact = (contact) => {
    setEditedContact(contact); 
    setOriginalNumber(contact.number); // Simpan nomor asli
    setEditContactModal(true); 
  };

  // Simpan perubahan kontak yang diedit
  const saveEditedContact = () => {
    setCampaignContacts((prevContacts) =>
      prevContacts.map((contact) =>
        contact.number === originalNumber ? editedContact : contact
      )
    );
    setEditContactModal(false); 
  };

  const handleCheckboxChange = (contact) => {
    if (selectedContacts.some((c) => c.number === contact.number)) {
      setSelectedContacts(selectedContacts.filter((c) => c.number !== contact.number)); 
    } else {
      setSelectedContacts([...selectedContacts, contact]); 
    }
  };

  const handleSelectContacts = () => {
    setCampaignContacts((prevContacts) => {
      const newContacts = selectedContacts.filter(
        (contact) => !prevContacts.some((campaignContact) => campaignContact.number === contact.number)
      );
      return [...prevContacts, ...newContacts]; 
    });
    setSelectedContacts([]); 
    setShowAvailableNumbersModal(false); 
  };

  useEffect(() => {
    const filtered = availableContacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(searchModalTerm.toLowerCase()) ||
        contact.number.includes(searchModalTerm)
    );
    setFilteredContacts(filtered);
  }, [searchModalTerm, availableContacts]);

  const handleSaveContacts = async (navigateTo) => {
    try {
      const response = await axios.put(`http://127.0.0.1:3002/api/update-campaign/${id}`, {
        contacts: campaignContacts,
      });
  
      if (response.status === 200) {
        if (navigateTo === "back") {
          window.location.href = "/campaign-page"; 
        } else if (navigateTo === "sendMessage") {
          window.location.href = `/campaign-message/${id}`; 
        }
      } else {
        console.error("Gagal menyimpan kontak");
      }
    } catch (error) {
      console.error("Error menyimpan kontak:", error);
    }
  };

  return (
    <div>
      <div className="container">
        <div className="container-head">
          <h1>{campaignName} ({filteredCampaigns.length})</h1>
          <button className="btn-back" onClick={() => window.location.href = "/campaign-page"}>
            Kembali
          </button>
          <button className="btn" onClick={() => handleSaveContacts("back")}>
            Simpan & Kembali
          </button>
          <button className="btn" onClick={() => handleSaveContacts("sendMessage")}>
            Buat Pesan <FaArrowRight />
          </button>
        </div>
        
        <div className="campaign-page">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Cari Kontak"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i className="search-icon"><FaSearch /></i>
          </div>
          <div className="container-action">
            <a onClick={() => setCreateContactModal(true)}>
              <button className="btn">
                <FaUserPlus />
                Tambah Manual
              </button>
            </a>
            <a onClick={() => setUploadCSVModal(true)}>
              <button className="btn">
                <FaFileCsv />
                Unggah CSV
              </button>
            </a>
            <a onClick={() => setShowAvailableNumbersModal(true)}>
              <button className="btn">
                <TbDatabaseSearch />
                Nomor Tersedia
              </button>
            </a>
          </div>

          <table className="campaign-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Nomor Telepon</th>
                <th>Nama</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length > 0 ? (
                currentData.map((contact, index) => (
                  <tr key={contact.number}>
                    <td>{indexOfFirstData + index + 1}</td>
                    <td>{contact.number}</td>
                    <td>{contact.name}</td>
                    <td className="action-icons">
                      <button
                        className="btn delete-btn"
                        onClick={() => handleDeleteContact(contact.number)}
                      >
                        <FaRegTrashAlt />
                      </button>
                      <button
                        className="btn edit-btn"
                        onClick={() => handleEditContact(contact)}
                      >
                        <RiPencilFill />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
                    Tidak ada Kontak ditemukan
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
        </div>

        {/* Modal untuk Tambah Manual */}
        {createContactModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Tambah Kontak</h3>
                <IoMdClose className="close-icon" onClick={() => setCreateContactModal(false)} />
              </div>
              <div>
                <input
                  type="text"
                  id="contact-name"
                  placeholder="Masukkan nama kontak"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="datepicker-input"
                />
              </div>
              <div>
                <input
                  type="number"
                  id="contact-number"
                  placeholder="Masukkan nomor telepon"
                  value={newContactNumber}
                  onChange={(e) => setNewContactNumber(e.target.value)}
                  className="datepicker-input"
                />
              </div>
              <small>*Pastikan nomor telepon menggunakan kode negara di depannya,<br /> contoh: 6281234567890</small>
              <div className="button-action">
                <button className="btn-back" onClick={() => setCreateContactModal(false)}>
                  Batal
                </button>
                <button className="modal-button" onClick={confirmCreate}>
                  Tambah Kontak
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal untuk Edit Kontak */}
        {editContactModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Edit Kontak</h3>
                <IoMdClose className="close-icon" onClick={() => setEditContactModal(false)} />
              </div>
              <div>
                <input
                  type="text"
                  id="edit-contact-name"
                  placeholder="Masukkan nama kontak"
                  value={editedContact?.name || ""}
                  onChange={(e) =>
                    setEditedContact({ ...editedContact, name: e.target.value })
                  }
                  className="datepicker-input"
                />
              </div>
              <div>
                <input
                  type="number"
                  id="edit-contact-number"
                  placeholder="Masukkan nomor telepon"
                  value={editedContact?.number || ""}
                  onChange={(e) =>
                    setEditedContact({
                      ...editedContact,
                      number: e.target.value,
                    })
                  }
                  className="datepicker-input"
                />
              </div>
              <div className="button-action">
                <button className="btn-back" onClick={() => setEditContactModal(false)}>
                  Batal
                </button>
                <button className="modal-button" onClick={saveEditedContact}>
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal untuk Pilih Nomor Tersedia */}
        {showAvailableNumbersModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Pilih Nomor Tersedia</h3>
                <IoMdClose
                  className="close-icon"
                  onClick={() => setShowAvailableNumbersModal(false)}
                />
              </div>
              <div className="modal-body">
                <div className="search-container-modal">
                  <input
                    type="text"
                    placeholder="Cari nomor atau nama"
                    value={searchModalTerm}
                    onChange={(e) => setSearchModalTerm(e.target.value)}
                    className="search-input"
                  />
                  <i className="search-icon">
                    <FaSearch />
                  </i>
                </div>
                <p>Kontak terpilih: {selectedContacts.length}</p>
                <div className="checkbox-scrollable">
                  {filteredContacts.map((contact) => (
                    <div key={contact.number} className="checkbox-container">
                      <input
                        type="checkbox"
                        id={`contact-${contact.number}`}
                        checked={selectedContacts.some((c) => c.number === contact.number)}
                        onChange={() => handleCheckboxChange(contact)}
                      />
                      <label htmlFor={`contact-${contact.number}`}>
                        {contact.number} - {contact.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={handleSelectContacts}>
                  Pilih
                </button>
                <button
                  className="btn-back"
                  onClick={() => setShowAvailableNumbersModal(false)}
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

      {uploadCSVModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Unggah Kontak CSV</h3>
              <IoMdClose className="close-icon" onClick={() => setUploadCSVModal(false)} />
            </div>
            <div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="datepicker-input"
              />
            <Tippy content={<img src="/img/assets/csv_guide.png" alt="Tooltip Image" />}>
                <a><IoInformationCircleOutline/></a>
            </Tippy>
            </div>
            <div className="button-action">
              <button className="btn-back" onClick={() => setUploadCSVModal(false)}>
                Batal
              </button>
              <button className="modal-button" onClick={handleCSVUpload}>
                Unggah
              </button>
            </div>
          </div>
        </div>
      )}
        
      </div>
    </div>
  );
};

export default CampaignContactPage;
