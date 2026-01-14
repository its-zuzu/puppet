import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import { navbarVariants, mobileMenuVariants, dropdownVariants } from '../utils/animations';
import './Navbar.css';

const Navbar = () => {
    const { user, isAuthenticated, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
        setUserDropdownOpen(false);
    }, [location]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <motion.nav
            className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}
            variants={navbarVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="navbar-container">
                {/* Logo */}
                <Link to="/" className="navbar-logo">
                    <span className="logo-text">CTF</span>
                    <span className="logo-accent">Quest</span>
                </Link>

                {/* Desktop Navigation */}
                <div className="navbar-links">
                    <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                        Home
                    </Link>
                    {isAuthenticated && (
                        <>
                            <Link to="/challenges" className={`nav-link ${isActive('/challenges') ? 'active' : ''}`}>
                                Challenges
                            </Link>
                            <Link to="/scoreboard" className={`nav-link ${isActive('/scoreboard') ? 'active' : ''}`}>
                                Scoreboard
                            </Link>
                        </>
                    )}
                    <Link to="/about" className={`nav-link ${isActive('/about') ? 'active' : ''}`}>
                        About
                    </Link>
                    <Link to="/contact" className={`nav-link ${isActive('/contact') ? 'active' : ''}`}>
                        Contact
                    </Link>
                </div>

                {/* Desktop Auth */}
                <div className="navbar-auth">
                    {isAuthenticated ? (
                        <div className="user-menu">
                            <button
                                className="user-menu-trigger"
                                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                            >
                                <div className="user-avatar">
                                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <span className="user-name">{user?.username}</span>
                                <svg className="dropdown-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>

                            <AnimatePresence>
                                {userDropdownOpen && (
                                    <motion.div
                                        className="user-dropdown"
                                        variants={dropdownVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                    >
                                        <Link to="/profile" className="dropdown-item">
                                            <svg viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                            </svg>
                                            Profile
                                        </Link>
                                        {user?.role === 'admin' && (
                                            <Link to="/admin" className="dropdown-item">
                                                <svg viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                                </svg>
                                                Admin
                                            </Link>
                                        )}
                                        <button onClick={handleLogout} className="dropdown-item">
                                            <svg viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                                            </svg>
                                            Logout
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="auth-buttons">
                            <Link to="/login" className="btn-login">
                                Login
                            </Link>
                            <Link to="/register" className="btn-register">
                                Register
                            </Link>
                        </div>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="mobile-menu-button"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
                        <span></span>
                        <span></span>
                        <span></span>
                    </span>
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        className="mobile-menu"
                        variants={mobileMenuVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                    >
                        <div className="mobile-menu-links">
                            <Link to="/" className={`mobile-link ${isActive('/') ? 'active' : ''}`}>
                                Home
                            </Link>
                            {isAuthenticated && (
                                <>
                                    <Link to="/challenges" className={`mobile-link ${isActive('/challenges') ? 'active' : ''}`}>
                                        Challenges
                                    </Link>
                                    <Link to="/scoreboard" className={`mobile-link ${isActive('/scoreboard') ? 'active' : ''}`}>
                                        Scoreboard
                                    </Link>
                                    <Link to="/profile" className={`mobile-link ${isActive('/profile') ? 'active' : ''}`}>
                                        Profile
                                    </Link>
                                    {user?.role === 'admin' && (
                                        <Link to="/admin" className={`mobile-link ${isActive('/admin') ? 'active' : ''}`}>
                                            Admin
                                        </Link>
                                    )}
                                </>
                            )}
                            <Link to="/about" className={`mobile-link ${isActive('/about') ? 'active' : ''}`}>
                                About
                            </Link>
                            <Link to="/contact" className={`mobile-link ${isActive('/contact') ? 'active' : ''}`}>
                                Contact
                            </Link>
                        </div>

                        {isAuthenticated ? (
                            <button onClick={handleLogout} className="mobile-logout">
                                Logout
                            </button>
                        ) : (
                            <div className="mobile-auth">
                                <Link to="/login" className="mobile-btn-login">
                                    Login
                                </Link>
                                <Link to="/register" className="mobile-btn-register">
                                    Register
                                </Link>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
};

export default Navbar;
