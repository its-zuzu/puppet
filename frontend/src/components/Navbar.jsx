import { Link, useLocation } from 'react-router-dom'
import { useContext, useState, useEffect, useRef } from 'react'
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
      // Simple debounce/throttle
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

  // Fetch unread notice count
  useEffect(() => {
    if (isAuthenticated && user) {
      // Small delay to ensure token is set in axios
      const timeoutId = setTimeout(() => {
        fetchUnreadCount();
      }, 100);

      // Poll every 30 seconds for new notices
      const interval = setInterval(fetchUnreadCount, 30000);

      // Refresh when tab becomes visible
      const handleVisibilityChange = () => {
        if (!document.hidden && isAuthenticated) {
          fetchUnreadCount();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Listen for notice read events
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
      // Reset count when not authenticated
      setUnreadNoticeCount(0);
    }
  }, [isAuthenticated, user]);

  const fetchUnreadCount = async () => {
    // Skip if not authenticated
    if (!isAuthenticated) {
      return;
    }

    try {
      // Cookie sent automatically with request
      const response = await axios.get('/api/notices/unread-count');
      const newCount = response.data.count;

      // Play notification sound if count increased (but not on first load)
      if (previousCountRef.current !== null && newCount > previousCountRef.current) {
        playNotificationSound();
      }

      previousCountRef.current = newCount;
      setUnreadNoticeCount(newCount);
    } catch (err) {
      console.error('Error fetching unread notice count:', err);
      console.error('Error details:', err.response?.data || err.message);
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

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    setIsDropdownOpen(false);
    // Refresh unread count when navigating
    if (isAuthenticated) {
      fetchUnreadCount();
    }
  }, [location, isAuthenticated]);

  // Close dropdown when clicking outside
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

  // Close menu on escape key
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
    setIsDropdownOpen(false); // Close dropdown when opening menu
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Logo on the left */}
        <div className="navbar-brand">
          <Link to="/" className="navbar-logo">
            <span className="logo-text">CTF<span className="logo-highlight">Quest</span></span>
          </Link>
        </div>

        {/* Navigation content on the right */}
        <div className={`navbar-content ${isMenuOpen ? 'active' : ''}`} ref={menuRef}>
          <ul className="navbar-links">
            <li><Link to="/" className={`nav-link ${isActiveLink('/') ? 'active' : ''}`}>Home</Link></li>
            {isAuthenticated && (
              <li><Link to="/challenges" className={`nav-link ${isActiveLink('/challenges') ? 'active' : ''}`}>Challenges</Link></li>
            )}
            {isAuthenticated && (
              <li><Link to="/scoreboard" className={`nav-link ${isActiveLink('/scoreboard') ? 'active' : ''}`}>Scoreboard</Link></li>
            )}
            {isAuthenticated && (
              <li><Link to="/my-team" className={`nav-link ${isActiveLink('/my-team') ? 'active' : ''}`}>My Team</Link></li>
            )}
            {user?.role === 'admin' && (
              <li className="admin-dropdown">
                <span className="nav-link admin-trigger">Admin <i className="fas fa-chevron-down"></i></span>
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
                    <span className="notification-badge">{unreadNoticeCount}</span>
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
                  <button
                    className="user-button"
                    onClick={toggleDropdown}
                    aria-expanded={isDropdownOpen}
                    aria-haspopup="true"
                    aria-label={`User menu for ${user?.username}`}
                  >
                    <div className="user-avatar">
                      {user?.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="username">{user?.username}</span>
                    <i className={`fas fa-chevron-${isDropdownOpen ? 'up' : 'down'}`}></i>
                  </button>

                  {isDropdownOpen && (
                    <div className="dropdown-menu" role="menu">
                      <div className="dropdown-header">Account</div>
                      <Link
                        to="/profile"
                        className="dropdown-item"
                        onClick={() => setIsDropdownOpen(false)}
                        role="menuitem"
                      >
                        <i className="fas fa-user"></i>
                        Profile
                      </Link>
                      {isAuthenticated && (
                        <Link
                          to="/challenges"
                          className="dropdown-item"
                          onClick={() => setIsDropdownOpen(false)}
                          role="menuitem"
                        >
                          <i className="fas fa-flag"></i>
                          Challenges
                        </Link>
                      )}
                      {isAuthenticated && (
                        <Link
                          to="/my-team"
                          className="dropdown-item"
                          onClick={() => setIsDropdownOpen(false)}
                          role="menuitem"
                        >
                          <i className="fas fa-users"></i>
                          My Team
                        </Link>
                      )}

                      {user?.role === 'admin' && (
                        <>
                          <div className="dropdown-divider"></div>
                          <div className="dropdown-header">Admin</div>
                          <Link
                            to="/admin"
                            className="dropdown-item"
                            onClick={() => setIsDropdownOpen(false)}
                            role="menuitem"
                          >
                            <i className="fas fa-cog"></i>
                            Dashboard
                          </Link>
                          <Link
                            to="/admin/messages"
                            className="dropdown-item"
                            onClick={() => setIsDropdownOpen(false)}
                            role="menuitem"
                          >
                            <i className="fas fa-envelope"></i>
                            Messages
                          </Link>
                        </>
                      )}
                      <div className="dropdown-divider"></div>
                      <div className="dropdown-footer">
                        <button
                          className="dropdown-item logout"
                          onClick={handleLogout}
                          role="menuitem"
                        >
                          <i className="fas fa-sign-out-alt"></i>
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="auth-buttons">
                <Link to="/register" className="login-button">Register</Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu toggle */}
        <button className="menu-toggle" onClick={toggleMenu} aria-label="Toggle menu">
          <span className={`menu-icon ${isMenuOpen ? 'open' : ''}`}></span>
        </button>
      </div>
    </nav>
  )
}

export default Navbar