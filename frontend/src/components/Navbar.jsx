import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, Flag, Trophy, Users, Shield, Bell, Menu, X, 
  User, LogOut, Settings, ChevronDown, FileText, Mail
} from 'lucide-react';
import AuthContext from '../context/AuthContext';
import axios from 'axios';
import { Badge } from './ui';
import './Navbar.css';

function Navbar() {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const userMenuRef = useRef(null);
  const adminMenuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsAdminMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target)) {
        setIsAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get('/api/notices/unread-count');
      setUnreadNoticeCount(response.data.count);
    } catch (err) {
      console.error('Error fetching unread notice count:', err);
    }
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Home', icon: Home, auth: false },
    { path: '/challenges', label: 'Challenges', icon: Flag, auth: true },
    { path: '/scoreboard', label: 'Leaderboard', icon: Trophy, auth: true },
    { path: '/my-team', label: 'Team', icon: Users, auth: true },
    { path: '/contact', label: 'Contact', icon: Mail, auth: false },
  ];

  const adminLinks = [
    { path: '/admin', label: 'Dashboard' },
    { path: '/admin/create-user', label: 'Create User' },
    { path: '/admin/create-team', label: 'Create Team' },
    { path: '/admin/messages', label: 'Messages' },
    { path: '/admin/login-logs', label: 'Login Logs' },
    { path: '/admin/platform-control', label: 'Platform Control' },
    { path: '/admin/analytics', label: 'Analytics' },
    { path: '/admin/live-monitor', label: 'Live Monitor' },
    { path: '/admin/submissions', label: 'Submissions' },
  ];

  return (
    <nav className={`cyber-navbar ${scrolled ? 'cyber-navbar--scrolled' : ''}`}>
      <div className="cyber-navbar-container">
        <Link to="/" className="cyber-navbar-brand">
          <Shield size={28} className="cyber-navbar-logo-icon" />
          <span className="cyber-navbar-logo-text">
            CTF<span className="text-gradient">Quest</span>
          </span>
        </Link>

        <div className="cyber-navbar-desktop">
          <div className="cyber-navbar-links">
            {navLinks.map((link) => {
              if (link.auth && !isAuthenticated) return null;
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`cyber-navbar-link ${isActive(link.path) ? 'cyber-navbar-link--active' : ''}`}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {user?.role === 'admin' && (
              <div className="cyber-navbar-dropdown" ref={adminMenuRef}>
                <button
                  className="cyber-navbar-link cyber-navbar-link--dropdown"
                  onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                >
                  <Settings size={18} />
                  <span>Admin</span>
                  <ChevronDown size={16} className={`cyber-navbar-chevron ${isAdminMenuOpen ? 'cyber-navbar-chevron--open' : ''}`} />
                </button>
                <AnimatePresence>
                  {isAdminMenuOpen && (
                    <motion.div
                      className="cyber-navbar-dropdown-menu"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {adminLinks.map((link) => (
                        <Link
                          key={link.path}
                          to={link.path}
                          className="cyber-navbar-dropdown-item"
                          onClick={() => setIsAdminMenuOpen(false)}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {isAuthenticated && (
              <Link
                to="/notices"
                className={`cyber-navbar-link ${isActive('/notices') ? 'cyber-navbar-link--active' : ''}`}
              >
                <div className="cyber-navbar-notice-icon">
                  <Bell size={18} />
                  {unreadNoticeCount > 0 && (
                    <Badge variant="danger" size="sm" className="cyber-navbar-badge">
                      {unreadNoticeCount}
                    </Badge>
                  )}
                </div>
                <span>Notices</span>
              </Link>
            )}
          </div>

          <div className="cyber-navbar-actions">
            {isAuthenticated ? (
              <div className="cyber-navbar-user" ref={userMenuRef}>
                <button
                  className="cyber-navbar-user-button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                >
                  <div className="cyber-navbar-avatar">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <span className="cyber-navbar-username">{user?.username}</span>
                  <ChevronDown size={16} className={`cyber-navbar-chevron ${isUserMenuOpen ? 'cyber-navbar-chevron--open' : ''}`} />
                </button>
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      className="cyber-navbar-user-menu"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="cyber-navbar-user-info">
                        <div className="cyber-navbar-user-name">{user?.username}</div>
                        <div className="cyber-navbar-user-role">{user?.role}</div>
                      </div>
                      <div className="cyber-navbar-user-menu-divider"></div>
                      <Link to="/profile" className="cyber-navbar-user-menu-item" onClick={() => setIsUserMenuOpen(false)}>
                        <User size={16} />
                        <span>Profile</span>
                      </Link>
                      <Link to="/my-team" className="cyber-navbar-user-menu-item" onClick={() => setIsUserMenuOpen(false)}>
                        <Users size={16} />
                        <span>My Team</span>
                      </Link>
                      <div className="cyber-navbar-user-menu-divider"></div>
                      <button className="cyber-navbar-user-menu-item cyber-navbar-user-menu-item--danger" onClick={handleLogout}>
                        <LogOut size={16} />
                        <span>Logout</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/login" className="cyber-navbar-login-button">
                <User size={18} />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>

        <button
          className="cyber-navbar-mobile-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="cyber-navbar-mobile"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="cyber-navbar-mobile-links">
              {navLinks.map((link) => {
                if (link.auth && !isAuthenticated) return null;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`cyber-navbar-mobile-link ${isActive(link.path) ? 'cyber-navbar-mobile-link--active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon size={18} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
              {user?.role === 'admin' && (
                <>
                  <div className="cyber-navbar-mobile-divider">Admin</div>
                  {adminLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className="cyber-navbar-mobile-link"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </>
              )}
              {isAuthenticated && (
                <>
                  <div className="cyber-navbar-mobile-divider">Account</div>
                  <Link to="/profile" className="cyber-navbar-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>
                    <User size={18} />
                    <span>Profile</span>
                  </Link>
                  <button className="cyber-navbar-mobile-link cyber-navbar-mobile-link--danger" onClick={handleLogout}>
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </>
              )}
              {!isAuthenticated && (
                <Link to="/login" className="cyber-navbar-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>
                  <User size={18} />
                  <span>Login</span>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export default Navbar;
