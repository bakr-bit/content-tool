import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://beneath-intervention-starsmerchant-diverse.trycloudflare.com/api/v1';

interface User {
  token: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    if (token && username) {
      // Verify token is still valid
      fetch(`${API_BASE}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) {
            setUser({ token, username });
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('username');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || 'Login failed');
    }

    const data = await res.json();
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('username', data.data.username);
    setUser({ token: data.data.token, username: data.data.username });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
