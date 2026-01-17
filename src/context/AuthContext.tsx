import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

interface User {
  usuario_id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'chofer';
  chofer_id?: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        // Intentar cargar información del usuario primero
        try {
          const response = await apiClient.get('/api/v1/auth/me');
          setUser(response.data);
          setIsAuthenticated(true);
        } catch (error: any) {
          console.error('Error loading user data on checkAuth:', error);
          // Si el token es inválido (401 o 403), limpiar sesión
          if (error.response?.status === 401 || error.response?.status === 403) {
            await logout();
          } else {
            // Error de red u otro, mantenemos el estado pero informamos
            setIsAuthenticated(true);
          }
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string) => {
    try {
      await AsyncStorage.setItem('auth_token', token);

      // Cargar información del usuario ANTES de marcar como autenticado
      // para evitar flickering en la UI o estados inconsistentes
      try {
        const response = await apiClient.get('/api/v1/auth/me');
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error loading user data after login:', error);
        // Si no podemos cargar el usuario, el login no está completo
        await logout();
        throw new Error('No se pudo cargar la información del perfil');
      }
    } catch (error) {
      console.error('Error saving token or loading user:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};