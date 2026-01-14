import { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUsers, FaFlag, FaEnvelope, FaBell, FaChartLine, FaShieldAlt, FaTrash, FaEdit, FaEye, FaEyeSlash, FaSearch, FaPlus, FaBan, FaCheck, FaTimes } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import Loading from '../components/Loading';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

function AdminDashboard() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);

  // Data States
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [notices, setNotices] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [counts, setCounts] = useState({ users: 0, teams: 0, challenges: 0, notices: 0 });

  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [noticeForm, setNoticeForm] = useState({ title: '', description: '' });
  const [msg, setMsg] = useState({ type: '', content: '' });

  useEffect(() => {
    if (!isAuthenticated || (user && user.role !== 'admin')) navigate('/login');
    fetchData();
  }, [user, navigate, isAuthenticated]);

  const fetchData = async () => {
    try {
      const [uRes, tRes, cRes, nRes, sRes] = await Promise.all([
        axios.get('/api/auth/users?page=1&limit=1000'), // Get all for client-side filtering simplicity in redesign
        axios.get('/api/teams?page=1&limit=1000'),
        axios.get('/api/challenges?page=1&limit=1000'),
        axios.get('/api/notices'),
        axios.get('/api/newsletter/subscribers').catch(() => ({ data: [] }))
      ]);

      const allUsers = uRes.data.users || uRes.data.data || []; // Handle API variations
      setUsers(allUsers);
      setTeams(tRes.data.data || []);
      setChallenges(cRes.data.data || []);
      setNotices(nRes.data.data || []);
      setSubscribers(sRes.data || []);

      setCounts({
        users: uRes.data.total || allUsers.length,
        teams: tRes.data.total || (tRes.data.data || []).length,
        challenges: cRes.data.total || (cRes.data.data || []).length,
        notices: (nRes.data.data || []).length
      });

      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const showToast = (type, content) => {
    setMsg({ type, content });
    setTimeout(() => setMsg({ type: '', content: '' }), 3000);
  };

  // Actions
  const handleUserAction = async (id, action, payload = {}) => {
    if (!window.confirm('Confirm Action?')) return;
    try {
      if (action === 'delete') {
        await axios.delete(`/api/auth/users/${id}`);
        setUsers(users.filter(u => u._id !== id));
      } else if (action === 'role') {
        await axios.put(`/api/auth/users/${id}/role`, { newRole: payload.role });
        setUsers(users.map(u => u._id === id ? { ...u, role: payload.role } : u));
      } else if (action === 'block') {
        await axios.put(`/api/auth/users/${id}/block`, { isBlocked: payload.isBlocked });
        setUsers(users.map(u => u._id === id ? { ...u, isBlocked: payload.isBlocked } : u));
      }
      showToast('success', 'User updated successfully');
    } catch (e) { showToast('error', 'Action failed'); }
  };

  const handleChallengeAction = async (id, action) => {
    if (action === 'delete' && !window.confirm('Delete this challenge?')) return;
    try {
      if (action === 'delete') {
        await axios.delete(`/api/challenges/${id}`);
        setChallenges(challenges.filter(c => c._id !== id));
      } else if (action === 'toggle') {
        const task = challenges.find(c => c._id === id);
        await axios.put(`/api/challenges/${id}`, { isVisible: !task.isVisible });
        setChallenges(challenges.map(c => c._id === id ? { ...c, isVisible: !c.isVisible } : c));
      }
      showToast('success', 'Challenge updated');
    } catch (e) { showToast('error', 'Action failed'); }
  };

  const saveNotice = async (e) => {
    e.preventDefault();
    try {
      if (editingNotice) {
        const res = await axios.put(`/api/notices/${editingNotice._id}`, noticeForm);
        setNotices(notices.map(n => n._id === editingNotice._id ? res.data.data : n));
      } else {
        const res = await axios.post('/api/notices', noticeForm);
        setNotices([res.data.data, ...notices]);
      }
      setShowNoticeModal(false);
      setNoticeForm({ title: '', description: '' });
      setEditingNotice(null);
      showToast('success', 'Notice saved');
    } catch (e) { showToast('error', 'Failed to save notice'); }
  };

  const deleteNotice = async (id) => {
    if (!window.confirm('Delete notice?')) return;
    try {
      await axios.delete(`/api/notices/${id}`);
      setNotices(notices.filter(n => n._id !== id));
      showToast('success', 'Notice deleted');
    } catch (e) { showToast('error', 'Failed to delete'); }
  };

  if (loading) return <Loading size="large" text="Loading Admin Interface..." />;

  // Filter Users
  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-4 pb-20 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-4xl font-heading font-bold mb-2 uppercase tracking-widest text-[var(--neon-blue)]">
          Command <span className="text-white">Center</span>
        </h1>
        <div className="flex flex-wrap gap-2 text-sm font-mono text-[var(--text-secondary)]">
          <span className="bg-blue-900/30 px-2 py-1 rounded border border-blue-500/30">Administrator Access Granted</span>
          <span className="bg-green-900/30 px-2 py-1 rounded border border-green-500/30">System Online</span>
        </div>
      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {msg.content && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`fixed top-24 right-4 z-50 px-6 py-3 rounded shadow-xl border ${msg.type === 'error' ? 'bg-red-900/80 border-red-500' : 'bg-green-900/80 border-green-500'}`}
          >
            {msg.content}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 bg-[rgba(0,0,0,0.3)] p-2 rounded-xl border border-[rgba(255,255,255,0.1)]">
        {[
          { id: 'users', icon: <FaUsers />, label: `Users (${counts.users})` },
          { id: 'teams', icon: <FaShieldAlt />, label: `Teams (${counts.teams})` },
          { id: 'challenges', icon: <FaFlag />, label: `Challenges (${counts.challenges})` },
          { id: 'notices', icon: <FaBell />, label: `Notices (${counts.notices})` },
          { id: 'subscribers', icon: <FaEnvelope />, label: 'Subscribers' },
          { id: 'analytics', icon: <FaChartLine />, label: 'Analytics', link: '/admin/analytics' },
        ].map(tab => (
          tab.link ? (
            <Link key={tab.id} to={tab.link}>
              <Button variant="ghost" size="sm" className="opacity-70 hover:opacity-100">{tab.icon} {tab.label}</Button>
            </Link>
          ) : (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wide transition-all
                        ${activeTab === tab.id ? 'bg-[var(--neon-blue)] text-black shadow-[0_0_10px_rgba(0,243,255,0.4)]' : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.05)]'}
                    `}
            >
              {tab.icon} <span className="hidden md:inline">{tab.label}</span>
            </button>
          )
        ))}
      </div>

      {/* Content Area */}
      <motion.div layout>
        {/* USERS TAB */}
        {activeTab === 'users' && (
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-[rgba(255,255,255,0.1)] flex justify-between items-center bg-[rgba(255,255,255,0.02)]">
              <div className="w-64">
                <Input
                  placeholder="Search operatives..."
                  icon={<FaSearch />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-0"
                />
              </div>
              <Link to="/admin/create-user"><Button variant="primary" size="sm"><FaPlus /> New User</Button></Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[rgba(0,0,0,0.2)] text-[var(--neon-blue)] font-mono text-xs uppercase">
                  <tr>
                    <th className="p-4">Username</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Stats</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.05)] text-sm">
                  {filteredUsers.map(u => (
                    <tr key={u._id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      <td className="p-4">
                        <div className="font-bold flex items-center gap-2">
                          {u.username}
                          {u.isBlocked && <span className="text-[var(--neon-pink)] text-xs border border-[var(--neon-pink)] px-1 rounded">BLOCKED</span>}
                        </div>
                        <div className="text-[var(--text-dim)] text-xs">{u.email}</div>
                      </td>
                      <td className="p-4 font-mono">{u.role}</td>
                      <td className="p-4">
                        <div className="text-[var(--neon-green)] font-bold">{u.points} PTS</div>
                        <div className="text-[var(--text-dim)] text-xs">{u.solvedChallenges?.length || 0} solves</div>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Link to={`/users/${u._id}`} className="text-[var(--neon-blue)] hover:underline mr-2">View Profile</Link>
                        {u.role !== 'superadmin' && user._id !== u._id && (
                          <>
                            <button
                              onClick={() => handleUserAction(u._id, 'block', { isBlocked: !u.isBlocked })}
                              className={`p-2 rounded hover:bg-white/10 ${u.isBlocked ? 'text-green-400' : 'text-yellow-400'}`}
                              title={u.isBlocked ? "Unblock" : "Block"}
                            >
                              {u.isBlocked ? <FaCheck /> : <FaBan />}
                            </button>
                            <button
                              onClick={() => handleUserAction(u._id, 'delete')}
                              className="p-2 rounded hover:bg-white/10 text-[var(--neon-pink)]"
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && <div className="p-8 text-center text-[var(--text-dim)]">No operatives found matching criteria.</div>}
          </Card>
        )}

        {/* CHALLENGES TAB */}
        {activeTab === 'challenges' && (
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-[rgba(255,255,255,0.1)] flex justify-between items-center bg-[rgba(255,255,255,0.02)]">
              <Link to="/create-challenge"><Button variant="primary" size="sm"><FaPlus /> Create Challenge</Button></Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[rgba(0,0,0,0.2)] text-[var(--neon-blue)] font-mono text-xs uppercase">
                  <tr>
                    <th className="p-4">Title / Category</th>
                    <th className="p-4">Points</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.05)] text-sm">
                  {challenges.map(c => (
                    <tr key={c._id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      <td className="p-4">
                        <div className="font-bold">{c.title}</div>
                        <div className="text-[var(--text-dim)] text-xs uppercase badge">{c.category}</div>
                      </td>
                      <td className="p-4 font-mono font-bold text-[var(--neon-green)]">{c.points}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${c.isVisible ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                          {c.isVisible ? 'VISIBLE' : 'HIDDEN'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => handleChallengeAction(c._id, 'toggle')} className="text-blue-400 hover:text-white mx-1">
                          {c.isVisible ? <FaEyeSlash /> : <FaEye />}
                        </button>
                        <Link to={`/edit-challenge/${c._id}`} className="text-yellow-400 hover:text-white mx-1 inline-block"><FaEdit /></Link>
                        <button onClick={() => handleChallengeAction(c._id, 'delete')} className="text-red-500 hover:text-white mx-1"><FaTrash /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* NOTICES TAB */}
        {activeTab === 'notices' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">System Announcements</h2>
              <Button variant="primary" size="sm" onClick={() => { setEditingNotice(null); setNoticeForm({ title: '', description: '' }); setShowNoticeModal(true); }}>
                <FaPlus /> New Notice
              </Button>
            </div>
            <div className="grid gap-4">
              {notices.map(n => (
                <Card key={n._id} className="p-4 border-l-4 border-l-[var(--neon-blue)]">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-white">{n.title}</h3>
                      <p className="text-[var(--text-secondary)] mt-1">{n.description}</p>
                      <div className="text-xs text-[var(--text-dim)] mt-2">{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingNotice(n); setNoticeForm(n); setShowNoticeModal(true); }} className="text-yellow-400 p-2 hover:bg-white/5 rounded">
                        <FaEdit />
                      </button>
                      <button onClick={() => deleteNotice(n._id)} className="text-red-500 p-2 hover:bg-white/5 rounded">
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TEAMS & SUBSCRIBERS - Simple Tables */}
        {(activeTab === 'teams' || activeTab === 'subscribers') && (
          <Card className="p-0 overflow-hidden">
            <div className="p-4 bg-[rgba(255,255,255,0.02)] text-[var(--text-dim)]">
              Displaying {activeTab === 'teams' ? 'all squads' : 'newsletter subscribers'}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[rgba(0,0,0,0.2)] text-[var(--neon-blue)] font-mono text-xs uppercase">
                  <tr>
                    <th className="p-4">{activeTab === 'teams' ? 'Team Name' : 'Email Address'}</th>
                    {activeTab === 'teams' && <th className="p-4">Members</th>}
                    {activeTab === 'teams' && <th className="p-4">Points</th>}
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.05)] text-sm">
                  {(activeTab === 'teams' ? teams : subscribers).map(item => (
                    <tr key={item._id} className="hover:bg-[rgba(255,255,255,0.02)]">
                      <td className="p-4 font-bold text-white">{item.name || item.email}</td>
                      {activeTab === 'teams' && <td className="p-4 text-[var(--text-dim)]">{item.members?.length || 0} / 4</td>}
                      {activeTab === 'teams' && <td className="p-4 text-[var(--neon-green)] font-mono">{item.points || 0}</td>}
                      <td className="p-4 text-[var(--text-dim)] text-xs">{new Date(item.createdAt || item.subscribedAt).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => { if (window.confirm('Delete?')) axios.delete(activeTab === 'teams' ? `/api/teams/${item._id}` : `/api/newsletter/subscribers/${item._id}`).then(() => fetchData()) }} className="text-red-500 hover:text-white p-2">
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

      </motion.div>

      {/* Notice Modal */}
      {showNoticeModal && (
        <Modal isOpen={true} onClose={() => setShowNoticeModal(false)} title={editingNotice ? 'Edit Announcement' : 'New Announcement'}>
          <form onSubmit={saveNotice}>
            <div className="space-y-4">
              <Input
                label="Title"
                value={noticeForm.title}
                onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })}
                required
              />
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--neon-blue)] uppercase">Message Body</label>
                <textarea
                  className="w-full bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] rounded p-3 text-white focus:border-[var(--neon-blue)] focus:outline-none min-h-[150px]"
                  value={noticeForm.description}
                  onChange={e => setNoticeForm({ ...noticeForm, description: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" variant="primary" className="w-full">
                {editingNotice ? 'Update Announcement' : 'Broadcast Announcement'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default AdminDashboard;
