import { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import Loading from '../components/Loading';
import './AdminDashboard.css';

function AdminDashboard() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [successMessage, setSuccessMessage] = useState('');
  const [subscribers, setSubscribers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const [userPage, setUserPage] = useState(1);
  const [teamPage, setTeamPage] = useState(1);
  const [challengePage, setChallengePage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [teamTotal, setTeamTotal] = useState(0);
  const [challengeTotal, setChallengeTotal] = useState(0);
  const [noticeTotal, setNoticeTotal] = useState(0);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [userSortBy, setUserSortBy] = useState('createdAt');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [noticeForm, setNoticeForm] = useState({
    title: '',
    description: ''
  });
  const itemsPerPage = 10;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  // Reset handlers removed - use Platform Reset page instead

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(userSearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [userSearchTerm]);

  useEffect(() => {
    const fetchData = async () => {
      // Only show loading for initial load, not for search
      if (!debouncedSearchTerm) {
        setLoading(true);
      } else {
        setSearchLoading(true);
      }
      setError(null);

      try {
        let usersRes;
        if (debouncedSearchTerm) {
          // When searching, get all matching users without pagination
          usersRes = await axios.get(`/api/auth/users?all=true&search=${encodeURIComponent(debouncedSearchTerm)}`);
          setUsers(usersRes.data.users || []);
          setUserTotal(usersRes.data.users?.length || 0);
          setAllUsers(usersRes.data.users || []);
        } else {
          // Normal pagination when not searching
          usersRes = await axios.get(`/api/auth/users?page=${userPage}&limit=${itemsPerPage}`);
          setUsers(usersRes.data.users || []);
          setUserTotal(usersRes.data.total || 0);
        }

        // Only fetch other data on initial load or when not searching
        if (!debouncedSearchTerm) {
          const [challengesRes, subscribersRes, teamsRes, noticesRes] = await Promise.all([
            axios.get(`/api/challenges?page=${challengePage}&limit=${itemsPerPage}`),
            axios.get('/api/newsletter/subscribers').catch(() => ({ data: [] })),
            axios.get(`/api/teams?page=${teamPage}&limit=${itemsPerPage}`).catch(() => ({ data: { data: [] } })),
            axios.get('/api/notices').catch(() => ({ data: { data: [] } }))
          ]);

          setChallenges(challengesRes.data.data || []);
          setChallengeTotal(challengesRes.data.total || 0);
          setSubscribers(subscribersRes.data || []);
          setTeams(teamsRes.data.data || []);
          setTeamTotal(teamsRes.data.total || 0);
          setNotices(noticesRes.data.data || []);
          setNoticeTotal(noticesRes.data.data?.length || 0);
        }

        setLoading(false);
        setSearchLoading(false);
      } catch {
        console.error('Error fetching dashboard data');
        setError('Failed to fetch data. Please try again.');
        setLoading(false);
        setSearchLoading(false);
      }
    };

    fetchData();
  }, [userPage, teamPage, challengePage, debouncedSearchTerm]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    if (debouncedSearchTerm !== '') {
      setUserPage(1);
    }
  }, [debouncedSearchTerm]);



  const handleDeleteChallenge = async (id) => {
    if (!window.confirm('Are you sure you want to delete this challenge?')) return;

    try {
      await axios.delete(`/api/challenges/${id}`);
      setChallenges(challenges.filter(c => c._id !== id));
      setSuccessMessage('Challenge deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      setError('Failed to delete challenge');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteTeam = async (id) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;

    try {
      await axios.delete(`/api/teams/${id}`);
      setTeams(teams.filter(t => t._id !== id));
      setSuccessMessage('Team deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      setError('Failed to delete team');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteSubscriber = async (id) => {
    if (!window.confirm('Are you sure you want to remove this subscriber?')) return;

    try {
      await axios.delete(`/api/newsletter/subscribers/${id}`);
      setSubscribers(subscribers.filter(s => s._id !== id));
      setSuccessMessage('Subscriber removed!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      setError('Failed to delete subscriber');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleToggleVisibility = async (challengeId, currentVisibility) => {
    try {
      await axios.put(
        `/api/challenges/${challengeId}`,
        { isVisible: !currentVisibility }
      );

      setChallenges(challenges.map(c =>
        c._id === challengeId ? { ...c, isVisible: !currentVisibility } : c
      ));
      setSuccessMessage(`Challenge ${!currentVisibility ? 'shown' : 'hidden'}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      setError('Failed to update visibility');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUserClick = (userId) => {
    navigate(`/admin/users/${userId}`);
  };

  const handleDeleteNotice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;

    try {
      await axios.delete(`/api/notices/${id}`);
      setNotices(notices.filter(n => n._id !== id));
      setSuccessMessage('Notice deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      setError('Failed to delete notice');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSubmitNotice = async (e) => {
    e.preventDefault();

    if (!noticeForm.title || !noticeForm.description) {
      setError('Please fill in title and description');
      return;
    }

    try {
      if (editingNotice) {
        const response = await axios.put(
          `/api/notices/${editingNotice._id}`,
          noticeForm
        );
        setNotices(notices.map(n => n._id === editingNotice._id ? response.data.data : n));
        setSuccessMessage('Notice updated successfully!');
      } else {
        const response = await axios.post('/api/notices', noticeForm);
        setNotices([response.data.data, ...notices]);
        setSuccessMessage('Notice created successfully!');
      }

      setNoticeForm({
        title: '',
        description: ''
      });
      setEditingNotice(null);
      setShowNoticeForm(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save notice');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleEditNotice = (notice) => {
    setEditingNotice(notice);
    setNoticeForm({
      title: notice.title,
      description: notice.description
    });
    setShowNoticeForm(true);
  };

  const handleCancelNoticeForm = () => {
    setShowNoticeForm(false);
    setEditingNotice(null);
    setNoticeForm({
      title: '',
      description: ''
    });
  };

  // Apply client-side filtering for role and status (search is handled by backend)
  const filteredUsers = users.filter(u => {
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesStatus = userStatusFilter === 'all' ||
      (userStatusFilter === 'active' && !u.isBlocked) ||
      (userStatusFilter === 'blocked' && u.isBlocked);
    return matchesRole && matchesStatus;
  }).sort((a, b) => {
    switch (userSortBy) {
      case 'points':
        return (b.points || 0) - (a.points || 0);
      case 'username':
        return a.username.localeCompare(b.username);
      case 'email':
        return a.email.localeCompare(b.email);
      case 'createdAt':
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  const handleChangeRole = async (userId, newRole) => {
    if (!window.confirm(`Change user role to ${newRole}?`)) return;

    try {
      await axios.put(
        `/api/auth/users/${userId}/role`,
        { newRole }
      );

      setUsers(users.map(u =>
        u._id === userId ? { ...u, role: newRole } : u
      ));
      setSuccessMessage(`User role changed to ${newRole}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to change role';
      setError(errorMsg);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleBlockUser = async (userId, username, isCurrentlyBlocked) => {
    const action = isCurrentlyBlocked ? 'unblock' : 'block';
    const reason = isCurrentlyBlocked ? null : prompt('Enter reason for blocking (optional):');

    if (!isCurrentlyBlocked && reason === null) return; // User cancelled

    if (!window.confirm(`Are you sure you want to ${action} user "${username}"?`)) return;

    try {
      await axios.put(
        `/api/auth/users/${userId}/block`,
        {
          isBlocked: !isCurrentlyBlocked,
          reason: reason || 'No reason provided'
        }
      );

      setUsers(users.map(u =>
        u._id === userId ? { ...u, isBlocked: !isCurrentlyBlocked, blockedReason: reason } : u
      ));
      setSuccessMessage(`User ${action}ed successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || `Failed to ${action} user`;
      setError(errorMsg);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) return;

    try {
      await axios.delete(`/api/auth/users/${userId}`);

      setUsers(users.filter(u => u._id !== userId));
      setSuccessMessage('User deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to delete user';
      setError(errorMsg);
      setTimeout(() => setError(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <Loading size="medium" text="Loading dashboard" />
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin <span className="highlight">Dashboard</span></h1>
        <p>Manage users, teams, and challenges</p>
      </div>

      {successMessage && <div className="success-message">{successMessage}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users ({userTotal})
        </button>
        <button
          className={`tab-button ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          Teams ({teamTotal})
        </button>
        <button
          className={`tab-button ${activeTab === 'challenges' ? 'active' : ''}`}
          onClick={() => setActiveTab('challenges')}
        >
          Challenges ({challengeTotal})
        </button>
        <button
          className="tab-button"
          onClick={() => navigate('/admin/analytics')}
        >
          Analytics
        </button>
        <button
          className="tab-button"
          onClick={() => navigate('/admin/submissions')}
        >
          Submissions
        </button>
        <button
          className="tab-button"
          onClick={() => navigate('/admin/live-monitor')}
        >
          Live Monitor
        </button>
        <button
          className={`tab-button ${activeTab === 'platform-control' ? 'active' : ''}`}
          onClick={() => navigate('/admin/platform-control')}
        >
          Platform Control
        </button>
        <button
          className={`tab-button ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => navigate('/admin/messages')}
        >
          Messages
        </button>
        <button
          className={`tab-button ${activeTab === 'login-logs' ? 'active' : ''}`}
          onClick={() => navigate('/admin/login-logs')}
        >
          Login Logs
        </button>
        <button
          className={`tab-button ${activeTab === 'subscribers' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscribers')}
        >
          Subscribers ({subscribers?.length || 0})
        </button>
        <button
          className={`tab-button ${activeTab === 'notices' ? 'active' : ''}`}
          onClick={() => setActiveTab('notices')}
        >
          Notices ({noticeTotal})
        </button>
        <button
          className="tab-button danger"
          onClick={() => navigate('/admin/platform-reset')}
        >
          Platform Reset
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>User Management</h2>
            <Link to="/admin/create-user" className="btn-primary">+ Create User</Link>
          </div>

          <div className="user-filters">
            <input
              type="text"
              placeholder="Search users by username or email..."
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              className="search-input"
            />
            <select value={userSortBy} onChange={(e) => setUserSortBy(e.target.value)} className="sort-select">
              <option value="createdAt">Newest Users</option>
              <option value="points">Highest Points</option>
              <option value="username">Username (A-Z)</option>
              <option value="email">Email (A-Z)</option>
            </select>
            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="sort-select"
            >
              <option value="all">All Roles</option>
              <option value="user">Users Only</option>
              <option value="admin">Admins Only</option>
            </select>
            <select
              value={userStatusFilter}
              onChange={(e) => setUserStatusFilter(e.target.value)}
              className="sort-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="blocked">Blocked Only</option>
            </select>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Points</th>
                  <th>Status</th>
                  <th>Challenges Solved</th>
                  <th>Joined</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u._id}>
                    <td>
                      <strong>{u.username}</strong>
                      {u.isBlocked && <span style={{ color: '#ff4444', marginLeft: '0.5rem', fontSize: '0.8rem' }}>🚫</span>}
                    </td>
                    <td title={u.email}>{u.email}</td>
                    <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                    <td>
                      <strong style={{ color: '#00ffaa' }}>{u.points}</strong>
                    </td>
                    <td>
                      <span className={`status-badge ${u.isBlocked ? 'blocked' : 'active'}`}>
                        {u.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#00aaff' }}>{u.solvedChallenges?.length || 0}</span>
                      {(u.solvedChallenges?.length || 0) > 0 &&
                        <span style={{ marginLeft: '0.3rem', fontSize: '0.8rem' }}>🏆</span>
                      }
                    </td>
                    <td title={new Date(u.createdAt).toLocaleString()}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        className="btn-link"
                        onClick={() => handleUserClick(u._id)}
                      >
                        View
                      </button>
                      {user?.role === 'admin' && u.role !== 'superadmin' && (
                        <>
                          {u.role === 'user' ? (
                            <button
                              className="btn-secondary"
                              onClick={() => handleChangeRole(u._id, 'admin')}
                              style={{ marginLeft: '0.5rem' }}
                            >
                              → Admin
                            </button>
                          ) : (
                            <button
                              className="btn-secondary"
                              onClick={() => handleChangeRole(u._id, 'user')}
                              style={{ marginLeft: '0.5rem' }}
                            >
                              → User
                            </button>
                          )}
                        </>
                      )}
                      {user?.role === 'admin' && u.role !== 'superadmin' && (
                        <>
                          <button
                            className={u.isBlocked ? 'btn-secondary' : 'btn-warning'}
                            onClick={() => handleBlockUser(u._id, u.username, u.isBlocked)}
                            style={{ marginLeft: '0.5rem' }}
                          >
                            {u.isBlocked ? 'Unblock' : 'Block'}
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteUser(u._id, u.username)}
                            style={{ marginLeft: '0.5rem' }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            {!debouncedSearchTerm && (
              <>
                <button
                  onClick={() => setUserPage(Math.max(1, userPage - 1))}
                  disabled={userPage === 1}
                  className="pagination-btn"
                >
                  Previous
                </button>
                <button
                  onClick={() => setUserPage(userPage + 1)}
                  disabled={userPage >= Math.ceil(userTotal / itemsPerPage)}
                  className="pagination-btn"
                >
                  Next
                </button>
              </>
            )}
            <span className="pagination-info">
              {debouncedSearchTerm ? (
                `Found ${filteredUsers.length} users matching "${debouncedSearchTerm}"`
              ) : (
                `Page ${userPage} of ${Math.ceil(userTotal / itemsPerPage) || 1} ({filteredUsers.length} of ${userTotal} users)`
              )}
            </span>
          </div>
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Teams</h2>
            <Link to="/admin/create-team" className="btn-primary">+ Create Team</Link>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Team Name</th>
                  <th>Members</th>
                  <th>Points</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {teams.map(t => (
                  <tr key={t._id}>
                    <td>{t.name}</td>
                    <td>{t.members?.length || 0}/2</td>
                    <td>{t.points || 0}</td>
                    <td>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteTeam(t._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button
              onClick={() => setTeamPage(Math.max(1, teamPage - 1))}
              disabled={teamPage === 1}
              className="pagination-btn"
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {teamPage} of {Math.ceil(teamTotal / itemsPerPage) || 1}
            </span>
            <button
              onClick={() => setTeamPage(teamPage + 1)}
              disabled={teamPage >= Math.ceil(teamTotal / itemsPerPage)}
              className="pagination-btn"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {activeTab === 'challenges' && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Challenge Management</h2>
            <Link to="/create-challenge" className="btn-primary">Create Challenge</Link>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Points</th>
                  <th>Visible</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {challenges.map(c => (
                  <tr key={c._id}>
                    <td>{c.title}</td>
                    <td>{c.category}</td>
                    <td>{c.points}</td>
                    <td>
                      <button
                        className={`visibility-btn ${c.isVisible ? 'visible' : 'hidden'}`}
                        onClick={() => handleToggleVisibility(c._id, c.isVisible)}
                      >
                        {c.isVisible ? 'Show' : 'Hide'}
                      </button>
                    </td>
                    <td>
                      <Link to={`/edit-challenge/${c._id}`} className="btn-link">Edit</Link>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteChallenge(c._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button
              onClick={() => setChallengePage(Math.max(1, challengePage - 1))}
              disabled={challengePage === 1}
              className="pagination-btn"
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {challengePage} of {Math.ceil(challengeTotal / itemsPerPage) || 1}
            </span>
            <button
              onClick={() => setChallengePage(challengePage + 1)}
              disabled={challengePage >= Math.ceil(challengeTotal / itemsPerPage)}
              className="pagination-btn"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {activeTab === 'subscribers' && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Newsletter Subscribers</h2>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Subscribed</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map(s => (
                  <tr key={s._id}>
                    <td>{s.email}</td>
                    <td>{new Date(s.subscribedAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteSubscriber(s._id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'notices' && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Notice Management</h2>
            <button
              className="btn-primary"
              onClick={() => setShowNoticeForm(!showNoticeForm)}
            >
              {showNoticeForm ? '✕ Cancel' : '+ Create Notice'}
            </button>
          </div>

          {showNoticeForm && (
            <form className="notice-form" onSubmit={handleSubmitNotice}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                  placeholder="Enter notice title"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={noticeForm.description}
                  onChange={(e) => setNoticeForm({ ...noticeForm, description: e.target.value })}
                  placeholder="Enter notice description"
                  rows="6"
                  required
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingNotice ? 'Update Notice' : 'Create Notice'}
                </button>
                <button type="button" className="btn-secondary" onClick={handleCancelNoticeForm}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Created By</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notices.map(n => (
                  <tr key={n._id}>
                    <td>{n.title}</td>
                    <td>{n.createdBy?.username || 'Unknown'}</td>
                    <td>{new Date(n.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn-link"
                        onClick={() => handleEditNotice(n)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteNotice(n._id)}
                        style={{ marginLeft: '0.5rem' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {notices.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
              No notices yet. Create one to get started!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
