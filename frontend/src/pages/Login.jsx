import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Shield, ArrowRight } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { sanitizeInput, validateEmail } from '../utils/security';
import Logger from '../utils/logger';
import { Button, Input, Alert, Terminal, TerminalLine } from '../components/ui';
import './Auth.css';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const { login, clearErrors } = useContext(AuthContext);
  const navigate = useNavigate();

  const { email, password } = formData;

  const onChange = (e) => {
    const sanitizedValue = sanitizeInput(e.target.value);
    setFormData({ ...formData, [e.target.name]: sanitizedValue });
    setFormError('');
    setIsBlocked(false);
    clearErrors();
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!email || !password) {
      setFormError('Please enter all fields');
      return;
    }

    if (!validateEmail(email)) {
      setFormError('Please enter a valid email address');
      return;
    }

    Logger.info('LOGIN_ATTEMPT_START', { email });
    setIsSubmitting(true);

    try {
      await login({ email, password });
      Logger.info('LOGIN_SUCCESS', { email });
      navigate('/');
    } catch (err) {
      Logger.error('LOGIN_FAILED', { email, error: err.message });
      const errorMessage = err.response?.data?.message || err.message || 'Login failed. Please try again.';
      setFormError(errorMessage);
      
      // Check if user is blocked
      if (err.response?.status === 403 && err.response?.data?.isBlocked) {
        setIsBlocked(true);
      }
      
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cyber-auth-container">
      <div className="cyber-auth-background">
        <div className="cyber-auth-grid"></div>
      </div>
      
      <div className="cyber-auth-content">
        <motion.div
          className="cyber-auth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="cyber-auth-header">
            <motion.div
              className="cyber-auth-icon"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <Shield size={40} />
            </motion.div>
            <h1 className="cyber-auth-title">
              <span className="text-gradient">AUTHENTICATE</span>
            </h1>
            <p className="cyber-auth-subtitle">
              Access the platform to begin your mission
            </p>
          </div>

          <Terminal title="LOGIN_INTERFACE" className="cyber-auth-terminal">
            <TerminalLine command="system.auth.init()" output="[OK] Authentication module loaded" />
            <TerminalLine command="user.login()" output="[WAIT] Awaiting credentials..." />
          </Terminal>

          {formError && (
            <Alert type={isBlocked ? "danger" : "warning"} className="cyber-auth-alert">
              {formError}
            </Alert>
          )}

          <form onSubmit={onSubmit} className="cyber-auth-form">
            <Input
              type="email"
              name="email"
              label="Email Address"
              value={email}
              onChange={onChange}
              placeholder="user@domain.com"
              icon={<Mail size={18} />}
              required
              fullWidth
            />

            <Input
              type="password"
              name="password"
              label="Password"
              value={password}
              onChange={onChange}
              placeholder="Enter your password"
              icon={<Lock size={18} />}
              required
              fullWidth
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              icon={<ArrowRight size={18} />}
            >
              {isSubmitting ? 'Authenticating' : 'Login'}
            </Button>
          </form>

          <div className="cyber-auth-footer">
            <div className="cyber-auth-divider">
              <span>NEW USER?</span>
            </div>
            <Link to="/register" className="cyber-auth-link">
              <Button variant="outline" fullWidth>
                Contact Admin for Registration
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="cyber-auth-info"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3>Capture The Flag Platform</h3>
          <p>Professional cybersecurity training and competition environment.</p>
          <div className="cyber-auth-features">
            <div className="cyber-auth-feature">
              <span className="cyber-auth-feature-icon">🎯</span>
              <span>Real-world challenges</span>
            </div>
            <div className="cyber-auth-feature">
              <span className="cyber-auth-feature-icon">🏆</span>
              <span>Competitive leaderboard</span>
            </div>
            <div className="cyber-auth-feature">
              <span className="cyber-auth-feature-icon">🔒</span>
              <span>Secure environment</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Login;
