import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Flag, Lock, Award, Users, 
  CheckCircle, Clock, TrendingUp, ChevronRight 
} from 'lucide-react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Button, Input, Card, CardHeader, CardBody, Badge, Loading } from '../components/ui';
import './Challenges.css';

const CATEGORIES = [
  { id: 'all', name: 'All Categories', icon: null },
  { id: 'web', name: 'Web', icon: '????' },
  { id: 'crypto', name: 'Cryptography', icon: '????' },
  { id: 'forensics', name: 'Forensics', icon: '????' },
  { id: 'pwn', name: 'Binary', icon: '????' },
  { id: 'reverse', name: 'Reverse Engineering', icon: '????' },
  { id: 'misc', name: 'Miscellaneous', icon: '????' },
];

const DIFFICULTIES = {
  easy: { label: 'Easy', color: 'success' },
  medium: { label: 'Medium', color: 'warning' },
  hard: { label: 'Hard', color: 'danger' },
  insane: { label: 'Insane', color: 'info' },
};

function Challenges() {
  const { user, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [challenges, setChallenges] = useState([]);
  const [filteredChallenges, setFilteredChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [sortBy, setSortBy] = useState('points'); // points, solves, title
  
  useEffect(() => {
    fetchChallenges();
  }, []);

  useEffect(() => {
    filterChallenges();
  }, [challenges, searchTerm, selectedCategory, selectedDifficulty, sortBy]);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/challenges?page=1&limit=1000');
      setChallenges(res.data.data || []);
    } catch (err) {
      console.error('Error fetching challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterChallenges = () => {
    let filtered = [...challenges];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(c =>
        c.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(c =>
        c.difficulty?.toLowerCase() === selectedDifficulty.toLowerCase()
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'points':
          return (b.points || 0) - (a.points || 0);
        case 'solves':
          return (b.solves?.length || 0) - (a.solves?.length || 0);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredChallenges(filtered);
  };

  const isSolved = (challengeId) => {
    return user?.solvedChallenges?.includes(challengeId);
  };

  const handleChallengeClick = (challengeId) => {
    navigate(`/challenges/${challengeId}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="challenges-page">
        <Loading size="large" text="Loading challenges..." />
      </div>
    );
  }

  return (
    <div className="challenges-page">
      {/* Header */}
      <div className="challenges-header">
        <motion.div
          className="header-content"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="header-title-section">
            <h1 className="page-title">
              <Flag className="title-icon" />
              Challenges
            </h1>
            <p className="page-description">
              Test your skills across {challenges.length} cybersecurity challenges
            </p>
          </div>

          <div className="header-stats">
            <div className="stat-box">
              <Award className="stat-icon" />
              <div>
                <span className="stat-number">{user?.solvedChallenges?.length || 0}</span>
                <span className="stat-label">Solved</span>
              </div>
            </div>
            <div className="stat-box">
              <Clock className="stat-icon" />
              <div>
                <span className="stat-number">{challenges.length - (user?.solvedChallenges?.length || 0)}</span>
                <span className="stat-label">Remaining</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div 
        className="challenges-filters"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="filters-card">
          <CardBody>
            {/* Search */}
            <div className="filter-section">
              <div className="search-box">
                <Search className="search-icon" size={20} />
                <Input
                  type="text"
                  placeholder="Search challenges..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {/* Category Filters */}
            <div className="filter-section">
              <label className="filter-label">
                <Filter size={16} />
                Category
              </label>
              <div className="filter-buttons">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    className={`filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.icon && <span className="btn-icon">{cat.icon}</span>}
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty & Sort */}
            <div className="filter-row">
              <div className="filter-group">
                <label className="filter-label">Difficulty</label>
                <select
                  className="filter-select"
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                >
                  <option value="all">All</option>
                  {Object.entries(DIFFICULTIES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Sort By</label>
                <select
                  className="filter-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="points">Points</option>
                  <option value="solves">Solves</option>
                  <option value="title">Title</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Results Count */}
      <div className="results-info">
        <span className="results-count">
          {filteredChallenges.length} challenge{filteredChallenges.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Challenges Grid */}
      <motion.div
        className="challenges-grid"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence>
          {filteredChallenges.length === 0 ? (
            <motion.div
              className="no-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Search size={48} />
              <h3>No challenges found</h3>
              <p>Try adjusting your filters</p>
            </motion.div>
          ) : (
            filteredChallenges.map((challenge) => (
              <motion.div
                key={challenge._id}
                variants={itemVariants}
                layout
              >
                <Card
                  className={`challenge-card ${isSolved(challenge._id) ? 'solved' : ''}`}
                  hover
                  onClick={() => handleChallengeClick(challenge._id)}
                >
                  <CardHeader>
                    <div className="challenge-header">
                      <div className="challenge-title-row">
                        <h3 className="challenge-title">{challenge.title}</h3>
                        {isSolved(challenge._id) && (
                          <CheckCircle className="solved-icon" size={20} />
                        )}
                      </div>
                      <div className="challenge-meta">
                        <Badge variant={DIFFICULTIES[challenge.difficulty?.toLowerCase()]?.color || 'primary'}>
                          {DIFFICULTIES[challenge.difficulty?.toLowerCase()]?.label || challenge.difficulty}
                        </Badge>
                        <span className="challenge-category">
                          {CATEGORIES.find(c => c.id === challenge.category?.toLowerCase())?.icon || '????'}
                          {challenge.category}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <p className="challenge-description">
                      {challenge.description?.substring(0, 120)}
                      {challenge.description?.length > 120 && '...'}
                    </p>
                    <div className="challenge-footer">
                      <div className="challenge-stats">
                        <div className="stat">
                          <Award size={16} />
                          <span>{challenge.points || 0} pts</span>
                        </div>
                        <div className="stat">
                          <Users size={16} />
                          <span>{challenge.solves?.length || 0} solves</span>
                        </div>
                      </div>
                      <ChevronRight className="arrow-icon" size={20} />
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default Challenges;
