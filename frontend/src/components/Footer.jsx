import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Send, Shield, ChevronRight } from 'lucide-react';
import axios from 'axios';
import './Footer.css';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await axios.post('/api/newsletter/subscribe', { email });
      setMessage(response.data.message);
      setEmail('');
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      if (error.response) {
        setError(error.response.data.message || 'Failed to subscribe. Please try again.');
      } else if (error.request) {
        setError('Network error. Please check your connection.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <footer className="htb-footer">
      <div className="htb-footer-grid-bg"></div>
      
      <div className="htb-footer-content">
        {/* Brand Section */}
        <motion.div 
          className="htb-footer-brand"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Link to="/" className="htb-footer-logo">
            <motion.div 
              className="htb-logo-icon"
              whileHover={{ scale: 1.1, rotate: 360 }}
              transition={{ duration: 0.8 }}
            >
              <Shield size={32} />
            </motion.div>
            <span className="htb-logo-text">
              CTF<span className="htb-logo-highlight">Quest</span>
            </span>
          </Link>
          <p className="htb-footer-tagline">
            Empowering the next generation of cybersecurity professionals through hands-on challenges and competitions.
          </p>
        </motion.div>

        {/* Navigation Columns */}
        <motion.div 
          className="htb-footer-nav-group"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="htb-footer-column">
            <h3 className="htb-footer-heading">
              <span className="htb-heading-line"></span>
              Platform
            </h3>
            <Link to="/" className="htb-footer-link">
              <ChevronRight size={16} />
              <span>Home</span>
            </Link>
            <Link to="/challenges" className="htb-footer-link">
              <ChevronRight size={16} />
              <span>Challenges</span>
            </Link>
            <Link to="/scoreboard" className="htb-footer-link">
              <ChevronRight size={16} />
              <span>Scoreboard</span>
            </Link>
          </div>

          <div className="htb-footer-column">
            <h3 className="htb-footer-heading">
              <span className="htb-heading-line"></span>
              Company
            </h3>
            <Link to="/privacy-policy" className="htb-footer-link">
              <ChevronRight size={16} />
              <span>Privacy Policy</span>
            </Link>
            <Link to="/terms-of-service" className="htb-footer-link">
              <ChevronRight size={16} />
              <span>Terms of Service</span>
            </Link>
            <Link to="/contact" className="htb-footer-link">
              <ChevronRight size={16} />
              <span>Contact Us</span>
            </Link>
          </div>
        </motion.div>

        {/* Newsletter Section */}
        <motion.div 
          className="htb-footer-newsletter"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="htb-newsletter-glow"></div>
          <h3 className="htb-newsletter-title">
            <Mail size={24} />
            Join Our Newsletter
          </h3>
          <p className="htb-newsletter-text">
            Stay ahead in cybersecurity! Subscribe to receive exclusive challenges, security tips, and platform updates directly in your inbox.
          </p>
          <form className="htb-newsletter-form" onSubmit={handleSubscribe}>
            <div className="htb-input-wrapper">
              <input
                type="email"
                className="htb-newsletter-input"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="htb-input-border"></div>
            </div>
            <motion.button 
              type="submit" 
              className="htb-newsletter-btn" 
              disabled={isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isLoading ? (
                <>Subscribing...</>
              ) : (
                <>
                  Subscribe
                  <Send size={18} />
                </>
              )}
            </motion.button>
          </form>
          {message && (
            <motion.div 
              className="htb-newsletter-success"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {message}
            </motion.div>
          )}
          {error && (
            <motion.div 
              className="htb-newsletter-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Bottom Bar */}
      <div className="htb-footer-bottom">
        <div className="htb-footer-bottom-line"></div>
        <div className="htb-footer-bottom-content">
          <p className="htb-footer-copyright">
            © {new Date().getFullYear()} CTFQuest. All Rights Reserved.
          </p>
          <p className="htb-footer-disclaimer">
            CTFQuest is designed for educational purposes only. Always practice ethical hacking.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;