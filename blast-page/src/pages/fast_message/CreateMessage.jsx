import { useState, useEffect } from "react";
import { FaSearch,FaArrowRight, FaSyncAlt } from "react-icons/fa";
import Select from "react-select";
import "react-datepicker/dist/react-datepicker.css";
import { AiOutlineStrikethrough } from "react-icons/ai";
import { GoItalic } from "react-icons/go";
import { FaBold } from "react-icons/fa6";
import { FaArrowLeft } from "react-icons/fa6";
import { FaRegTrashAlt, FaFileCsv } from "react-icons/fa";
import { RiPencilFill } from "react-icons/ri";
import { FaUserPlus } from "react-icons/fa6";
import { TbDatabaseSearch } from "react-icons/tb";
import { IoMdClose } from "react-icons/io";
import { IoSend } from "react-icons/io5";
import DatePicker from "react-datepicker";
import { useNavigate } from "react-router-dom";
import { IoInformationCircleOutline } from "react-icons/io5";
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import Swal from 'sweetalert2';
import Papa from "papaparse";
import axios from "axios";

const CreateMessage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dataPerPage, setDataPerPage] = useState(10);

  const [availableContacts, setAvailableContacts] = useState([]); // Data dari API
  const [filteredContacts, setFilteredContacts] = useState([]); // Data yang difilter
  const [searchModalTerm, setSearchModalTerm] = useState(""); // Pencarian di modal
  const [contacts, setContacts] = useState([]);
  

  const filteredCampaigns = contacts.filter(
    (campaign) =>
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [createContactModal, setCreateContactModal] = useState(false); // Modal Tambah Kontak
  const [newContactNumber, setNewContactNumber] = useState("");
  const [newContactName, setNewContactName] = useState("");

  const [editContactModal, setEditContactModal] = useState(false); // Modal Edit Kontak
  const [editedContact, setEditedContact] = useState({ name: "", number: "" }); // Kontak yang sedang diedit
  const [editedContactIndex, setEditedContactIndex] = useState(null);
  
  const [showAvailableNumbersModal, setShowAvailableNumbersModal] = useState(false); // Modal Nomor Tersedia
  const [selectedContacts, setSelectedContacts] = useState([]); // Kontak yang dipilih
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
            setContacts([...contacts, ...data]); // Tambahkan data CSV ke state
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
  const handleCSVChange = (e) => {
    setCsvFile(e.target.files[0]);
  };

  useEffect(() => {
    const fetchAvailableContacts = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:3002/api/get-available-contacts");
        setAvailableContacts(response.data); // Data kontak tersedia
        setFilteredContacts(response.data); // Set data kontak untuk filter di modal
      } catch (error) {
        console.error("Failed to fetch available contacts", error);
      }
    };

    fetchAvailableContacts();
  }, []);

  const indexOfLastData = currentPage * dataPerPage;
  const indexOfFirstData = indexOfLastData - dataPerPage;
  const currentData = filteredCampaigns.slice(indexOfFirstData, indexOfLastData);

  const totalPages = Math.ceil(filteredCampaigns.length / dataPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleDataPerPageChange = (e) => {
    setDataPerPage(Number(e.target.value));
    setCurrentPage(1); // Kembali ke halaman pertama saat mengganti jumlah data
  };

  // Tambah Manual Kontak
  const confirmCreate = () => {
    const newContact = {
      id: contacts.length + 1, // Simulasi ID baru
      number: newContactNumber,
      name: newContactName,
    };
    setContacts([...contacts, newContact]); // Tambahkan kontak baru ke tabel
    setNewContactNumber(""); // Reset form
    setNewContactName("");
    setCreateContactModal(false); // Tutup modal
  };

  // Handle delete contact from table
  const handleDeleteContact = (index) => {
    const updatedContacts = contacts.filter((_, i) => i !== index); // Hapus berdasarkan index
    setContacts(updatedContacts);
  };

  // Buka modal edit dan set kontak yang sedang diedit
  const handleEditContact = (contact, index) => {
    setEditedContact(contact); // Set kontak yang diedit
    setEditedContactIndex(index); // Simpan index kontak yang diedit
    setEditContactModal(true); // Buka modal edit
  };

  // Simpan perubahan kontak yang diedit
  const saveEditedContact = () => {
    const updatedContacts = contacts.map((contact, i) =>
      i === editedContactIndex ? editedContact : contact // Perbarui kontak yang diedit berdasarkan index
    );
    setContacts(updatedContacts); // Update state contacts
    setEditContactModal(false); // Tutup modal setelah menyimpan
  };

  // Handle checkbox selection untuk modal Nomor Tersedia
  const handleCheckboxChange = (contact) => {
    if (selectedContacts.some((c) => c.id === contact.id)) {
      setSelectedContacts(selectedContacts.filter((c) => c.id !== contact.id)); // Uncheck
    } else {
      setSelectedContacts([...selectedContacts, contact]); // Add contact to selected list
    }
  };

  // Handle "Pilih" button: Tambahkan ke tabel
  const handleSelectContacts = () => {
    setContacts((prevCampaigns) => {
      // Filter untuk memastikan kontak yang sama tidak ditambahkan dua kali
      const newCampaigns = selectedContacts.filter(
        (contact) => !prevCampaigns.some((campaign) => campaign.id === contact.id)
      );
      return [...prevCampaigns, ...newCampaigns]; // Gabungkan kampanye lama dan kontak baru
    });
    setSelectedContacts([]); // Kosongkan pilihan setelah ditambahkan
    setShowAvailableNumbersModal(false); // Tutup modal
  };

  // Filter kontak di modal ketika ada pencarian
  useEffect(() => {
    const filtered = availableContacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(searchModalTerm.toLowerCase()) ||
        contact.number.includes(searchModalTerm)
    );
    setFilteredContacts(filtered);
  }, [searchModalTerm, availableContacts]);


  const [step, setStep] = useState(1); // 1 for contact step, 2 for message step

  const handleNextStep = () => {
    setStep(2);
  };

  const handlePreviousStep = () => {
    setStep(1);
  };

  // ini bagian pengisian pesan
  const navigate = useNavigate(); // Digunakan untuk redirect
  const [isMediaAttached, setIsMediaAttached] = useState(false);
  const [scheduleType, setScheduleType] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [message, setMessage] = useState("");
  const [selectedSender, setSelectedSender] = useState(null); // State for selected sender
  const [senderOptions, setSenderOptions] = useState([]); // State for storing sender options from API
  const [delay, setDelay] = useState(5); // State for delay
  const [file, setFile] = useState(null); // State for selected file
  const [mediaPath, setMediaPath] = useState("");

  // File input toggle based on isMediaAttached
  const handleMediaChange = () => {
    setIsMediaAttached(!isMediaAttached);
    if (!isMediaAttached) {
      setFile(null); // Menghapus file jika checkbox dicentang
      setMediaPath(""); // Menghapus path file
    }
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  // Fungsi untuk mengunggah file ke backend
  const uploadFile = async () => {
    if (!file) {
      return null; // Jika tidak ada file yang diunggah
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:3002/api/upload-file", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMediaPath(response.data.filePath); // Simpan path file dari respons
      return response.data.filePath;
    } catch (error) {
      console.error("Failed to upload file:", error);
      return null;
    }
  };

  // Fetch sender options from API
  useEffect(() => {
    const fetchSenders = async () => {
      try {
        const response = await axios.get("http://localhost:3002/api/get-devices");
        const mappedOptions = response.data.map((device) => ({
          value: device.jid,
          label: (
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '14px' }}>
              <span style={{ fontWeight: 'bold' }}>{device.contact_name}</span>
              <span style={{ fontSize: '12px', color: '#888' }}>{device.contact_number}</span>
            </div>
          ),
          contactName: device.contact_name,
          phoneNumber: device.contact_number,
        }));
        setSenderOptions(mappedOptions); // Set mapped sender options
      } catch (error) {
        console.error("Failed to fetch senders:", error);
      }
    };

    fetchSenders();
  }, []);

  // Handle Date Picker Modal
  const handleScheduleChange = (e) => {
    const value = e.target.value;
    if (value === "schedule") {
      setShowDatePicker(true); // Open modal if "Jadwalkan" is chosen
    } else {
      setScheduleType(value); // Set "Sekarang" if chosen
    }
  };

  const handlePickSchedule = () => {
    if (selectedDate) {
      // Pastikan zona waktu yang sesuai
      const localDateTime = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000)).toISOString();
      setScheduleType(localDateTime);
    }
    setShowDatePicker(false); // Menutup modal setelah pemilihan tanggal
  };


  // Refresh message text
  const handleRefreshMessage = () => {
    setMessage("");
  };

  const handleBoldText = () => setMessage((prev) => prev + "**");
  const handleItalicText = () => setMessage((prev) => prev + "__");
  const handleStrikeThrougtText = () => setMessage((prev) => prev + "~~");

  const filterOption = (option, inputValue) => {
    const contactName = option.data.contactName.toLowerCase();
    const phoneNumber = option.data.phoneNumber.toLowerCase();
    const searchInput = inputValue.toLowerCase();

    return (
      contactName.includes(searchInput) || phoneNumber.includes(searchInput)
    );
  };

  const handleSendMessage = (e) => {
    e.preventDefault(); // Mencegah halaman refresh
    setShowConfirmationModal(true); // Show confirmation modal when "Kirim Pesan" is clicked
  };

  const confirmSendMessage = async () => {
    const uploadedMediaPath = await uploadFile();
  
    try {
      // Ambil nomor telepon dari daftar kontak yang telah ditambahkan
      const toNumbers = contacts.map((contact) => contact.number);
  
      if (!selectedSender || !message || toNumbers.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Oops...',
          text: 'Pengirim, pesan, dan kontak harus diisi!',
        });
        return;
      }
  
      const payload = {
        session_jid: selectedSender.value, // JID pengirim yang dipilih
        to_numbers: toNumbers, // Daftar nomor telepon dari tabel kontak
        message: message, // Pesan dari textarea
        mediaPath: uploadedMediaPath || "", // Path file media jika ada
        delay: delay, // Delay
        scheduleTime: scheduleType === "" ? "" : scheduleType, // Waktu penjadwalan jika ada
      };
  
      const response = await axios.post("http://localhost:3002/api/send-blast", payload);
      console.log("Pesan berhasil dikirim!", response.data);
  
      setShowConfirmationModal(false); // Tutup modal setelah pesan dikirim
  
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Pesan sedang dalam proses pengiriman.',
        confirmButtonText: 'OK',
      }).then(() => {
        // Redirect ke halaman CampaignPage setelah pesan terkirim
        navigate("/create-message");
      });
    } catch (error) {
      console.error("Gagal mengirim pesan:", error);
  
      Swal.fire({
        icon: 'error',
        title: 'Gagal!',
        text: 'Gagal mengirim pesan, silakan coba lagi.',
        confirmButtonText: 'OK',
      });
    }
  };

  const cancelSendMessage = () => {
    setShowConfirmationModal(false);
  };

  // Render different forms based on step
  return (
    <div>
      {step === 1 && (
        <div className="container">
          <div className="container-head">
          <h1>Masukkan Kontak ({filteredCampaigns.length})</h1>
            <button className="btn" onClick={handleNextStep} disabled={filteredCampaigns.length === 0}>Buat Pesan <FaArrowRight /></button>
        </div>

        <div className="campaign-page">
          {/* Search Bar */}
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Cari Kontak"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i className="search-icon">
              <FaSearch />
            </i>
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

          {/* Tabel Kampanye */}
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
                currentData.map((campaign, index) => (
                  <tr key={index}>
                    <td>{indexOfFirstData + index + 1}</td>
                    <td>{campaign.number}</td>
                    <td>{campaign.name}</td>
                    <td className="action-icons">
                      <button
                        className="btn delete-btn"
                        onClick={() => handleDeleteContact(indexOfFirstData + index)}
                      >
                        <FaRegTrashAlt />
                      </button>
                      <button
                        className="btn edit-btn"
                        onClick={() => handleEditContact(campaign, indexOfFirstData + index)}
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
                  onChange={handleCSVChange}
                  className="datepicker-input"
                />
                <Tippy content={<img src="/img/assets/csv_guide.png" alt="Tooltip Image" />}>
                  <a><IoInformationCircleOutline /></a>
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
              <small>*Pastikan nomor telepon menggunakan kode negara di depannya,<br/> contoh: 6281234567890</small>
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
                    <div key={contact.id} className="checkbox-container">
                      <input
                        type="checkbox"
                        id={`contact-${contact.id}`}
                        checked={selectedContacts.some((c) => c.id === contact.id)}
                        onChange={() => handleCheckboxChange(contact)}
                      />
                      <label htmlFor={`contact-${contact.id}`}>
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
      </div>
      )}

      {/* ini halaman pengisian pesan nya */}
      {step === 2 && (
        <div className="container">
        <div className="container-head">
            <h1>Buat Pesan</h1>
            <button className="btn" onClick={handlePreviousStep}><FaArrowLeft /> Sebelumnya</button>
          </div>
          <form className="message-form" onSubmit={handleSendMessage}>
          <div className="form-row">
            <div className="sender-schedule-container">
              <div className="form-group">
                <label htmlFor="sender">Pengirim</label>
                <Select
                  id="sender"
                  options={senderOptions}
                  value={selectedSender}
                  onChange={setSelectedSender}
                  placeholder="Pilih Pengirim"
                  isSearchable
                  filterOption={filterOption}
                />
              </div>

              <div className="form-group">
                <label htmlFor="schedule">Penjadwalan</label>
                <select
                  id="schedule"
                  value={scheduleType === "" || scheduleType === "schedule" ? scheduleType : "schedule"}
                  onChange={handleScheduleChange}
                >
                  <option value="">Sekarang</option>
                  <option value="schedule">{scheduleType === "" || scheduleType === "schedule" ? "Jadwalkan" : scheduleType}</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="delay">Jeda Pesan</label>
                <select id="delay" onChange={(e) => setDelay(Number(e.target.value))}>
                  {Array.from({ length: 60 }, (_, i) => i + 1).map((second) => (
                    <option key={second} value={second}>
                      {second} detik
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="lampirkan-media">
            <p>Lampirkan Media</p>
            <input type="checkbox" id="attach-media" checked={isMediaAttached} onChange={handleMediaChange} />
          </div>

          {isMediaAttached && (
            <div className="form-row">
              <div className="media-box">
                <input type="file" onChange={handleFileChange} />
              </div>
            </div>
          )}

          <div className="form-row">
            <p>Ketik Pesan</p>
            <div className="message-box">
              <textarea
                id="message"
                placeholder="Masukkan pesan di sini"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <FaSyncAlt className="refresh-icon" onClick={handleRefreshMessage} />
            </div>
          </div>

          <div className="form-row text-options">
            <button type="button" onClick={handleBoldText}><FaBold /></button>
            <button type="button" onClick={handleItalicText}><GoItalic /></button>
            <button type="button" onClick={handleStrikeThrougtText}><AiOutlineStrikethrough /></button>
          </div>

          <div className="container-action">
            <button className="btn" type="submit">Kirim Pesan <IoSend /></button>
          </div>
        </form>
  
          {/* Modal for Date & Time Picker */}
          {showDatePicker && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Pilih Waktu Penjadwalan</h3>
                <IoMdClose className="close-icon" onClick={() => setShowDatePicker(false)} />
              </div>
              <div>
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={5}
                  dateFormat="Pp"
                  minDate={new Date()}
                  placeholderText="Pilih tanggal dan waktu"
                  className="datepicker-input"
                  timeZone="Asia/Jakarta"
                />
              </div>
              <div className="button-action">
                <button className="modal-button" onClick={handlePickSchedule}>Pilih Tanggal</button>
              </div>
            </div>
          </div>
        )}
  
        {showConfirmationModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Kirim Pesan?</h3>
                <IoMdClose className="close-icon" onClick={cancelSendMessage} />
              </div>
              <div className="modal-body">
                <p>Pastikan nomor dan pesan sudah sesuai</p>
              </div>
              <div className="button-action">
                <button className="btn-back" onClick={cancelSendMessage}>Batal</button>
                <button className="modal-button" onClick={confirmSendMessage}>Kirim <IoSend/></button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default CreateMessage;
