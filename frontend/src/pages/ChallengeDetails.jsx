import { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import AuthContext from '../context/AuthContext'
import { useEventState } from '../hooks/useEventState'
import './ChallengeDetails.css'

const SolvesModal = ({ challenge, onClose }) => {
  const [solves, setSolves] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const fetchSolves = async () => {
      try {
        const config = token ? {
          headers: {
            Authorization: `Bearer ${token}`
          }
        } : {};
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
  const { isEnded } = useEventState();

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

        {isEnded && (
          <div className="modal-error" style={{
            backgroundColor: 'rgba(139, 92, 246, 0.2)',
            border: '2px solid #8b5cf6',
            color: '#c4b5fd',
            padding: '15px',
            marginBottom: '15px',
            boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)'
          }}>
            CTF Event Has Ended - Submissions are no longer accepted
          </div>
        )}
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
              placeholder="Enter the flag SECE{flag_here}"
              autoComplete="off"
              disabled={isSubmitting || success || isEnded}
            />
          </div>

          <button
            type="submit"
            className="submit-flag-button"
            disabled={isSubmitting || success || isEnded}
          >
            {isEnded ? 'Event Ended' : isSubmitting ? 'Submitting...' : 'Submit Flag'}
          </button>
        </form>
      </div>
    </div>
  );
};

function ChallengeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [unlockedHints, setUnlockedHints] = useState([]);
  const [unlockingHint, setUnlockingHint] = useState(null);
  const [showSolvesModal, setShowSolvesModal] = useState(false);
  const { user, isAuthenticated, token, updateUserData } = useContext(AuthContext);
  const { eventState, isEnded } = useEventState();

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        setLoading(true);
        const config = token ? {
          headers: { Authorization: `Bearer ${token}` }
        } : {};

        const res = await axios.get(`/api/challenges/${id}`, config);
        setChallenge(res.data.data);
        setUnlockedHints(res.data.unlockedHints || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching challenge:', err);
        setError('Challenge not found');
        setLoading(false);
      }
    };

    fetchChallenge();
  }, [id, token]);

  const openModal = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const submitFlag = async (flag) => {
    if (!challenge || !isAuthenticated) {
      throw new Error('Challenge not found or user not authenticated');
    }

    try {
      const res = await axios.post(
        `/api/challenges/${challenge._id}/submit`,
        { flag },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await updateUserData();
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to submit flag');
    }
  };

  const unlockHint = async (hintIndex) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const hint = challenge.hints[hintIndex];
    const userPoints = user.points || 0;
    const hasTeam = user.team && user.team._id;

    // If user has a team, fetch the latest team points using the team ID
    let teamPoints = 0;
    if (hasTeam) {
      try {
        const teamRes = await axios.get(`/api/teams/${user.team._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Calculate team points from members (as backend does)
        const calculatedPoints = teamRes.data.data.members.reduce((sum, member) => sum + (member.points || 0), 0);
        teamPoints = calculatedPoints || teamRes.data.data.points || 0;
        console.log('Fetched team points:', teamPoints);
      } catch (err) {
        console.error('Error fetching team points:', err);
        // Fallback to user.team.points if fetch fails
        teamPoints = user.team.points || 0;
      }
    }

    // Use team points if in a team, otherwise use individual points
    const availablePoints = hasTeam ? teamPoints : userPoints;
    const pointsType = hasTeam ? 'team' : 'individual';

    // Check if enough points available
    if (availablePoints < hint.cost) {
      alert(`Insufficient points! You need ${hint.cost} points but have ${availablePoints} ${pointsType} points.`);
      return;
    }

    const confirmMessage = `Are you sure you want to unlock this hint for ${hint.cost} points?\n\nTeam points: ${teamPoints}\nAfter unlock: ${teamPoints - hint.cost} points`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setUnlockingHint(hintIndex);
      const res = await axios.post(
        `/api/challenges/${challenge._id}/unlock-hint`,
        { hintIndex },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update unlocked hints
      setUnlockedHints([...unlockedHints, hintIndex]);

      // Update user data to reflect new points
      await updateUserData();

      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unlock hint');
    } finally {
      setUnlockingHint(null);
    }
  };

  if (loading) {
    return (
      <div className="challenge-details-container">
        <div className="loading">Loading challenge...</div>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="challenge-details-container">
        <div className="error">{error || 'Challenge not found'}</div>
        <button onClick={() => navigate('/challenges')} className="back-button">
          ← Back to Challenges
        </button>
      </div>
    );
  }

  const isSolved = user?.solvedChallenges?.includes(challenge._id);

  return (
    <div className="challenge-details-container">
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
      <div className="challenge-details-header">
        <button onClick={() => navigate('/challenges')} className="back-button">
          ← Back to Challenges
        </button>
        <div className="header-content">
          <h1>{challenge.title}</h1>
        </div>
      </div>

      <div className="challenges-main">
        <div className="challenge-details-content">
          <div className="challenge-meta">
            <span className="points-badge">{challenge.points} pts</span>
            <span className="category-badge">{challenge.category}</span>
            <span
              className="solved-count clickable"
              onClick={() => setShowSolvesModal(true)}
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
            >
              {challenge.solvedBy?.length || 0} solves
            </span>
          </div>

          <div className="description">
            <h3>Description</h3>
            <p>{challenge.description}</p>
          </div>

          {challenge.hints && challenge.hints.length > 0 && (
            <div className="hints">
              <h3>Hints</h3>
              {challenge.hints.map((hint, index) => {
                const isUnlocked = unlockedHints.includes(index);
                const isFree = hint.cost === 0;
                const showContent = isFree || isUnlocked;

                return (
                  <div key={index} className={`hint-item ${showContent ? 'unlocked' : 'locked'}`}>
                    {showContent ? (
                      <p>{hint.content}</p>
                    ) : (
                      <div className="locked-hint">
                        <button
                          className="unlock-hint-button"
                          onClick={() => unlockHint(index)}
                          disabled={!isAuthenticated || unlockingHint === index}
                        >
                          {unlockingHint === index ? 'Unlocking...' : `Unlock Hint for ${hint.cost} points`}
                        </button>
                        {!isAuthenticated && (
                          <p className="login-hint">Login to unlock this hint</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="challenge-actions">
            {isEnded ? (
              <div style={{
                padding: '15px',
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                border: '2px solid #8b5cf6',
                borderRadius: '5px',
                textAlign: 'center',
                color: '#c4b5fd',
                fontWeight: 'bold',
                boxShadow: '0 0 10px rgba(139, 92, 246, 0.2)'
              }}>
                CTF Event Has Ended - Flag submissions are no longer accepted
              </div>
            ) : (
              <button
                className={`solve-challenge-button ${!isAuthenticated ? 'login-required' : ''}`}
                onClick={openModal}
                disabled={isSolved}
              >
                {isSolved ? 'Solved ✓' : isAuthenticated ? 'Submit Flag' : 'Login to Solve'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showSolvesModal && challenge && (
        <SolvesModal
          challenge={challenge}
          onClose={() => setShowSolvesModal(false)}
        />
      )}

      {showModal && challenge && (
        <FlagSubmissionModal
          challenge={challenge}
          onClose={closeModal}
          onSubmit={submitFlag}
        />
      )}
    </div>
  );
}

export default ChallengeDetails;