import { Link, useLocation } from 'react-router-dom'
import { useContext, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaChevronDown, FaChevronUp, FaUser, FaFlag, FaUsers,
  FaCog, FaEnvelope, FaSignOutAlt, FaBars, FaTimes
} from 'react-icons/fa'
import AuthContext from '../context/AuthContext'
import axios from 'axios'
import './Navbar.css'

function Navbar() {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);
  const location = useLocation();
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const audioRef = useRef(null);
  const previousCountRef = useRef(null);

  useEffect(() => {
    let timeoutId;

    const handleScroll = () => {
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        setScrolled(window.scrollY > 50);
        timeoutId = null;
      }, 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Fetch unread notice count logic remains same
  useEffect(() => {
    if (isAuthenticated && user) {
      const timeoutId = setTimeout(() => {
        fetchUnreadCount();
      }, 100);
      const interval = setInterval(fetchUnreadCount, 30000);
      const handleVisibilityChange = () => {
        if (!document.hidden && isAuthenticated) {
          fetchUnreadCount();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      const handleNoticeRead = () => {
        fetchUnreadCount();
      };
      window.addEventListener('noticeRead', handleNoticeRead);

      return () => {
        clearTimeout(timeoutId);
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('noticeRead', handleNoticeRead);
      };
    } else {
      setUnreadNoticeCount(0);
    }
  }, [isAuthenticated, user]);

  const fetchUnreadCount = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await axios.get('/api/notices/unread-count');
      const newCount = response.data.count;
      if (previousCountRef.current !== null && newCount > previousCountRef.current) {
        playNotificationSound();
      }
      previousCountRef.current = newCount;
      setUnreadNoticeCount(newCount);
    } catch (err) {
      console.error('Error fetching unread notice count:', err);
    }
  };

  const playNotificationSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/notification.wav');
      }
      audioRef.current.play().catch(err => console.error('Error playing sound:', err));
    } catch (err) {
      console.error('Error with notification sound:', err);
    }
  };

  useEffect(() => {
    setIsMenuOpen(false);
    setIsDropdownOpen(false);
    if (isAuthenticated) {
      fetchUnreadCount();
    }
  }, [location, isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target) && !event.target.closest('.menu-toggle')) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  const isActiveLink = (path) => location.pathname === path;

  return (
    <motion.nav
      className={`navbar ${scrolled ? 'scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-brand">
          <Link to="/" className="navbar-logo">
            <span className="logo-text">CTF<span className="logo-highlight">Quest</span></span>
          </Link>
        </div>

        {/* Navigation */}
        <div className={`navbar-content ${isMenuOpen ? 'active' : ''}`} ref={menuRef}>
          <ul className="navbar-links">
            <li><Link to="/" className={`nav-link ${isActiveLink('/') ? 'active' : ''}`}>Home</Link></li>
            {isAuthenticated && (
              <>
                <li><Link to="/challenges" className={`nav-link ${isActiveLink('/challenges') ? 'active' : ''}`}>Challenges</Link></li>
                <li><Link to="/scoreboard" className={`nav-link ${isActiveLink('/scoreboard') ? 'active' : ''}`}>Scoreboard</Link></li>
                <li><Link to="/my-team" className={`nav-link ${isActiveLink('/my-team') ? 'active' : ''}`}>My Team</Link></li>
              </>
            )}
            {user?.role === 'admin' && (
              <li className="admin-dropdown">
                <span className="nav-link admin-trigger">Admin <FaChevronDown className="ml-1 text-xs" /></span>
                <div className="admin-submenu">
                  <Link to="/admin" className="submenu-item">Dashboard</Link>
                  <Link to="/admin/create-user" className="submenu-item">Create User</Link>
                  <Link to="/admin/create-team" className="submenu-item">Create Team</Link>
                  <Link to="/admin/messages" className="submenu-item">Messages</Link>
                  <Link to="/admin/login-logs" className="submenu-item">Login Logs</Link>
                  <Link to="/admin/platform-control" className="submenu-item">Platform Control</Link>
                  <Link to="/admin/analytics" className="submenu-item">Analytics</Link>
                </div>
              </li>
            )}
            {isAuthenticated && (
              <li>
                <Link to="/notices" className={`nav-link ${isActiveLink('/notices') ? 'active' : ''}`}>
                  Notices
                  {unreadNoticeCount > 0 && (
                    <motion.span
                      className="notification-badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      {unreadNoticeCount}
                    </motion.span>
                  )}
                </Link>
              </li>
            )}
            <li><Link to="/documentation" className={`nav-link ${isActiveLink('/documentation') ? 'active' : ''}`}>Docs</Link></li>
            <li><Link to="/contact" className={`nav-link ${isActiveLink('/contact') ? 'active' : ''}`}>Contact</Link></li>
          </ul>

          <div className="navbar-auth">
            {isAuthenticated ? (
              <div className="auth-section">
                <div className="user-menu" ref={dropdownRef}>
                  <motion.button
                    className="user-button"
                    onClick={toggleDropdown}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="user-avatar">
                      {user?.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="username">{user?.username}</span>
                    {isDropdownOpen ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />}
                  </motion.button>

                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        className="dropdown-menu"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="dropdown-header">Account</div>
                        <Link to="/profile" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                          <FaUser /> Profile
                        </Link>
                        {isAuthenticated && (
                          <Link to="/challenges" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                            <FaFlag /> Challenges
                          </Link>
                        )}
                        {isAuthenticated && (
                          <Link to="/my-team" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                            <FaUsers /> My Team
                          </Link>
                        )}

                        {user?.role === 'admin' && (
                          <>
                            <div className="dropdown-divider"></div>
                            <div className="dropdown-header">Admin</div>
                            <Link to="/admin" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                              <FaCog /> Dashboard
                            </Link>
                            <Link to="/admin/messages" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                              <FaEnvelope /> Messages
                            </Link>
                          </>
                        )}
                        <div className="dropdown-divider"></div>
                        <div className="dropdown-footer">
                          <button className="dropdown-item logout" onClick={handleLogout}>
                            <FaSignOutAlt /> Logout
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="auth-buttons">
                <Link to="/register" className="register-button">Register</Link>
                <Link to="/login" className="login-button">Login</Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu toggle */}
        <button className="menu-toggle" onClick={toggleMenu} aria-label="Toggle menu">
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>
    </motion.nav>
  )
}

export default Navbar