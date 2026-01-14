import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { pageVariants } from '../utils/animations';
import Card, { CardBody, CardTitle, CardDescription } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Loading from '../components/Loading';
import './ChallengeDetails.css';

const ChallengeDetails = () => {
  const { id } = useParams();
  const [challenge, setChallenge] = useState(null);
  const [flag, setFlag] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchChallenge();
  }, [id]);

  const fetchChallenge = async () => {
    try {
      const res = await axios.get(`/api/challenges/${id}`);
      setChallenge(res.data.data);
    } catch (err) {
      console.error('Error fetching challenge:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const res = await axios.post(`/api/challenges/${id}/submit`, { flag });
      setMessage(res.data.message || 'Correct!');
      setFlag('');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Incorrect flag');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading text="Loading challenge" />;
  if (!challenge) return <div className="error">Challenge not found</div>;

  return (
    <motion.div
      className="challenge-details-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <Card variant="elevated">
        <CardBody>
          <div className="challenge-header">
            <CardTitle>{challenge.title}</CardTitle>
            <div className="challenge-badges">
              <Badge variant={challenge.difficulty?.toLowerCase()}>{challenge.difficulty}</Badge>
              <Badge variant="primary">{challenge.category}</Badge>
              <Badge variant="success">{challenge.points} pts</Badge>
            </div>
          </div>

          <CardDescription>{challenge.description}</CardDescription>

          <form onSubmit={handleSubmit} className="flag-form">
            <Input
              type="text"
              label="Flag"
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
              placeholder="flag{...}"
              fullWidth
              disabled={submitting}
            />
            <Button type="submit" variant="primary" loading={submitting}>
              Submit Flag
            </Button>
          </form>

          {message && (
            <div className={`message ${message.includes('Correct') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
        </CardBody>
      </Card>
    </motion.div>
  );
};

export default ChallengeDetails;
