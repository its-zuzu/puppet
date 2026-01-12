import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import Loading from './Loading';

// Component for routes that require authentication
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, user, loading } = useContext(AuthContext);

  // Show loading state while checking authentication
  if (loading) {
    return <Loading text="Authenticating" />;
  }

  // If not authenticated, redirect to register
  if (!isAuthenticated) {
    return <Navigate to="/register" />;
  }

  // If admin-only route and user is not admin, redirect to home
  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  // If authenticated (and admin if required), render the children
  return children;
};

export default ProtectedRoute;
