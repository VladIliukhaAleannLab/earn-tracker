import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../utils/trpc';

// Тип для користувача
interface User {
  id: number;
  username: string;
}

// Тип для контексту аутентифікації
interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

// Створення контексту
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Провайдер контексту
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Перевірка наявності збереженого користувача при завантаженні
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const trpcLogin = trpc.users.login.useMutation({  });


  // Функція для входу
  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('Attempting login with:', { username });

      // Спробуємо виконати запит до tRPC
      try {
        const result = await trpcLogin.mutateAsync({ username, password });
        console.log('Login result:', result);

        if (result) {
          setUser(result);
          localStorage.setItem('user', JSON.stringify(result));
          navigate('/dashboard');
        } else {
          throw new Error('Failed to login: No user data returned');
        }
      } catch (queryError) {
        console.error('tRPC query error:', queryError);
        throw queryError;
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Функція для виходу
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Хук для використання контексту
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
