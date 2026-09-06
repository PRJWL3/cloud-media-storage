import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types/drive';
import { apiClient } from '../api/client';

export interface AuthContextType {
  currentUser: User;
  isAuthenticated: boolean;
  users: User[];
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password?: string
  ) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  switchUser: (userId: number) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const FALLBACK_USER: User = {
  id: 1,
  name: 'Prajwal',
  email: 'prajwal@cloudstorage.io',
  created_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([FALLBACK_USER]);
  const [currentUser, setCurrentUser] = useState<User>(FALLBACK_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  const refreshUsers = useCallback(async () => {
    try {
      const fetched = await apiClient.getUsers();
      if (fetched && fetched.length > 0) {
        setUsers(fetched);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, []);

  // Sync session on mount (via token or saved user ID)
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('drive_access_token');
        if (token) {
          try {
            const me = await apiClient.getMe(token);
            if (me && me.id) {
              setCurrentUser(me);
              setIsAuthenticated(true);
            }
          } catch {
            // Token invalid or expired
            localStorage.removeItem('drive_access_token');
          }
        }

        const fetched = await apiClient.getUsers();
        if (fetched && fetched.length > 0) {
          setUsers(fetched);
          const savedId = localStorage.getItem('drive_active_user_id');
          if (savedId) {
            const found = fetched.find((u) => u.id === Number(savedId));
            if (found) setCurrentUser(found);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      localStorage.setItem('drive_active_user_id', String(currentUser.id));
    }
  }, [currentUser]);

  const login = async (
    email: string,
    password = 'password123'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await apiClient.login(email, password);
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      localStorage.setItem('drive_active_user_id', String(data.user.id));
      await refreshUsers();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      return { success: false, error: msg };
    }
  };

  const register = async (
    name: string,
    email: string,
    password = 'password123'
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      const data = await apiClient.register(name, email, password);
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      localStorage.setItem('drive_active_user_id', String(data.user.id));
      await refreshUsers();
      return { success: true, user: data.user };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    apiClient.logout();
    setIsAuthenticated(false);
    // Default to the primary user profile in demo view
    if (users.length > 0) {
      setCurrentUser(users[0]);
    }
  };

  const switchUser = async (userId: number) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('drive_active_user_id', String(found.id));
      try {
        const data = await apiClient.login(found.email, 'password123');
        if (data.access_token) {
          localStorage.setItem('drive_access_token', data.access_token);
          setIsAuthenticated(true);
        }
      } catch {
        // Fallback for demo users
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        users,
        login,
        register,
        logout,
        switchUser,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
