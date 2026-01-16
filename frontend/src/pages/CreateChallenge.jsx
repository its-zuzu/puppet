import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import './CreateChallenge.css';

function CreateChallenge() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'web',
    difficulty: 'Easy',
    points: 100,
    flag: '',
    hints: [{ content: '', cost: 0 }],
    isVisible: true,
    // CTFd scoring fields
    function: 'static',
    initial: 500,
    minimum: 100,
    decay: 20
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const { title, description, category, difficulty, points, flag } = formData;

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user && user.role !== 'admin') {
      navigate('/challenges');
    }
  }, [isAuthenticated, user, navigate]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'points' || name === 'initial' || name === 'minimum' || name === 'decay'
        ? parseInt(value, 10) || ''
        : value
    });
    setFormError('');
  };

  const handleHintChange = (index, field, value) => {
    const newHints = [...formData.hints];
    newHints[index] = { ...newHints[index], [field]: value };
    setFormData({ ...formData, hints: newHints });
  };

  const addHint = () => {
    setFormData({
      ...formData,
      hints: [...formData.hints, { content: '', cost: 0 }]
    });
  };

  const removeHint = (index) => {
    const newHints = formData.hints.filter((_, i) => i !== index);
    setFormData({ ...formData, hints: newHints });
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!title || !description || !category || !difficulty || !points || !flag) {
      setFormError('Please fill in all fields');
      return;
    }

    // Filter out empty hints
    const validHints = formData.hints.filter(hint => hint.content.trim() !== '');

    setIsSubmitting(true);

    try {
      const challengeData = {
        ...formData,
        hints: validHints
      };

      // For static challenges, don't send dynamic fields (set to null)
      if (formData.function === 'static') {
        challengeData.initial = null;
        challengeData.minimum = null;
        challengeData.decay = null;
      }

      const res = await axios.post(
        '/api/challenges',
        challengeData
      );

      setSuccessMessage('Challenge created successfully! Redirecting to edit page...');
      
      // Redirect to edit page where files can be uploaded
      setTimeout(() => {
        navigate(`/admin/edit-challenge/${res.data._id}`);
      }, 1500);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create challenge');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-challenge-container">
      <div className="create-challenge-card">
        <div className="create-challenge-header">
          <h2>Create New <span className="highlight">Challenge</span></h2>
          <p>Add a new challenge to the platform</p>
        </div>

        {formError && <div className="form-error">{formError}</div>}
        {successMessage && <div className="form-success">{successMessage}</div>}

        <form onSubmit={onSubmit} className="challenge-form">
          <div className="form-group">
            <label htmlFor="title">Challenge Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={title}
              onChange={onChange}
              placeholder="Enter a title for your challenge"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={description}
              onChange={onChange}
              placeholder="Describe the challenge and provide any necessary context"
              rows="4"
              required
            ></textarea>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={category}
                onChange={onChange}
                required
              >
                <option value="web">Web Exploitation</option>
                <option value="crypto">Cryptography</option>
                <option value="forensics">Forensics</option>
                <option value="reverse">Reverse Engineering</option>
                <option value="osint">OSINT</option>
                <option value="misc">Miscellaneous</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="points">Points</label>
            <input
              type="number"
              id="points"
              name="points"
              value={points}
              onChange={onChange}
              min="50"
              max="1000"
              step="50"
              required
            />
            <small className="form-hint">
              {formData.function === 'static'
                ? 'Fixed points - all solvers get this amount'
                : 'Current value (will change as users solve)'}
            </small>
          </div>

          {/* CTFd Scoring Type Section */}
          <div className="scoring-section">
            <h3>Scoring Type</h3>
            <div className="form-group">
              <label htmlFor="function">Scoring Function</label>
              <select
                id="function"
                name="function"
                value={formData.function}
                onChange={onChange}
                required
              >
                <option value="static">Static (Fixed Points)</option>
                <option value="linear">Linear Decay (Arithmetic)</option>
                <option value="logarithmic">Logarithmic Decay (Exponential Curve)</option>
              </select>
              <small className="form-hint">
                {formData.function === 'static' && 'All solvers get the same points'}
                {formData.function === 'linear' && 'Points decrease by a fixed amount per solve'}
                {formData.function === 'logarithmic' && 'Points decrease slowly at first, then rapidly'}
              </small>
            </div>

            {/* Dynamic Scoring Fields - Only show for linear/logarithmic */}
            {formData.function !== 'static' && (
              <div className="dynamic-fields">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="initial">Initial Points</label>
                    <input
                      type="number"
                      id="initial"
                      name="initial"
                      value={formData.initial}
                      onChange={onChange}
                      min="100"
                      max="2000"
                      step="50"
                      required
                    />
                    <small className="form-hint">Maximum points (first solver)</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="minimum">Minimum Points</label>
                    <input
                      type="number"
                      id="minimum"
                      name="minimum"
                      value={formData.minimum}
                      onChange={onChange}
                      min="50"
                      max="1000"
                      step="50"
                      required
                    />
                    <small className="form-hint">Points floor (won't go below)</small>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="decay">Decay Factor</label>
                  <input
                    type="number"
                    id="decay"
                    name="decay"
                    value={formData.decay}
                    onChange={onChange}
                    min="1"
                    max="100"
                    step="1"
                    required
                  />
                  <small className="form-hint">
                    {formData.function === 'linear'
                      ? `Points decrease by ${formData.decay} per solve`
                      : `Reaches minimum at ~${formData.decay} solves`}
                  </small>
                </div>

                {/* Scoring Preview */}
                <div className="scoring-preview">
                  <strong>Preview:</strong>
                  <ul>
                    <li>1st solver: {formData.initial} points</li>
                    {formData.function === 'linear' && (
                      <>
                        <li>2nd solver: {Math.max(formData.minimum, formData.initial - formData.decay)} points</li>
                        <li>3rd solver: {Math.max(formData.minimum, formData.initial - (2 * formData.decay))} points</li>
                      </>
                    )}
                    {formData.function === 'logarithmic' && (
                      <>
                        <li>5th solver: ~{Math.max(formData.minimum, Math.floor((((formData.minimum - formData.initial) / (formData.decay ** 2)) * (4 ** 2)) + formData.initial))} points</li>
                        <li>{formData.decay}th solver: ~{Math.max(formData.minimum, Math.floor((((formData.minimum - formData.initial) / (formData.decay ** 2)) * ((formData.decay - 1) ** 2)) + formData.initial))} points</li>
                      </>
                    )}
                    <li>After many solves: {formData.minimum} points (minimum)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="flag">Flag</label>
            <input
              type="text"
              id="flag"
              name="flag"
              value={flag}
              onChange={onChange}
              placeholder="Enter the flag SECE{Flag_Here}"
              required
            />
            <small className="form-hint">This will be hidden from users until they solve the challenge.</small>
          </div>

          <div className="hints-section">
            <h3>Hints</h3>
            <div className="hints-container">
              {formData.hints.map((hint, index) => (
                <div key={index} className="hint-item">
                  <div className="hint-content">
                    <textarea
                      value={hint.content}
                      onChange={(e) => handleHintChange(index, 'content', e.target.value)}
                      placeholder="Enter hint content"
                      rows="3"
                    />
                  </div>
                  <div className="hint-cost">
                    <input
                      type="number"
                      value={hint.cost}
                      onChange={(e) => handleHintChange(index, 'cost', parseInt(e.target.value) || 0)}
                      min="0"
                      placeholder="Cost"
                    />
                    <span className="hint-cost-label">points</span>
                  </div>
                  <button
                    type="button"
                    className="remove-hint-btn"
                    onClick={() => removeHint(index)}
                    disabled={formData.hints.length === 1}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="add-hint-btn" onClick={addHint}>
              Add Hint
            </button>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isVisible"
                checked={formData.isVisible}
                onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
              />
              <span>Make challenge visible to users</span>
            </label>
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Challenge'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateChallenge;
