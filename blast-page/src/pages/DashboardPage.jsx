import "../dist/css/style.css";
import { RiAddLargeLine } from "react-icons/ri";
import { GiSmartphone } from "react-icons/gi";
import { useState, useEffect } from "react";
import {QRCodeSVG} from 'qrcode.react';
import { IoMdClose } from "react-icons/io";
import axios from 'axios';

const DashboardPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [contactName, setContactName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [qrCodeData, setQrCodeData] = useState("");
  const [loading, setLoading] = useState(false);
  const [campaignCount, setCampaignCount] = useState("");
  const [devices, setDevices] = useState([]);
  const [selectedDeviceJid, setSelectedDeviceJid] = useState(null);  // Untuk JID perangkat yang ingin di-disconnect
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);  // Untuk menampilkan modal konfirmasi disconnect
  const [disconnectSuccess, setDisconnectSuccess] = useState(false);  // Untuk menampilkan pesan sukses

  // Ambil data perangkat saat komponen di-mount
  const fetchDevices = async () => {
    try {
      const response = await axios.get("http://localhost:3002/api/get-devices");
      setDevices(response.data);  // Menyimpan data perangkat ke state
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    }
  };

  useEffect(() => {
    fetchDevices();  // Ambil data perangkat saat komponen di-mount
  }, []);

  useEffect(() => {
    const fetchCampaignCount = async () => {
      try {
        const response = await axios.get('http://localhost:3002/api/count-campaigns');
        setCampaignCount(response.data.total_campaigns);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch campaign count:' , error);
        setLoading(false);
      }
    };

    fetchCampaignCount();
  }, []);

  // Buka modal untuk menambahkan perangkat baru
  const openModal = () => {
    setShowModal(true);
    setStep(1);
  };

  // Tutup modal dan reset state
  const closeModal = () => {
    setShowModal(false);
    setContactName("");
    setPhoneNumber("");
    setQrCodeData("");
  };

  // Handle "Next" untuk mendapatkan QR code
  const handleNext = async () => {
    if (contactName && phoneNumber) {
      setLoading(true);
      try {
        const response = await axios.post("http://localhost:3002/api/create-session", {
          contact_name: contactName,
          contact_number: phoneNumber,
        });

        if (response.data && response.data.qr_code) {
          setStep(2);  // Pindah ke step 2 jika respons berisi QR code
          setQrCodeData(response.data.qr_code);  // Ambil QR code dari respons backend
        } else {
          console.error("QR code not found in response");
        }
      } catch (error) {
        console.error("Failed to fetch QR code:", error);
      } finally {
        setLoading(false);  // Reset loading state setelah selesai
      }
    } else {
      alert("Nama kontak dan nomor telepon harus diisi.");
    }
  };

  // Handle untuk klik disconnect, buka modal konfirmasi
  const handleDisconnectClick = (jid) => {
    setSelectedDeviceJid(jid);
    setShowDisconnectModal(true);
  };

  // Tutup modal konfirmasi disconnect
  const closeDisconnectModal = () => {
    setShowDisconnectModal(false);
    setSelectedDeviceJid(null);
    setDisconnectSuccess(false);
  };

  // Konfirmasi disconnect, panggil API dan hapus perangkat dari daftar
  const handleConfirmDisconnect = async () => {
    setLoading(true);
    try {
      await axios.post("http://localhost:3002/api/delete-session", {
        session_jid: selectedDeviceJid
      });
      setDevices(devices.filter(device => device.jid !== selectedDeviceJid));  // Hapus perangkat dari state
      setDisconnectSuccess(true);  // Tampilkan pesan sukses

      // Tutup modal setelah 2 detik
      setTimeout(() => {
        closeDisconnectModal();
      }, 2000);
    } catch (error) {
      console.error("Failed to disconnect device:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="button-container">
        <a href="/create-message">
          <div className="button-box">
            <i className="icon"><img src="/img/assets/fast-message.png" alt="Clock Icon" /></i>
            <span>Kirim Pesan Cepat</span>
          </div>
        </a>

        <a href="/campaign-page">
          <div className="button-box">
            <i className="icon"><img src="/img/assets/toa.png" alt="Campaign Icon" /></i>
            <span>Kampanye</span>
            <div className="badge">{campaignCount}</div>
          </div>
        </a>
      </div>

      <div className="container">
        <div className="container-head">
          <h1>Daftar Perangkat Tertaut ({devices.length})</h1>  {/* Jumlah kontak tersambung */}
          <a onClick={openModal}><RiAddLargeLine /> <p>Tambah Perangkat</p></a>
        </div>

        <div className="device-list">
          {devices.length > 0 ? (
            devices.map((device, index) => (
              <div className="device-row" key={index}>
                <div className="device-info">
                  <div className="device-icon">
                    <i><GiSmartphone /></i>
                  </div>
                  <div className="device-details">
                    <div className="device-label">
                      <p className="device-name">{device.contact_name || "Tidak ada nama"}</p>
                      <p className="device-number">- {device.contact_number || "Tidak ada nomor"}</p>
                    </div>
                    <p className="device-status">
                      {device.success} Pesan Terkirim, {device.failed} Gagal
                    </p>
                  </div>
                </div>
                <a className="action-button disconnect-btn" onClick={() => handleDisconnectClick(device.jid)}>Disconnect</a>
              </div>
            ))
          ) : (
            <p>Tidak ada perangkat yang terhubung.</p>
          )}
        </div>
      </div>

      {/* Modal Tambah Perangkat */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{step === 1 ? "Tambah Perangkat" : "QR Code"}</h3>
              <IoMdClose className="close-icon" onClick={closeModal} />
            </div>

            <div className="modal-body">
              {step === 1 && (
                <div>
                  <div>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Masukkan Nama Kontak"
                    className="datepicker-input"
                  />
                  </div>
                  <div>
                  <input
                    type="number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Masukkan Nomor Telepon"
                    className="datepicker-input"
                  />
                </div>
                </div>
              )}

              {step === 2 && (
                <div className="qr-code-container">
                  {qrCodeData ? (
                    <QRCodeSVG value={qrCodeData} size={256} />
                  ) : (
                    <p>Memuat QR Code...</p>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              {step === 1 && (
                <button onClick={handleNext} disabled={loading} className="modal-button">
                  {loading ? "Loading..." : "Next"}
                </button>
              )}
              {step === 2 && (
                <button onClick={closeModal} className="modal-button">Selesai</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Disconnect */}
      {showDisconnectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{disconnectSuccess ? "Berhasil" : "Konfirmasi Disconnect"}</h3>
              <IoMdClose className="close-icon" onClick={closeDisconnectModal} />
            </div>

            <div className="modal-body">
              {disconnectSuccess ? (
                <p>Perangkat berhasil dilepaskan!</p>  // Pesan sukses setelah disconnect
              ) : (
                <p>Apakah Anda yakin ingin melepaskan tautan perangkat ini?</p>  // Konfirmasi sebelum disconnect
              )}
            </div>

            <div className="">
              {!disconnectSuccess && (
                <div className="button-action">
                  <button onClick={closeDisconnectModal} className="modal-button">Tidak</button>
                  <button onClick={handleConfirmDisconnect} className="btn-back" disabled={loading}>
                    {loading ? "Melepas..." : "Iya"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
