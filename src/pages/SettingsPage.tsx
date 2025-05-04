import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../utils/trpc';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<PasswordForm>();
  
  // Мутація для оновлення користувача
  const updateUser = trpc.users.update.useMutation();
  
  // Обробка відправки форми зміни пароля
  const onSubmit = async (data: PasswordForm) => {
    try {
      // Тут буде логіка зміни пароля
      // В реальному додатку потрібно перевірити поточний пароль і оновити його
      
      setMessage({ type: 'success', text: 'Пароль успішно змінено' });
      reset();
    } catch (error) {
      setMessage({ type: 'error', text: 'Помилка зміни пароля' });
    }
  };
  
  // Функція для видалення акаунта
  const handleDeleteAccount = async () => {
    if (confirm('Ви впевнені, що хочете видалити свій акаунт? Ця дія незворотна.')) {
      try {
        // Тут буде логіка видалення акаунта
        // В реальному додатку потрібно видалити користувача з бази даних
        
        logout();
      } catch (error) {
        setMessage({ type: 'error', text: 'Помилка видалення акаунта' });
      }
    }
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Налаштування</h1>
      
      {/* Інформація про користувача */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Інформація про користувача</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Ім'я користувача</p>
            <p className="text-lg font-medium">{user?.username}</p>
          </div>
        </div>
      </div>
      
      {/* Зміна пароля */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Зміна пароля</h2>
        
        {message && (
          <div className={`p-4 mb-4 rounded-md ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Поточний пароль
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              {...register('currentPassword', { required: 'Це поле обов\'язкове' })}
            />
            {errors.currentPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.currentPassword.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Новий пароль
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              {...register('newPassword', { 
                required: 'Це поле обов\'язкове',
                minLength: { value: 6, message: 'Пароль має бути не менше 6 символів' }
              })}
            />
            {errors.newPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.newPassword.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Підтвердження нового пароля
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              {...register('confirmPassword', { 
                required: 'Це поле обов\'язкове',
                validate: value => value === watch('newPassword') || 'Паролі не співпадають'
              })}
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>
          
          <div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Змінити пароль
            </button>
          </div>
        </form>
      </div>
      
      {/* Видалення акаунта */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Видалення акаунта</h2>
        <p className="text-gray-500 mb-4">
          Ця дія незворотна. Всі ваші дані будуть видалені.
        </p>
        <button
          onClick={handleDeleteAccount}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
        >
          Видалити акаунт
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
