import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useContext, useState, useEffect } from 'react'
import AuthContext from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import './CyberNavbar.css'

function CyberNavbar() {
  const { isAuthenticated, user, logout } = useContext(AuthContext)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [unreadNoticeCount, setUnreadNoticeCount] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUnreadCount()
      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, user])

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get('/api/notices/unread-count')
      setUnreadNoticeCount(response.data.count)
    } catch (err) {
      console.error('Error fetching notices:', err)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <motion.nav
      className={`cyber-navbar ${scrolled ? 'scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="cyber-navbar-container">
        {/* Logo */}
        <Link to="/" className="cyber-logo">
          <motion.div
            className="logo-wrapper"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="logo-bracket">{'['}</span>
            <span className="logo-text">CTF</span>
            <span className="logo-quest">QUEST</span>
            <span className="logo-bracket">{']'}</span>
            <motion.div
              className="logo-underline"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </motion.div>
        </Link>

        {/* Desktop Navigation */}
        <div className="cyber-nav-links">
          {isAuthenticated ? (
            <>
              <NavLink to="/" active={isActive('/')}>
                <span className="nav-icon">▸</span> DASHBOARD
              </NavLink>
              <NavLink to="/challenges" active={isActive('/challenges')}>
                <span className="nav-icon">▸</span> CHALLENGES
              </NavLink>
              <NavLink to="/scoreboard" active={isActive('/scoreboard')}>
                <span className="nav-icon">▸</span> SCOREBOARD
              </NavLink>
              <NavLink to="/my-team" active={isActive('/my-team')}>
                <span className="nav-icon">▸</span> TEAM
              </NavLink>
              <NavLink to="/notices" active={isActive('/notices')}>
                <span className="nav-icon">▸</span> NOTICES
                {unreadNoticeCount > 0 && (
                  <motion.span
                    className="notice-badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring' }}
                  >
                    {unreadNoticeCount}
                  </motion.span>
                )}
              </NavLink>

              {user?.role === 'admin' || user?.role === 'superadmin' ? (
                <NavLink to="/admin" active={location.pathname.startsWith('/admin')}>
                  <span className="nav-icon">◆</span> ADMIN
                </NavLink>
              ) : null}

              <div className="nav-divider" />

              <NavLink to="/profile" active={isActive('/profile')}>
                <span className="user-icon">⬢</span> {user?.username?.toUpperCase()}
              </NavLink>

              <motion.button
                className="cyber-logout-btn"
                onClick={handleLogout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="nav-icon">✕</span> LOGOUT
              </motion.button>
            </>
          ) : (
            <>
              <NavLink to="/about" active={isActive('/about')}>
                <span className="nav-icon">▸</span> ABOUT
              </NavLink>
              <NavLink to="/login" active={isActive('/login')}>
                <span className="nav-icon">▸</span> LOGIN
              </NavLink>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <motion.button
          className="mobile-menu-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          whileTap={{ scale: 0.9 }}
        >
          <motion.div
            animate={isMenuOpen ? 'open' : 'closed'}
            className="hamburger"
          >
            <motion.span
              variants={{
                closed: { rotate: 0, y: 0 },
                open: { rotate: 45, y: 8 }
              }}
            />
            <motion.span
              variants={{
                closed: { opacity: 1 },
                open: { opacity: 0 }
              }}
            />
            <motion.span
              variants={{
                closed: { rotate: 0, y: 0 },
                open: { rotate: -45, y: -8 }
              }}
            />
          </motion.div>
        </motion.button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mobile-menu-content">
              {isAuthenticated ? (
                <>
                  <MobileNavLink to="/" onClick={() => setIsMenuOpen(false)}>
                    Dashboard
                  </MobileNavLink>
                  <MobileNavLink to="/challenges" onClick={() => setIsMenuOpen(false)}>
                    Challenges
                  </MobileNavLink>
                  <MobileNavLink to="/scoreboard" onClick={() => setIsMenuOpen(false)}>
                    Scoreboard
                  </MobileNavLink>
                  <MobileNavLink to="/my-team" onClick={() => setIsMenuOpen(false)}>
                    Team
                  </MobileNavLink>
                  <MobileNavLink to="/notices" onClick={() => setIsMenuOpen(false)}>
                    Notices {unreadNoticeCount > 0 && `(${unreadNoticeCount})`}
                  </MobileNavLink>
                  {(user?.role === 'admin' || user?.role === 'superadmin') && (
                    <MobileNavLink to="/admin" onClick={() => setIsMenuOpen(false)}>
                      Admin Panel
                    </MobileNavLink>
                  )}
                  <MobileNavLink to="/profile" onClick={() => setIsMenuOpen(false)}>
                    Profile
                  </MobileNavLink>
                  <motion.button
                    className="mobile-logout-btn"
                    onClick={() => {
                      setIsMenuOpen(false)
                      handleLogout()
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Logout
                  </motion.button>
                </>
              ) : (
                <>
                  <MobileNavLink to="/about" onClick={() => setIsMenuOpen(false)}>
                    About
                  </MobileNavLink>
                  <MobileNavLink to="/login" onClick={() => setIsMenuOpen(false)}>
                    Login
                  </MobileNavLink>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

// Desktop Nav Link Component
function NavLink({ to, active, children }) {
  return (
    <Link to={to} className={`cyber-nav-link ${active ? 'active' : ''}`}>
      <motion.div
        className="nav-link-content"
        whileHover={{ x: 4 }}
        transition={{ duration: 0.2 }}
      >
        {children}
        {active && (
          <motion.div
            className="active-indicator"
            layoutId="activeNav"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
      </motion.div>
    </Link>
  )
}

// Mobile Nav Link Component
function MobileNavLink({ to, onClick, children }) {
  return (
    <Link to={to} className="mobile-nav-link" onClick={onClick}>
      <motion.div
        whileHover={{ x: 8 }}
        transition={{ duration: 0.2 }}
      >
        <span className="mobile-nav-icon">▸</span> {children}
      </motion.div>
    </Link>
  )
}

export default CyberNavbar
