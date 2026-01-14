import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { sanitizeInput, validateEmail, validatePassword } from '../utils/security';
import Logger from '../utils/logger';
import './Auth.css';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const { login, error, clearErrors } = useContext(AuthContext);
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
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Login to <span className="highlight">CTFQuest</span></h2>
          <p>Access your account and start solving challenges</p>
        </div>

        {formError && (
          <div className={`auth-error ${isBlocked ? 'blocked-error' : ''}`}>
            {isBlocked && <span className="blocked-icon">🔒 </span>}
            {formError}
          </div>
        )}

        <form onSubmit={onSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={onChange}
              placeholder="Enter your email"
              autoComplete="off"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={onChange}
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Need an account? <Link to="/register">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
