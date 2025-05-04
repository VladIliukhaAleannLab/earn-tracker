import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Перенаправлення на сторінку входу, якщо користувач не авторизований
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);
  
  // Показуємо завантаження, поки перевіряємо аутентифікацію
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Завантаження...</div>;
  }
  
  // Якщо користувач не авторизований, не рендеримо вміст
  if (!user) {
    return null;
  }
  
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
