import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUserPlus, FaArrowLeft } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

function AdminCreateUser() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || (user && user.role !== 'admin')) navigate('/login');
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }

    setIsSubmitting(true);
    setError(''); setSuccess('');

    try {
      await axios.post('/api/auth/register-admin', {
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      setSuccess('Operative profile created successfully.');
      setTimeout(() => navigate('/admin'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Creation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-8 pb-20 px-4 flex justify-center items-start">
      <div className="w-full max-w-lg">
        <button onClick={() => navigate('/admin')} className="mb-6 flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-colors">
          <FaArrowLeft /> Return to Command
        </button>

        <Card className="p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-[rgba(255,255,255,0.1)] pb-4">
            <FaUserPlus className="text-2xl text-[var(--neon-blue)]" />
            <h1 className="text-2xl font-heading font-bold text-white uppercase tracking-wider">Initialize Operative</h1>
          </div>

          {error && <div className="p-3 mb-4 bg-red-900/30 border border-red-500 rounded text-red-300 text-sm font-bold text-center">{error}</div>}
          {success && <div className="p-3 mb-4 bg-green-900/30 border border-green-500 rounded text-green-300 text-sm font-bold text-center">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />

            <div className="pt-4 flex gap-4">
              <Button type="button" variant="secondary" onClick={() => navigate('/admin')} className="w-1/3">
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting} className="w-2/3">
                {isSubmitting ? 'Initializing...' : 'Create Profile'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default AdminCreateUser;
