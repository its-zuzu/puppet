import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import Loading from '../components/Loading';
import './TeamDetails.css';

function TeamDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useContext(AuthContext);

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeamDetails = async () => {
      if (!isAuthenticated || !token) {
        navigate('/login');
        return;
      }

      try {
        const config = {
          headers: {
            Authorization: `Bearer ${token}`
          }
        };

        const res = await axios.get(`/api/teams/${id}`, config);
        setTeam(res.data.data);
        console.log('Team data loaded:', res.data.data);
        console.log('Team members unlockedHints:', res.data.data.members.map(m => ({
          username: m.username,
          unlockedHints: m.unlockedHints
        })));
        setLoading(false);
      } catch (err) {
        console.error('Error fetching team details:', err);
        setError(err.response?.data?.message || 'Failed to load team details');
        setLoading(false);
      }
    };

    fetchTeamDetails();
  }, [id, token, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="team-details-container">
        <Loading size="large" text="Loading team details" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="team-details-container">
        <div className="error-message">{error}</div>
        <button className="btn-back" onClick={() => navigate('/scoreboard')}>
          Back to Scoreboard
        </button>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="team-details-container">
        <div className="error-message">Team not found</div>
        <button className="btn-back" onClick={() => navigate('/scoreboard')}>
          Back to Scoreboard
        </button>
      </div>
    );
  }

  // Sort members by points (highest first)
  const sortedMembers = [...team.members].sort((a, b) => (b.points || 0) - (a.points || 0));

  // Captain is either from the database (already populated) or defaults to highest scorer
  let captain = null;
  if (team.captain) {
    // If captain is populated as an object with _id
    if (typeof team.captain === 'object' && team.captain._id) {
      captain = team.captain;
    } else {
      // If captain is just an ID string, find it in members
      captain = team.members.find(m => m._id === team.captain || m._id.toString() === team.captain.toString());
    }
  }
  // If no captain set, default to highest scorer
  if (!captain) {
    captain = sortedMembers[0];
  }

  return (
    <div className="team-details-container">
      <button className="btn-back" onClick={() => navigate('/scoreboard')}>
        ← Back to Scoreboard
      </button>

      <div className="team-details-header">
        <h1 className="team-name">{team.name}</h1>
      </div>

      <div className="team-stats">
        <div className="stat-card points-card">
          <div className="stat-label">Total Points</div>
          <div className="stat-value points">{team.points || 0}</div>
        </div>
        <div className="stat-card members-card">
          <div className="stat-label">Team Members</div>
          <div className="stat-value">{team.members.length}</div>
        </div>
        <div className="stat-card challenges-card">
          <div className="stat-label">Challenges Solved</div>
          <div className="stat-value">
            {team.members.reduce((sum, member) => sum + (member.personallySolvedChallenges?.length || 0), 0)}
          </div>
        </div>
      </div>

      <div className="team-members-section">
        <h2>Team Members</h2>

        {captain && (
          <div className="member-card captain">
            <div className="member-badge">CAPTAIN</div>
            <div className="member-info">
              <div
                className="member-name clickable"
                onClick={() => navigate(`/user/${captain._id}`)}
                style={{ cursor: 'pointer' }}
              >
                {captain.username}
              </div>
              <div className="member-email">{captain.email}</div>
            </div>
            <div className="member-stats">
              <div className="member-points">{captain.points || 0} pts</div>
              <div className="member-challenges">{captain.personallySolvedChallenges?.length || 0} solved</div>
              <div className="member-hints">{captain.unlockedHints?.length || 0} hints unlocked</div>
            </div>
          </div>
        )}

        <div className="members-list">
          {sortedMembers.filter(m => m._id !== captain?._id).map((member, index) => (
            <div key={member._id} className="member-card">
              <div className="member-rank">#{sortedMembers.findIndex(sm => sm._id === member._id) + 1}</div>
              <div className="member-info">
                <div
                  className="member-name clickable"
                  onClick={() => navigate(`/user/${member._id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {member.username}
                </div>
                <div className="member-email">{member.email}</div>
              </div>
              <div className="member-stats">
                <div className="member-points">{member.points || 0} pts</div>
                <div className="member-challenges">{member.personallySolvedChallenges?.length || 0} solved</div>
                <div className="member-hints">{member.unlockedHints?.length || 0} hints unlocked</div>
              </div>
            </div>
          ))}
        </div>

        {team.members.length === 0 && (
          <div className="no-members">
            <p>No members in this team yet</p>
          </div>
        )}
      </div>

      {/* Unlocked Hints Section */}
      <div className="team-hints-section">
        <h2>Unlocked Hints</h2>
        {team.members.some(m => m.unlockedHints && m.unlockedHints.length > 0) ? (
          <div className="hints-list">
            {team.members.map(member => (
              member.unlockedHints && member.unlockedHints.length > 0 && (
                <div key={member._id} className="member-hints-group">
                  <h3 className="member-hints-header">
                    <span className="member-name-badge">{member.username}</span>
                  </h3>
                  {member.unlockedHints.map((hint, idx) => (
                    <div key={idx} className="hint-detail-card">
                      <div className="hint-info">
                        <span className="hint-challenge">{hint.challengeTitle || 'Unknown Challenge'}</span>
                      </div>
                      <div className="hint-cost-badge">{hint.hintCost} pts</div>
                    </div>
                  ))}
                </div>
              )
            ))}
          </div>
        ) : (
          <div className="no-hints">
            <p>No hints unlocked yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamDetails;
