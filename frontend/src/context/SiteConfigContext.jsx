import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const DEFAULT_EVENT_NAME = 'Ciphera';
const DEFAULT_EVENT_DESCRIPTION = 'Ciphera cybersecurity platform';

const normalizeEventName = (value) => {
  const trimmedValue = typeof value === 'string' ? value.trim() : '';
  const normalizedValue = trimmedValue.toLowerCase().replace(/[^a-z0-9]+/g, '');

  if (!trimmedValue || normalizedValue === 'ciphera' || normalizedValue === 'ctfquest') {
    return DEFAULT_EVENT_NAME;
  }

  return trimmedValue;
};

const SiteConfigContext = createContext({
  eventName: DEFAULT_EVENT_NAME,
  eventDescription: DEFAULT_EVENT_DESCRIPTION,
  logoUrl: '',
  visibility: {
    challenge: 'private',
    account: 'private',
    score: 'private',
    registration: 'private'
  },
  loading: true,
  refreshConfig: async () => {},
  updateEventName: async () => ({ success: false }),
  uploadLogo: async () => ({ success: false }),
  updateVisibility: async () => ({ success: false })
});

export const SiteConfigProvider = ({ children }) => {
  const [eventName, setEventName] = useState(DEFAULT_EVENT_NAME);
  const [eventDescription, setEventDescription] = useState(DEFAULT_EVENT_DESCRIPTION);
  const [logoUrl, setLogoUrl] = useState('');
  const [visibility, setVisibility] = useState({
    challenge: 'private',
    account: 'private',
    score: 'private',
    registration: 'private'
  });
  const [loading, setLoading] = useState(true);

  const refreshConfig = async () => {
    try {
      const response = await axios.get('/api/configuration');
      const data = response?.data?.data || {};

      setEventName(normalizeEventName(data.eventName));
      setEventDescription(data.eventDescription || DEFAULT_EVENT_DESCRIPTION);
      setLogoUrl(data.logoUrl || '');
      setVisibility({
        challenge: data.visibility?.challenge || 'private',
        account: data.visibility?.account || 'private',
        score: data.visibility?.score || 'private',
        registration: data.visibility?.registration || 'private'
      });
    } catch (error) {
      console.error('Failed to fetch site configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateEventName = async (nextEventName) => {
    try {
      const response = await axios.put(
        '/api/configuration/event-name',
        { eventName: nextEventName },
        { withCredentials: true }
      );

      const updatedName = normalizeEventName(response?.data?.data?.eventName || nextEventName);
      setEventName(updatedName);
      return { success: true, eventName: updatedName };
    } catch (error) {
      return {
        success: false,
        message: error?.response?.data?.message || 'Failed to update event name'
      };
    }
  };

  const uploadLogo = async (file) => {
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await axios.put('/api/configuration/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      });

      const updatedLogo = response?.data?.data?.logoUrl || '';
      setLogoUrl(updatedLogo);
      return { success: true, logoUrl: updatedLogo };
    } catch (error) {
      return {
        success: false,
        message: error?.response?.data?.message || 'Failed to upload logo'
      };
    }
  };

  const updateVisibility = async (nextVisibility) => {
    try {
      const response = await axios.put(
        '/api/configuration/visibility',
        { visibility: nextVisibility },
        { withCredentials: true }
      );

      const updatedVisibility = response?.data?.data?.visibility || nextVisibility;
      setVisibility(updatedVisibility);
      return { success: true, visibility: updatedVisibility };
    } catch (error) {
      return {
        success: false,
        message: error?.response?.data?.message || 'Failed to update visibility settings'
      };
    }
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  useEffect(() => {
    if (eventName) {
      document.title = eventName;
    }
  }, [eventName]);

  useEffect(() => {
    if (!logoUrl) return;

    const ensureFavicon = () => {
      let favicon = document.querySelector("link[rel='icon']");
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.setAttribute('rel', 'icon');
        document.head.appendChild(favicon);
      }
      favicon.setAttribute('href', `${logoUrl}?v=${Date.now()}`);
    };

    ensureFavicon();
  }, [logoUrl]);

  const value = useMemo(() => ({
    eventName,
    eventDescription,
    logoUrl,
    visibility,
    loading,
    refreshConfig,
    updateEventName,
    uploadLogo,
    updateVisibility
  }), [eventName, eventDescription, logoUrl, visibility, loading]);

  return (
    <SiteConfigContext.Provider value={value}>
      {children}
    </SiteConfigContext.Provider>
  );
};

export const useSiteConfig = () => useContext(SiteConfigContext);

export default SiteConfigContext;
