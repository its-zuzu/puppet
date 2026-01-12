import { useState, useEffect, useContext, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import AuthContext from '../context/AuthContext'
import Logger from '../utils/logger'
import { useEventState } from '../hooks/useEventState'
import './Challenges.css'

const SolvesModal = ({ challenge, onClose }) => {
  const [solves, setSolves] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const fetchSolves = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${token}`
          }
        };
        const res = await axios.get(`/api/challenges/${challenge._id}/solves`, config);
        setSolves(res.data.data || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching solves:', err);
        setLoading(false);
      }
    };

    fetchSolves();
  }, [challenge._id, token]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content solves-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{challenge.title} - Solves ({solves.length})</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="modal-loading">Loading solves...</div>
        ) : solves.length === 0 ? (
          <div className="no-solves">No one has solved this challenge yet!</div>
        ) : (
          <div className="solves-list">
            <table className="solves-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Team</th>
                  <th>Solved At</th>
                </tr>
              </thead>
              <tbody>
                {solves.map((solve, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{solve.username}</td>
                    <td>{solve.team}</td>
                    <td>{new Date(solve.solvedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const FlagSubmissionModal = ({ challenge, onClose, onSubmit }) => {
  const [flag, setFlag] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!flag.trim()) {
      setError('Please enter a flag');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await onSubmit(flag);
      setSuccess('Flag submitted successfully!');
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.message || 'Failed to submit flag');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Submit Flag: {challenge.title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="modal-error">{error}</div>}
        {success && <div className="modal-success">{success}</div>}

        <form onSubmit={handleSubmit} className="flag-form">
          <div className="form-group">
            <label htmlFor="flag">Flag</label>
            <input
              type="text"
              id="flag"
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
              placeholder="Enter the flag SECE{Flag}"
              autoComplete="off"
              disabled={isSubmitting || success}
            />
          </div>

          <button
            type="submit"
            className="submit-flag-button"
            disabled={isSubmitting || success}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Flag'}
          </button>
        </form>
      </div>
    </div>
  );
};

function Challenges() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showSolvesModal, setShowSolvesModal] = useState(false)
  const [selectedChallengeForSolves, setSelectedChallengeForSolves] = useState(null)

  const { user, isAuthenticated, token, updateUserData } = useContext(AuthContext)
  const { eventState, isEnded } = useEventState()

  const categories = [
    { id: 'all', name: 'All Challenges' },
    { id: 'web', name: 'Web Exploitation' },
    { id: 'crypto', name: 'Cryptography' },
    { id: 'forensics', name: 'Forensics' },
    { id: 'reverse', name: 'Reverse Engineering' },
    { id: 'osint', name: 'OSINT' },
    { id: 'misc', name: 'Miscellaneous' }
  ]

  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchChallenges = async (showLoadingState = true) => {
    try {
      if (showLoadingState && isMounted.current) {
        setLoading(true);
      }
      Logger.info('FETCH_CHALLENGES_START');

      const config = token ? {
        headers: {
          Authorization: `Bearer ${token}`
        }
      } : {};

      const res = await axios.get('/api/challenges?page=1&limit=1000', config);

      if (!isMounted.current) return;

      if (!res.data.data || !Array.isArray(res.data.data)) {
        setChallenges([]);
        if (showLoadingState) {
          setLoading(false);
        }
        return;
      }

      const visibleChallenges = user?.role === 'admin'
        ? res.data.data
        : res.data.data.filter(challenge => challenge.isVisible === true);

      setChallenges(visibleChallenges);
      if (showLoadingState) {
        setLoading(false);
      }
      Logger.info('FETCH_CHALLENGES_SUCCESS', {
        count: visibleChallenges.length
      });
    } catch (err) {
      if (!isMounted.current) return;

      Logger.error('FETCH_CHALLENGES_ERROR', { error: err.message });
      setError('Failed to fetch challenges. Please try again.');
      if (showLoadingState) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchChallenges(true);

    // Poll for new challenges every 10 seconds (without showing loading state)
    const pollInterval = setInterval(() => {
      if (isMounted.current) {
        fetchChallenges(false);
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [user?.role, token, isAuthenticated]);

  // Removed redundant openModal function since handleChallengeClick handles navigation
  // const openModal = ...



  const navigate = useNavigate();

  const handleChallengeClick = (challenge) => {
    navigate(`/challenges/${challenge._id}`);
  };

  const filteredChallenges = activeCategory === 'all'
    ? challenges
    : challenges.filter(challenge => challenge.category === activeCategory)

  if (loading) {
    return (
      <div className="challenges-container">
        <div className="loading">Loading challenges...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="challenges-container">
        <div className="error">{error}</div>
      </div>
    )
  }

  return (
    <div className="challenges-container">
      {isEnded && (
        <div style={{
          backgroundColor: 'rgba(139, 92, 246, 0.2)',
          border: '2px solid #8b5cf6',
          color: '#c4b5fd',
          padding: '15px',
          textAlign: 'center',
          marginBottom: '20px',
          borderRadius: '5px',
          fontWeight: 'bold',
          boxShadow: '0 0 15px rgba(139, 92, 246, 0.3)'
        }}>
          CTF Event Has Ended - Flag submissions are no longer accepted
        </div>
      )}
      <div className="challenges-header">
        <div className="header-content">
          <h1 className="page-title">Challenges</h1>

          {!isAuthenticated && (
            <div className="auth-notice">
              <p>🔒 You can view challenges, but you need to <Link to="/login">login</Link> to solve them and earn points!</p>
            </div>
          )}

          <div className="category-nav">
            {categories.map(category => (
              <button
                key={category.id}
                className={`category-button ${activeCategory === category.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>

          {isAuthenticated && user?.role === 'admin' && (
            <Link to="/create-challenge" className="create-challenge-button" style={{ marginTop: '1rem', display: 'inline-block' }}>
              Create Challenge
            </Link>
          )}
        </div>
      </div>

      <div className="challenges-main">
        <div className="challenges-grid">
          {challenges.length === 0 && !loading ? (
            <div className="no-challenges">
              <p>No challenges available at the moment. Please check back later!</p>
            </div>
          ) : filteredChallenges.length === 0 ? (
            <div className="no-challenges">
              <p>No challenges found in this category.</p>
            </div>
          ) : (
            filteredChallenges.map(challenge => {
              const isSolved = user?.solvedChallenges?.includes(challenge._id);
              return (
                <div
                  key={challenge._id}
                  className={`challenge-card ${isSolved ? 'solved' : ''}`}
                  onClick={() => handleChallengeClick(challenge)}
                >
                  <div className="challenge-header">
                    <span className={`difficulty-badge ${challenge.difficulty.toLowerCase()}`}>
                      {challenge.difficulty}
                    </span>
                    <span className="points-badge">
                      {challenge.currentValue || challenge.points} pts
                    </span>
                  </div>
                  <h3 className="challenge-title">
                    {challenge.title}
                    {isSolved && <span className="solved-badge">✓</span>}
                  </h3>
                  <div className="challenge-footer">
                    <span
                      className="solved-count clickable"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChallengeForSolves(challenge);
                        setShowSolvesModal(true);
                      }}
                    >
                      {challenge.solvedBy?.length || 0} solves
                    </span>
                    <button
                      className={`solve-button ${isSolved ? 'solved' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChallengeClick(challenge);
                      }}
                    >
                      {isSolved ? 'Solved ✓' : 'View Challenge'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showSolvesModal && selectedChallengeForSolves && (
        <SolvesModal
          challenge={selectedChallengeForSolves}
          onClose={() => {
            setShowSolvesModal(false);
            setSelectedChallengeForSolves(null);
          }}
        />
      )}

    </div>
  )
}

export default Challenges