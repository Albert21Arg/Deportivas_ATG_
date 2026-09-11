import { createContext, useContext, useEffect, useRef, useState } from 'react';

import api from '../services/api.js';

const AuthContext = createContext(null);

function hasUsableAccessToken(token) {
  const [, payload] = token?.split('.') ?? [];

  if (!payload) {
    return false;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = atob(normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '='));
    const { exp } = JSON.parse(decodedPayload);

    return Number.isFinite(exp) && exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasValidatedSession = useRef(false);

  useEffect(() => {
    if (hasValidatedSession.current) {
      return;
    }

    hasValidatedSession.current = true;
    const token = sessionStorage.getItem('accessToken');

    if (!hasUsableAccessToken(token)) {
      sessionStorage.removeItem('accessToken');
      setIsLoading(false);
      return;
    }

    api.get('/auth/me')
      .then(({ data }) => setUser(data.data.user))
      .catch(() => sessionStorage.removeItem('accessToken'))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    sessionStorage.setItem('accessToken', data.data.token);
    setUser(data.data.user);
  }

  function logout() {
    sessionStorage.removeItem('accessToken');
    setUser(null);
    window.location.assign('/');
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: Boolean(user), login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider');
  }

  return context;
}
