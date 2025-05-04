import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../utils/trpc';

interface LoginForm {
  username: string;
  password: string;
  isRegister: boolean;
}

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const createUser = trpc.users.create.useMutation();

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Form submitted:', { isRegister, username: data.username });

      if (isRegister) {
        // Реєстрація нового користувача
        console.log('Attempting to create user...');
        try {
          const result = await createUser.mutateAsync({
            username: data.username,
            password: data.password,
          });
          console.log('User created:', result);
        } catch (createError) {
          console.error('Error creating user:', createError);
          throw createError;
        }
      }

      // Вхід
      console.log('Attempting to login...');
      await login(data.username, data.password);
    } catch (err) {
      console.error('Form submission error:', err);
      // Виділяємо повідомлення про помилку
      let errorMessage = 'Помилка входу. Спробуйте ще раз.';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String(err.message);
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isRegister ? 'Реєстрація' : 'Вхід'}
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="username">
              Ім'я користувача
            </label>
            <input
              id="username"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              {...register('username', { required: 'Це поле обов\'язкове' })}
            />
            {errors.username && (
              <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 mb-2" htmlFor="password">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              {...register('password', {
                required: 'Це поле обов\'язкове',
                minLength: { value: 6, message: 'Пароль має бути не менше 6 символів' }
              })}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? 'Завантаження...' : isRegister ? 'Зареєструватися' : 'Увійти'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-blue-500 hover:underline"
          >
            {isRegister ? 'Вже маєте акаунт? Увійти' : 'Немає акаунту? Зареєструватися'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
