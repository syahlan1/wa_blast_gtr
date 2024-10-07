import { useState, useEffect } from "react";
import Select from "react-select";
import { FaSyncAlt } from "react-icons/fa";
import { IoSend } from "react-icons/io5";
import { IoMdClose } from "react-icons/io";
import { FaBold } from "react-icons/fa6";
import { GoItalic } from "react-icons/go";
import { AiOutlineStrikethrough } from "react-icons/ai";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import Swal from 'sweetalert2';
import { useParams, useNavigate } from "react-router-dom"; // Import for campaign_id and redirect

const CampaignMessage = () => {
  const { id } = useParams(); // Mendapatkan campaign_id dari URL
  const navigate = useNavigate(); // Digunakan untuk redirect
  const [isMediaAttached, setIsMediaAttached] = useState(false);
  const [scheduleType, setScheduleType] = useState("now");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [message, setMessage] = useState("");
  const [selectedSender, setSelectedSender] = useState(null); // State for selected sender
  const [senderOptions, setSenderOptions] = useState([]); // State for storing sender options from API
  const [delay, setDelay] = useState(5); // State for delay
  const [file, setFile] = useState(null); // State for selected file
  const [mediaPath, setMediaPath] = useState("");

  // Menghapus file jika "Lampirkan Media" di-uncheck
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
      // Check if all required fields are selected
      if (!selectedSender || !message || !id) {
        Swal.fire({
          icon: 'warning',
          title: 'Oops...',
          text: 'Pengirim, pesan, dan campaign_id harus diisi!',
        });
        return;
      }
  
      const campaignIdInt = parseInt(id, 10);
  
      const payload = {
        session_jid: selectedSender.value,
        campaign_id: campaignIdInt,
        message: message,
        mediaPath: uploadedMediaPath || "",
        delay: delay,
        scheduleTime: scheduleType === "now" ? "" : scheduleType,
      };
  
      const response = await axios.post("http://localhost:3002/api/send-campaign-blast", payload);
      console.log("Pesan berhasil dikirim!", response.data);
  
      setShowConfirmationModal(false); // Close modal after sending the message
  
      Swal.fire({
        icon: 'success',
        text: 'Pesan sedang dalam proses pengiriman.',
      }).then(() => {
        // Redirect ke halaman CampaignPage setelah pesan terkirim
        navigate("/campaign-page");
      });
    } catch (error) {
      console.error("Gagal mengirim pesan:", error);
      
      Swal.fire({
        icon: 'error',
        title: 'Gagal!',
        text: 'Gagal mengirim pesan, silakan coba lagi.',
      });
    }
  };

  const cancelSendMessage = () => {
    setShowConfirmationModal(false);
  };

  return (
    <div>
      <div className="container">
        <div className="container-head">
          <h1>Buat Pesan</h1>
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
                  value={scheduleType === "now" || scheduleType === "schedule" ? scheduleType : "schedule"}
                  onChange={handleScheduleChange}
                >
                  <option value="now">Sekarang</option>
                  <option value="schedule">{scheduleType === "now" || scheduleType === "schedule" ? "Jadwalkan" : scheduleType}</option>
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
            <a className="btn-back" onClick={() => window.location.href = "/campaign-page"}>Kembali</a>
            <button className="btn" type="submit">Kirim Pesan <IoSend /></button>
          </div>
        </form>

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
                <button className="modal-button" onClick={confirmSendMessage}>Kirim <IoSend /></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignMessage;
