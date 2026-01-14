import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaLock, FaEnvelope, FaExclamationTriangle } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import { sanitizeInput, validateEmail } from '../utils/security';
import Logger from '../utils/logger';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

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

      if (err.response?.status === 403 && err.response?.data?.isBlocked) {
        setIsBlocked(true);
      }

      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-100px)] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-heading font-bold mb-2">
              SYSTEM <span className="text-[var(--neon-green)]">LOGIN</span>
            </h2>
            <p className="text-[var(--text-secondary)]">Authenticate to access the mainframe</p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-2">
            <Input
              label="Email"
              icon={<FaEnvelope />}
              type="email"
              name="email"
              value={email}
              onChange={onChange}
              placeholder="Enter your email"
              autoComplete="off"
              required
            />

            <Input
              label="Password"
              icon={<FaLock />}
              type="password"
              name="password"
              value={password}
              onChange={onChange}
              placeholder="Enter your password"
              required
            />

            {formError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`flex items-center gap-2 p-3 rounded bg-[rgba(255,0,85,0.1)] border border-[var(--neon-pink)] text-[var(--neon-pink)] text-sm mb-4 ${isBlocked ? 'bg-[rgba(255,0,0,0.2)]' : ''}`}
              >
                <FaExclamationTriangle />
                <span>{formError}</span>
              </motion.div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-4"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Authenticating...' : 'Initialize Session'}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-[var(--text-secondary)]">
            <p>
              Need access clearance?{' '}
              <Link to="/register" className="text-[var(--neon-blue)] hover:text-[var(--neon-green)] transition-colors">
                Request Account
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default Login;
