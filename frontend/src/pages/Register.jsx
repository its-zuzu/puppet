import { Link } from 'react-router-dom';
import './Auth.css';

function Register() {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2><span className="highlight">CTFQuest</span> Registration</h2>
          <p>Account Creation Information</p>
        </div>

        <div className="registration-info">
          <h3>Account Creation</h3>
          
          <div className="info-content">
            <p>New accounts are created by the administrator.</p>
            
            <div className="contact-info">
              <h4>Need an Account?</h4>
              <p>Please contact our administrator for account creation:</p>
              
              <div className="contact-details">
                <div className="contact-item">
                  <span className="contact-label">Email:</span>
                  <a href="mailto:ctfquest@gmail.com" className="contact-link">
                    ctfquest@gmail.com
                  </a>
                </div>
              </div>
              
              <div className="contact-note">
                <p><strong>Please include:</strong></p>
                <ul>
                  <li>Your full name</li>
                  <li>Preferred username</li>
                  <li>Email address</li>
                  <li>Preferred team name</li>
                  <li>Brief reason for joining</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-footer">
          <p>
            Already have an account? 
            <Link to="/login" className="auth-link">
              Login Here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;