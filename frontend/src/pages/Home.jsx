import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { pageVariants, staggerContainerVariants, staggerItemVariants, heroTextVariants } from '../utils/animations';
import Button from '../components/ui/Button';
import Card, { CardBody, CardTitle, CardDescription } from '../components/ui/Card';
import './Home.css';

const Home = () => {
    return (
        <motion.div
            className="home-page"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <motion.h1
                        className="hero-title"
                        variants={heroTextVariants}
                        custom={0}
                    >
                        Welcome to <span className="text-gradient">CTFQuest</span>
                    </motion.h1>
                    <motion.p
                        className="hero-subtitle"
                        variants={heroTextVariants}
                        custom={1}
                    >
                        Test your cybersecurity skills in our professional Capture The Flag platform
                    </motion.p>
                    <motion.div
                        className="hero-buttons"
                        variants={heroTextVariants}
                        custom={2}
                    >
                        <Link to="/register">
                            <Button variant="primary" size="lg">
                                Get Started
                            </Button>
                        </Link>
                        <Link to="/about">
                            <Button variant="outline" size="lg">
                                Learn More
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <motion.div
                    className="features-grid"
                    variants={staggerContainerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                >
                    <motion.div variants={staggerItemVariants}>
                        <Card hoverable glowOnHover>
                            <CardBody>
                                <div className="feature-icon">🎯</div>
                                <CardTitle>Real Challenges</CardTitle>
                                <CardDescription>
                                    Solve real-world cybersecurity challenges across multiple categories
                                </CardDescription>
                            </CardBody>
                        </Card>
                    </motion.div>

                    <motion.div variants={staggerItemVariants}>
                        <Card hoverable glowOnHover>
                            <CardBody>
                                <div className="feature-icon">🏆</div>
                                <CardTitle>Compete & Win</CardTitle>
                                <CardDescription>
                                    Climb the leaderboard and prove your skills against other hackers
                                </CardDescription>
                            </CardBody>
                        </Card>
                    </motion.div>

                    <motion.div variants={staggerItemVariants}>
                        <Card hoverable glowOnHover>
                            <CardBody>
                                <div className="feature-icon">📚</div>
                                <CardTitle>Learn & Grow</CardTitle>
                                <CardDescription>
                                    Access tutorials and documentation to improve your skills
                                </CardDescription>
                            </CardBody>
                        </Card>
                    </motion.div>
                </motion.div>
            </section>
        </motion.div>
    );
};

export default Home;
