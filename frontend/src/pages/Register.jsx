import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, User, Users, FileText, ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Terminal, TerminalLine } from '../components/ui';
import './Auth.css';

function Register() {
  return (
    <div className="cyber-auth-container">
      <div className="cyber-auth-background">
        <div className="cyber-auth-grid"></div>
      </div>
      
      <div className="cyber-auth-content">
        <motion.div
          className="cyber-auth-card cyber-auth-card--wide"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="cyber-auth-header">
            <h1 className="cyber-auth-title">
              <span className="text-gradient">REGISTRATION</span>
            </h1>
            <p className="cyber-auth-subtitle">
              Account creation is managed by administrators
            </p>
          </div>

          <Terminal title="REGISTRATION_PROTOCOL" className="cyber-auth-terminal">
            <TerminalLine command="system.registration.check()" output="[INFO] Direct registration disabled" />
            <TerminalLine command="system.contact.admin()" output="[OK] Contact protocol initialized" />
          </Terminal>

          <Card className="cyber-registration-info">
            <CardHeader>
              <h3>How to Request Access</h3>
            </CardHeader>
            <CardBody>
              <p className="cyber-registration-description">
                New accounts are created by platform administrators. To request access, 
                please contact us with the following information:
              </p>

              <div className="cyber-registration-requirements">
                <div className="cyber-registration-requirement">
                  <div className="cyber-registration-requirement-icon">
                    <User size={20} />
                  </div>
                  <div>
                    <strong>Full Name</strong>
                    <p>Your complete name for account identification</p>
                  </div>
                </div>

                <div className="cyber-registration-requirement">
                  <div className="cyber-registration-requirement-icon">
                    <Mail size={20} />
                  </div>
                  <div>
                    <strong>Email Address</strong>
                    <p>Valid email for account access and notifications</p>
                  </div>
                </div>

                <div className="cyber-registration-requirement">
                  <div className="cyber-registration-requirement-icon">
                    <User size={20} />
                  </div>
                  <div>
                    <strong>Preferred Username</strong>
                    <p>Display name for the platform</p>
                  </div>
                </div>

                <div className="cyber-registration-requirement">
                  <div className="cyber-registration-requirement-icon">
                    <Users size={20} />
                  </div>
                  <div>
                    <strong>Team Name</strong>
                    <p>Preferred team for participation</p>
                  </div>
                </div>

                <div className="cyber-registration-requirement">
                  <div className="cyber-registration-requirement-icon">
                    <FileText size={20} />
                  </div>
                  <div>
                    <strong>Purpose</strong>
                    <p>Brief reason for joining the platform</p>
                  </div>
                </div>
              </div>

              <div className="cyber-registration-contact">
                <h4>Contact Administrator</h4>
                <a href="mailto:ctfquest@gmail.com" className="cyber-registration-email">
                  <Mail size={18} />
                  <span>ctfquest@gmail.com</span>
                </a>
              </div>
            </CardBody>
          </Card>

          <div className="cyber-auth-footer">
            <div className="cyber-auth-divider">
              <span>ALREADY HAVE ACCESS?</span>
            </div>
            <Link to="/login">
              <Button variant="primary" fullWidth icon={<ArrowLeft size={18} />}>
                Return to Login
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Register;