import React, { useState, useContext } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import { pageVariants } from '../utils/animations';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardBody, CardTitle, CardDescription } from '../components/ui/Card';
import './Login.css';

const Login = () => {
    const { login, isAuthenticated } = useContext(AuthContext);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
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
        setLoading(true);

        try {
            await login(formData.email, formData.password);
            navigate('/challenges');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            className="login-page"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <div className="login-container">
                <Card className="login-card" variant="elevated">
                    <CardBody>
                        <div className="login-header">
                            <CardTitle>Welcome Back</CardTitle>
                            <CardDescription>Sign in to your CTFQuest account</CardDescription>
                        </div>

                        <form onSubmit={handleSubmit} className="login-form">
                            {error && <div className="error-message">{error}</div>}

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

                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                fullWidth
                                loading={loading}
                            >
                                Sign In
                            </Button>
                        </form>

                        <div className="login-footer">
                            <p>
                                Don't have an account?{' '}
                                <Link to="/register" className="link-primary">
                                    Register here
                                </Link>
                            </p>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </motion.div>
    );
};

export default Login;
