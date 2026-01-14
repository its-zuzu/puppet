import React, { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { initSecurity } from './utils/security'
import './App.css'
import './enable-copy.css'

// Context
import { AuthProvider } from './context/AuthContext'

// Components (loaded immediately - they're used on every page)
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import ScrollToTop from './components/ScrollToTop'
import BackToTopButton from './components/BackToTopButton'

import Loading from './components/Loading';
import Background from './components/Background';

const PageLoader = () => <Loading text="INITIALIZING..." />;

// Lazy load pages - only load when needed
const Home = lazy(() => import('./pages/Home'))
const Challenges = lazy(() => import('./pages/Challenges'))
const About = lazy(() => import('./pages/About'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Profile = lazy(() => import('./pages/Profile'))
const Scoreboard = lazy(() => import('./pages/Scoreboard'))
const CreateChallenge = lazy(() => import('./pages/CreateChallenge'))
const EditChallenge = lazy(() => import('./pages/EditChallenge'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminCreateUser = lazy(() => import('./pages/AdminCreateUser'))
const AdminCreateTeam = lazy(() => import('./pages/AdminCreateTeam'))
const TeamDetails = lazy(() => import('./pages/TeamDetails'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))
const Documentation = lazy(() => import('./pages/Documentation'))
const AdminUserProfile = lazy(() => import('./pages/AdminUserProfile'))
const ContactUs = lazy(() => import('./pages/ContactUs'))
const AdminContactMessages = lazy(() => import('./pages/AdminContactMessages'))
const AdminLoginLogs = lazy(() => import('./pages/AdminLoginLogs'))
const PlatformControl = lazy(() => import('./pages/PlatformControl'))
const PlatformReset = lazy(() => import('./pages/PlatformReset'))
const UserBlocked = lazy(() => import('./pages/UserBlocked'))
const ChallengeDetails = lazy(() => import('./pages/ChallengeDetails'))
const Notice = lazy(() => import('./pages/Notice'))
const Analytics = lazy(() => import('./pages/Analytics'))
const AdminSubmissions = lazy(() => import('./pages/AdminSubmissions'))
const UserProfile = lazy(() => import('./pages/UserProfile'))
const AdminLiveMonitor = lazy(() => import('./pages/AdminLiveMonitor'))
const MyTeam = lazy(() => import('./pages/MyTeam'))

import ErrorBoundary from './components/ErrorBoundary'

function App() {
  useEffect(() => {
    initSecurity();
    // ... force enable right click ...
    document.addEventListener('DOMContentLoaded', () => {
      document.oncontextmenu = null; document.onselectstart = null; document.ondragstart = null;
    });
    const style = document.createElement('style');
    style.textContent = `* { user-select: text !important; -webkit-user-select: text !important; -moz-user-select: text !important; -ms-user-select: text !important; }`;
    document.head.appendChild(style);
    document.oncontextmenu = null; document.onselectstart = null; document.ondragstart = null;
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <div className="app-container">
            <Background />
            <Navbar />
            <main className="main-content">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/challenges" element={
                    <ProtectedRoute>
                      <Challenges />
                    </ProtectedRoute>
                  } />
                  <Route path="/challenges/:id" element={
                    <ProtectedRoute>
                      <ChallengeDetails />
                    </ProtectedRoute>
                  } />

                  <Route path="/about" element={<About />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/contact" element={<ContactUs />} />
                  <Route path="/notices" element={<Notice />} />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  <Route path="/scoreboard" element={
                    <ProtectedRoute>
                      <Scoreboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/team/:id" element={
                    <ProtectedRoute>
                      <TeamDetails />
                    </ProtectedRoute>
                  } />
                  <Route path="/teams/:id" element={
                    <ProtectedRoute>
                      <TeamDetails />
                    </ProtectedRoute>
                  } />

                  <Route path="/my-team" element={
                    <ProtectedRoute>
                      <MyTeam />
                    </ProtectedRoute>
                  } />

                  <Route path="/user/:userId" element={
                    <ProtectedRoute>
                      <UserProfile />
                    </ProtectedRoute>
                  } />
                  <Route path="/users/:userId" element={
                    <ProtectedRoute>
                      <UserProfile />
                    </ProtectedRoute>
                  } />
                  <Route path="/create-challenge" element={
                    <ProtectedRoute adminOnly={true}>
                      <CreateChallenge />
                    </ProtectedRoute>
                  } />
                  <Route path="/edit-challenge/:id" element={
                    <ProtectedRoute adminOnly={true}>
                      <EditChallenge />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin" element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/create-user" element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminCreateUser />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/create-team" element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminCreateTeam />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/messages" element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminContactMessages />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/login-logs" element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminLoginLogs />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/users/:id" element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminUserProfile />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/platform-control" element={
                    <ProtectedRoute adminOnly={true}>
                      <PlatformControl />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/platform-reset" element={
                    <ProtectedRoute adminOnly={true}>
                      <PlatformReset />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/analytics" element={
                    <ProtectedRoute adminOnly={true}>
                      <Analytics />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/submissions" element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminSubmissions />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/live-monitor" element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminLiveMonitor />
                    </ProtectedRoute>
                  } />
                  <Route path="/blocked" element={<UserBlocked />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/documentation" element={<Documentation />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
            <BackToTopButton />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
