import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import Loading from '../components/Loading';
import './Notice.css';

function Notice() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const { isAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    fetchNotices();
    markAllAsRead();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/notices');
      setNotices(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching notices:', err);
      setError('Failed to load notices. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    if (!isAuthenticated) return;
    
    try {
      await axios.post('/api/notices/mark-all-read');
      // Notify navbar to update badge
      setTimeout(() => {
        window.dispatchEvent(new Event('noticeRead'));
      }, 500);
    } catch (err) {
      console.error('Error marking all notices as read:', err);
    }
  };

  const markAsRead = async (noticeId) => {
    if (!isAuthenticated) return;
    
    try {
      await axios.post(`/api/notices/${noticeId}/mark-read`);
    } catch (err) {
      console.error('Error marking notice as read:', err);
    }
  };

  const handleNoticeClick = (notice) => {
    setSelectedNotice(notice);
  };

  if (loading) {
    return (
      <div className="notice-page">
        <Loading size="large" text="Loading notices" />
      </div>
    );
  }

  return (
    <div className="notice-page">
      <div className="notice-header">
        <h1>Event <span className="highlight">Notices</span></h1>
        <p>Important information and guidelines for events</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {selectedNotice ? (
        <div className="notice-detail">
          <button className="back-btn" onClick={() => setSelectedNotice(null)}>
            ← Back to Notices
          </button>

          <div className="detail-card">
            <h1>{selectedNotice.title}</h1>
            
            <div className="meta-info">
              <span className="posted-by">Posted by: {selectedNotice.createdBy?.username || 'Admin'}</span>
              <span className="posted-date">{new Date(selectedNotice.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>

            <div className="section">
              <div className="content-text">
                {selectedNotice.description}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="notices-list">
          {notices.length === 0 ? (
            <div className="empty-state">
              <p>No notices at the moment.</p>
              <p>Check back soon for important event information!</p>
            </div>
          ) : (
            <div className="notices-grid">
              {notices.map(notice => (
                <div 
                  key={notice._id} 
                  className="notice-card"
                  onClick={() => handleNoticeClick(notice)}
                >
                  <div className="notice-title">{notice.title}</div>
                  <div className="notice-meta">
                    <span className="author">{notice.createdBy?.username || 'Admin'}</span>
                    <span className="date">
                      {new Date(notice.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="notice-preview">
                    {notice.description}
                  </div>
                  <div className="read-more">View Full Notice →</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Notice;
