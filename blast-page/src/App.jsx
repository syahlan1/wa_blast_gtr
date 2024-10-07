import SidebarComponent from "./components/SidebarComponent";
import { Routes, Route, useLocation } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import ShowHistoryPage from "./pages/history/ShowHistoryPage";
import CampaignContactPage from "./pages/campaign/CampaignContactPage";
import CampaignMessage from "./pages/campaign/CampaignMessage";
import CampaignPage from "./pages/campaign/CampaignPage";
import CreateMessage from "./pages/fast_message/CreateMessage";
import InputContact from "./pages/fast_message/InputContact";
import DetailHistoryPage from "./pages/history/DetailHistoryPage";
import LoginPage from "./pages/LoginPage";
import { AuthProvider } from './components/AuthContext';
import ProtectedRoute from "./components/ProtectedRoute"; // Import ProtectedRoute
function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  return (
    <AuthProvider>
    <div>
      {isLoginPage ? (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      ) : (
        <SidebarComponent>
          <Routes>
            {/* Bungkus rute dengan ProtectedRoute untuk melindunginya */}
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/campaign-page" element={<ProtectedRoute><CampaignPage /></ProtectedRoute>} />
            <Route path="/campaign-message/:id" element={<ProtectedRoute><CampaignMessage /></ProtectedRoute>} />
            <Route path="/campaign-contact/:id" element={<ProtectedRoute><CampaignContactPage /></ProtectedRoute>} />
            <Route path="/create-message" element={<ProtectedRoute><CreateMessage /></ProtectedRoute>} />
            <Route path="/input-contact" element={<ProtectedRoute><InputContact /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><ShowHistoryPage /></ProtectedRoute>} />
            <Route path="/detail-history/:id" element={<ProtectedRoute><DetailHistoryPage /></ProtectedRoute>} />
          </Routes>
        </SidebarComponent>
      )}
    </div>
    </AuthProvider>
  );
}

export default App;
