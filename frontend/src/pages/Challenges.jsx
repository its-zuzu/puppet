import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { pageVariants, staggerContainerVariants, gridItemVariants } from '../utils/animations';
import Card, { CardBody, CardTitle, CardDescription } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Loading from '../components/Loading';
import './Challenges.css';

const Challenges = () => {
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchChallenges();
    }, []);

    const fetchChallenges = async () => {
        try {
            const res = await axios.get('/api/challenges');
            setChallenges(res.data.data || []);
        } catch (err) {
            console.error('Error fetching challenges:', err);
        } finally {
            setLoading(false);
        }
    };

    const categories = ['all', ...new Set(challenges.map(c => c.category))];
    const filteredChallenges = filter === 'all'
        ? challenges
        : challenges.filter(c => c.category === filter);

    if (loading) return <Loading text="Loading challenges" />;

    return (
        <motion.div
            className="challenges-page"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <div className="challenges-header">
                <h1>Challenges</h1>
                <p>Test your skills across various cybersecurity categories</p>
            </div>

            <div className="challenges-filters">
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`filter-btn ${filter === cat ? 'active' : ''}`}
                        onClick={() => setFilter(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <motion.div
                className="challenges-grid"
                variants={staggerContainerVariants}
                initial="hidden"
                animate="visible"
            >
                {filteredChallenges.map((challenge, index) => (
                    <motion.div key={challenge._id} custom={index} variants={gridItemVariants}>
                        <Link to={`/challenges/${challenge._id}`} className="challenge-link">
                            <Card hoverable glowOnHover>
                                <CardBody>
                                    <div className="challenge-header">
                                        <CardTitle>{challenge.title}</CardTitle>
                                        <Badge variant={challenge.difficulty?.toLowerCase() || 'default'}>
                                            {challenge.difficulty}
                                        </Badge>
                                    </div>
                                    <CardDescription>{challenge.description}</CardDescription>
                                    <div className="challenge-footer">
                                        <Badge variant="primary">{challenge.category}</Badge>
                                        <span className="challenge-points">{challenge.points} pts</span>
                                    </div>
                                </CardBody>
                            </Card>
                        </Link>
                    </motion.div>
                ))}
            </motion.div>

            {filteredChallenges.length === 0 && (
                <div className="no-challenges">
                    <p>No challenges available</p>
                </div>
            )}
        </motion.div>
    );
};

export default Challenges;
