import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Events from './components/Events';
import Projects from './components/Projects';
import Team from './components/Team';
import Welcome from './components/Welcome';
import Footer from './components/Footer';
import StudentDashboard from './components/StudentDashboard';
import BadgePopup from './components/BadgePopup';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import OrganizerLogin from './components/Admin/OrganizerLogin';
import OrganizerDashboard from './components/Admin/OrganizerDashboard';
import CheckinConsole from './components/Admin/CheckinConsole';
import CertificateVerification from './components/CertificateVerification';
import './index.css';

const MainContent = () => {
  // ... no changes here
  return (
    <main>
      <section id="home"><Hero /></section>
      <section id="about"><About /></section>
      <section id="events"><Events /></section>
      <section id="projects"><Projects /></section>
      <section id="team"><Team /></section>
    </main>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );
  return user ? children : <Navigate to="/" />;
};

const ProtectedAdminRoute = ({ children }) => {
  const adminToken = localStorage.getItem('adminToken');
  return adminToken ? children : <Navigate to="/admin/login" />;
};

const ProtectedOrganizerRoute = ({ children }) => {
  const organizerToken = localStorage.getItem('organizerToken');
  return organizerToken ? children : <Navigate to="/organizer/login" />;
};

const AuthOverlays = () => {
  const { isAuthModalOpen, showBadge, setShowBadge, user } = useAuth();

  return (
    <>
      <AuthModal />
      <BadgePopup
        isOpen={showBadge}
        onClose={() => setShowBadge(false)}
        userName={user?.fullName || 'Member'}
      />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-white">
          <Routes>
            {/* Admin & Organizer Routes (No Navbar/Footer) */}
            <Route path="/admin" element={<Navigate to="/admin/login" />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedAdminRoute>
                  <AdminDashboard />
                </ProtectedAdminRoute>
              }
            />

            <Route path="/organizer" element={<Navigate to="/organizer/login" />} />
            <Route path="/organizer/login" element={<OrganizerLogin />} />
            <Route
              path="/organizer/dashboard"
              element={
                <ProtectedOrganizerRoute>
                  <OrganizerDashboard />
                </ProtectedOrganizerRoute>
              }
            />

            <Route path="/checkin" element={<CheckinConsole />} />

            {/* Certificate Verification - Standalone Page */}
            <Route path="/certificateverify" element={<CertificateVerification />} />

            {/* Welcome Page - Intermediate Step */}
            <Route
              path="/welcome"
              element={
                <ProtectedRoute>
                  <Welcome />
                </ProtectedRoute>
              }
            />

            {/* Public/Student Routes (With Navbar/Footer) */}
            <Route
              path="*"
              element={
                <>
                  <Navbar />
                  <Routes>
                    <Route path="/" element={<MainContent />} />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <StudentDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                  <Footer />
                </>
              }
            />
          </Routes>
          <AuthOverlays />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
