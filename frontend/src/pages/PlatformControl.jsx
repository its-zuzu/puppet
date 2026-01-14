import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { useEventState } from '../hooks/useEventState';
import Loading from '../components/Loading';
import './PlatformControl.css';

function PlatformControl() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const { eventState, customMessage, refresh } = useEventState();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageInput, setMessageInput] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  };

  const handleStartEvent = async () => {
    if (!window.confirm('Start the CTF event? This will allow all flag submissions.')) return;

    setLoading(true);
    try {
      const res = await axios.post('/api/event-control/start', {});
      showSuccess(res.data.message);
      refresh();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to start event');
    } finally {
      setLoading(false);
    }
  };

  const handleEndEvent = async () => {
    if (!window.confirm('END the CTF event? This will FREEZE the leaderboard and BLOCK all submissions. This action is critical!')) return;

    setLoading(true);
    try {
      const res = await axios.post('/api/event-control/end', {});
      showSuccess(res.data.message);
      refresh();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to end event');
    } finally {
      setLoading(false);
    }
  };

  const handleSetMessage = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/event-control/set-message',
        { message: messageInput || null }
      );
      showSuccess(res.data.message);
      setShowMessageModal(false);
      setMessageInput('');
      refresh();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to set message');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockAllUsers = async () => {
    if (!window.confirm('Unblock all users? This will remove all user blocks.')) return;

    setLoading(true);
    try {
      const res = await axios.put('/api/auth/platform-control/unblock-all-users', {});
      showSuccess(`${res.data.data?.unblockedCount || 0} users unblocked`);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to unblock users');
    } finally {
      setLoading(false);
    }
  };

  if (!eventState) {
    return <Loading size="medium" text="Loading control panel" />;
  }

  return (
    <div className="platform-control">
      <div className="control-header">
        <button onClick={() => navigate('/admin')} className="back-button">
          ← Back to Dashboard
        </button>
        <h1>CTF Event Control</h1>
        <p>Manage the CTF event state and display custom messages</p>
      </div>

      {successMessage && <div className="success-banner">{successMessage}</div>}
      {error && <div className="error-banner">{error}</div>}

      {/* Event Status Card */}
      <div className="status-card">
        <div className="status-header">
          <h2>Current Status</h2>
          <div className={`status-indicator ${eventState.status}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {eventState.status === 'not_started' ? 'Not Started' :
                eventState.status === 'started' ? 'Active' : 'Ended'}
            </span>
          </div>
        </div>

        <div className="status-details">
          {eventState.startedAt && (
            <div className="status-item">
              <span className="label">Started:</span>
              <span className="value">{new Date(eventState.startedAt).toLocaleString()}</span>
            </div>
          )}
          {eventState.endedAt && (
            <div className="status-item">
              <span className="label">Ended:</span>
              <span className="value">{new Date(eventState.endedAt).toLocaleString()}</span>
            </div>
          )}
          {customMessage && (
            <div className="status-item message-preview">
              <span className="label">Active Message:</span>
              <span className="value">"{customMessage}"</span>
            </div>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="control-buttons">
        <button
          className="control-btn start-btn"
          onClick={handleStartEvent}
          disabled={loading || (eventState.status === 'started' && !customMessage)}
        >
          <span className="btn-icon">▶️</span>
          <span className="btn-text">START EVENT</span>
        </button>

        <button
          className="control-btn message-btn"
          onClick={() => {
            setMessageInput(customMessage || '');
            setShowMessageModal(true);
          }}
          disabled={loading}
        >
          <span className="btn-icon">📢</span>
          <span className="btn-text">SET MESSAGE</span>
        </button>

        <button
          className="control-btn end-btn"
          onClick={handleEndEvent}
          disabled={loading || eventState.status === 'ended'}
        >
          <span className="btn-icon">🏁</span>
          <span className="btn-text">END EVENT</span>
        </button>
      </div>

      {/* Utility Section */}
      <div className="utility-section">
        <h3>Utilities</h3>
        <button
          className="utility-btn"
          onClick={handleUnblockAllUsers}
          disabled={loading}
        >
          🔓 Unblock All Users
        </button>
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="modal-overlay" onClick={() => setShowMessageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Set Custom Message</h3>
              <button className="modal-close" onClick={() => setShowMessageModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-description">
                This message will be displayed on the Challenges and Scoreboard pages.
                Use it to announce when the CTF will start or provide important updates.
              </p>
              <textarea
                className="message-input"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Enter your message (e.g., 'CTF starts in 30 minutes!')"
                maxLength={500}
                rows={4}
              />
              <div className="char-count">{messageInput.length}/500</div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn clear-btn"
                onClick={() => setMessageInput('')}
              >
                Clear
              </button>
              <button
                className="modal-btn cancel-btn"
                onClick={() => setShowMessageModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn save-btn"
                onClick={handleSetMessage}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlatformControl;
