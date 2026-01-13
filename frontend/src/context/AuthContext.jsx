import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();


const getApiUrl = () => {
  // Always use relative path for this deployment structure (Frontend + Backend on same server)
  // This eliminates configuration errors and CORS issues
  return '';
};

// Configure axios defaults
axios.defaults.baseURL = getApiUrl();

axios.defaults.withCredentials = true;  // Enable credentials
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Enhanced axios interceptors for better multi-user support
axios.interceptors.response.use(
  response => {
    // Cookies are handled automatically - no manual token refresh needed
    return response;
  },
  error => {
    console.error('API Error:', error);

    // Handle network errors
    if (!error.response) {
      console.error('Network error - server may be down or unreachable');
      return Promise.reject({
        message: 'Network error - server may be down or unreachable',
        type: 'network'
      });
    }

    // Handle rate limit errors with better user feedback
    if (error.response.status === 429) {
      const retryAfter = error.response.headers['retry-after'] ||
        error.response.data?.retryAfter || 60;
      const message = error.response.data?.message ||
        `Rate limit exceeded. Please try again in ${retryAfter} seconds.`;

      console.error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
      return Promise.reject({
        message: message,
        status: 429,
        retryAfter: retryAfter,
        type: 'rate_limit'
      });
    }

    // Handle authentication errors
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      // Cookie cleared automatically by browser

      // Only redirect if not already on login page
      if (currentPath !== '/login' && currentPath !== '/register') {
        console.log('Authentication failed, redirecting to login');
        window.location.href = '/login';
      }
    }

    // Handle server errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.data);
      return Promise.reject({
        message: 'Server error. Please try again later.',
        status: error.response.status,
        type: 'server_error'
      });
    }

    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user on mount (cookie-based authentication)
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await axios.get('/api/auth/me');

        // Check if user is blocked
        if (res.status === 403 || res.data.isBlocked) {
          console.warn('User is blocked');
          setUser(null);
          setIsAuthenticated(false);
          setError('Your account has been blocked.');
          window.location.href = '/blocked';
          setLoading(false);
          return;
        }

        setUser(res.data.user);
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Auth error:', err);

        // Check if error is due to user being blocked
        if (err.response?.status === 403 && err.response?.data?.isBlocked) {
          console.warn('User is blocked (from error)');
          setUser(null);
          setIsAuthenticated(false);
          setError('Your account has been blocked.');
          window.location.href = '/blocked';
          setLoading(false);
          return;
        }

        // Not authenticated - cookie invalid or absent
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  // Periodic check for user block status (every 60 seconds)
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const blockCheckInterval = setInterval(async () => {
      try {
        const res = await axios.get('/api/auth/me');

        // If user is blocked, logout immediately
        if (res.data.isBlocked) {
          console.warn('User has been blocked - logging out');
          logout();
          setError('Your account has been blocked by an administrator.');
          window.location.href = '/blocked';
        }
      } catch (err) {
        // Only logout for block-related errors (403 with isBlocked)
        // Ignore 401 errors as they're handled by axios interceptor
        if (err.response?.status === 403 && err.response?.data?.isBlocked) {
          console.warn('User has been blocked - logging out');
          logout();
          setError('Your account has been blocked by an administrator.');
          window.location.href = '/blocked';
        }
        // For other errors (like 401), silently continue - axios interceptor will handle
      }
    }, 60000); // Check every 60 seconds

    return () => clearInterval(blockCheckInterval);
  }, [isAuthenticated, user, logout]);

  // Update user data (points, solved challenges, etc.)
  const updateUserData = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      setUser(res.data.user);
    } catch (err) {
      console.error('Error updating user data:', err);
    }
  };

  // Register user
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.post('/api/auth/register', userData);

      // Cookie is set automatically by backend
      setUser(res.data.user);
      setIsAuthenticated(true);
      setLoading(false);

      return res.data;
    } catch (err) {
      console.error('Registration error:', err);
      setLoading(false);

      // Handle rate limit errors specifically
      if (err.status === 429) {
        setError(`Registration rate limit exceeded. Please try again in ${err.retryAfter} seconds.`);
      } else {
        setError(err.response?.data?.message || 'Registration failed');
      }

      throw err;
    }
  };

  // Login user
  const login = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.post('/api/auth/login', userData);

      // Cookie is set automatically by backend
      setUser(res.data.user);
      setIsAuthenticated(true);
      setLoading(false);

      return res.data;
    } catch (err) {
      console.error('Login error:', err);
      setLoading(false);

      // Handle blocked user
      if (err.response?.status === 403 && err.response?.data?.isBlocked) {
        setError('You are blocked. Suspicious activity detected. Contact Admin for further information.');
        throw err;
      }

      // Handle rate limit errors specifically
      if (err.status === 429) {
        setError(`Login rate limit exceeded. Please try again in ${err.retryAfter} seconds.`);
      } else {
        setError(err.response?.data?.message || 'Login failed');
      }

      throw err;
    }
  };

  // Logout user
  const logout = async () => {
    try {
      // Call backend to clear httpOnly cookie
      await axios.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear local state regardless of API call result
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Clear errors
  const clearErrors = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        error,
        updateUserData,
        register,
        login,
        logout,
        clearErrors
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
