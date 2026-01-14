import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { pageVariants, staggerContainerVariants, staggerItemVariants } from '../utils/animations';
import Card, { CardBody, CardTitle, CardDescription } from '../components/ui/Card';

const AdminDashboard = () => {
    const adminLinks = [
        { title: 'Create Challenge', path: '/create-challenge', icon: '🎯' },
        { title: 'Create User', path: '/admin/create-user', icon: '👤' },
        { title: 'Create Team', path: '/admin/create-team', icon: '👥' },
        { title: 'Platform Control', path: '/admin/platform-control', icon: '⚙️' },
        { title: 'Analytics', path: '/admin/analytics', icon: '📊' },
        { title: 'Submissions', path: '/admin/submissions', icon: '📝' },
        { title: 'Live Monitor', path: '/admin/live-monitor', icon: '📡' },
        { title: 'Login Logs', path: '/admin/login-logs', icon: '📋' },
    ];

    return (
        <motion.div
            className="admin-dashboard-page"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ padding: 'calc(var(--navbar-height) + 2rem) 1.5rem 2rem', maxWidth: '1400px', margin: '0 auto' }}
        >
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: 'var(--font-size-4xl)', marginBottom: '1rem' }}>Admin Dashboard</h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>Manage your CTF platform</p>
            </div>

            <motion.div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}
                variants={staggerContainerVariants}
                initial="hidden"
                animate="visible"
            >
                {adminLinks.map((link, index) => (
                    <motion.div key={link.path} variants={staggerItemVariants}>
                        <Link to={link.path} style={{ textDecoration: 'none' }}>
                            <Card hoverable glowOnHover>
                                <CardBody>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{link.icon}</div>
                                    <CardTitle>{link.title}</CardTitle>
                                </CardBody>
                            </Card>
                        </Link>
                    </motion.div>
                ))}
            </motion.div>
        </motion.div>
    );
};

export default AdminDashboard;
