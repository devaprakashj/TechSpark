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
import SecretaryDashboard from './components/Admin/SecretaryDashboard';
import CheckinConsole from './components/Admin/CheckinConsole';
import CertificateVerification from './components/CertificateVerification';
import JudgePortal from './components/JudgePortal';
import HackathonLeaderboard from './components/HackathonLeaderboard';
import ScrollToTop from './components/ScrollToTop';
import Chatbot from './components/Chatbot';
import './index.css';
import { QRCodeSVG } from 'qrcode.react';

const DashboardWrapper = () => {
  const { user } = useAuth();
  if (user?.isExternalStudent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 pt-24 pb-20">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">🎓</div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">External Participant Hub</h2>
            <p className="text-xs text-slate-400 font-bold uppercase mt-1">College: {user.college || 'N/A'}</p>
          </div>
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-3">
            <p className="text-xs font-bold text-slate-700">Hello {user.fullName || 'User'}! You have successfully registered for the hackathon. Your check-in code is:</p>
            <div className="flex flex-col items-center py-3">
              <QRCodeSVG value={user.rollNumber || user.uid} size={140} level="H" />
              <p className="text-[10px] text-slate-400 font-bold font-mono tracking-widest mt-3">{user.rollNumber || 'REG-CODE'}</p>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 font-medium">
              <span className="font-bold">Email:</span> {user.email}<br/>
              <span className="font-bold">Dept:</span> {user.department}<br/>
              <span className="font-bold">Year:</span> {user.yearOfStudy}
            </div>
          </div>
          <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
            Note: RIT Campus Workspace, Projects, and Internal Dashboards are restricted to internal students.
          </p>
        </div>
      </div>
    );
  }
  return (
    <>
      <StudentDashboard />
      <Projects />
    </>
  );
};

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

const ProtectedSecretaryRoute = ({ children }) => {
  const organizerToken = localStorage.getItem('organizerToken');
  if (!organizerToken) return <Navigate to="/organizer/login" />;
  const data = JSON.parse(organizerToken);
  return data.role === 'Secretary' ? children : <Navigate to="/organizer/dashboard" />;
};

const AuthOverlays = () => {
  const { showBadge, setShowBadge, user } = useAuth();

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

// Chatbot only on Home and Dashboard
import { useLocation } from 'react-router-dom';

const ChatbotWrapper = () => {
  const location = useLocation();
  const allowedPaths = ['/', '/dashboard'];

  // Only show Chatbot on Home and Student Dashboard
  if (!allowedPaths.includes(location.pathname)) {
    return null;
  }

  return <Chatbot />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
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

            <Route
              path="/secretary/dashboard"
              element={
                <ProtectedSecretaryRoute>
                  <SecretaryDashboard />
                </ProtectedSecretaryRoute>
              }
            />

            <Route path="/checkin" element={<CheckinConsole />} />

            {/* Judge Portal - Hackathon Scoring */}
            <Route path="/judge" element={<JudgePortal />} />

            {/* Hackathon Leaderboard - Live Scores */}
            <Route path="/leaderboard" element={<HackathonLeaderboard />} />

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
                          <DashboardWrapper />
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
          <ChatbotWrapper />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
