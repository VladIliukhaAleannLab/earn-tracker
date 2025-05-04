import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <div className="flex justify-between items-center px-4 py-3">
        <h1 className="text-xl font-semibold text-gray-800">EarnTracker</h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">Вітаємо, {user?.username}</span>
          <button onClick={logout} className="text-sm text-red-600 hover:text-red-800">
            Вийти
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
