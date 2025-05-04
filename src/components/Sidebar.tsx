import React from 'react';
import { NavLink } from 'react-router-dom';

// Елементи меню
const menuItems = [
  { path: '/dashboard', label: 'Головна', icon: '📊' },
  { path: '/income', label: 'Доходи', icon: '💰' },
  { path: '/analytics', label: 'Аналітика', icon: '📈' },
  { path: '/taxes', label: 'Податки', icon: '💸' },
  { path: '/events', label: 'Події', icon: '📅' },
  { path: '/settings', label: 'Налаштування', icon: '⚙️' },
];

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-gray-800 text-white">
      <div className="p-4">
        <h2 className="text-xl font-bold">ФОП Звітність</h2>
      </div>
      <nav className="mt-6">
        <ul>
          {menuItems.map(item => (
            <li key={item.path} className="mb-2">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 ${
                    isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`
                }
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
