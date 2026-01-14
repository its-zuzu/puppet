import React, { useState, useContext } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { pageVariants } from '../utils/animations';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardBody, CardTitle, CardDescription } from '../components/ui/Card';
import './Register.css';

const Register = () => {
    const { isAuthenticated } = useContext(AuthContext);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (isAuthenticated) {
        return <Navigate to="/challenges" />;
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            await axios.post('/api/auth/register', {
                username: formData.username,
                email: formData.email,
                password: formData.password,
            });
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            className="register-page"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <div className="register-container">
                <Card className="register-card" variant="elevated">
                    <CardBody>
                        <div className="register-header">
                            <CardTitle>Create Account</CardTitle>
                            <CardDescription>Join CTFQuest and start hacking</CardDescription>
                        </div>

                        <form onSubmit={handleSubmit} className="register-form">
                            {error && <div className="error-message">{error}</div>}

                            <Input
                                type="text"
                                name="username"
                                label="Username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                fullWidth
                                disabled={loading}
                            />

                            <Input
                                type="email"
                                name="email"
                                label="Email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                fullWidth
                                disabled={loading}
                            />

                            <Input
                                type="password"
                                name="password"
                                label="Password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                fullWidth
                                disabled={loading}
                            />

                            <Input
                                type="password"
                                name="confirmPassword"
                                label="Confirm Password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                fullWidth
                                disabled={loading}
                            />

                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                fullWidth
                                loading={loading}
                            >
                                Create Account
                            </Button>
                        </form>

                        <div className="register-footer">
                            <p>
                                Already have an account?{' '}
                                <Link to="/login" className="link-primary">
                                    Sign in here
                                </Link>
                            </p>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </motion.div>
    );
};

export default Register;
