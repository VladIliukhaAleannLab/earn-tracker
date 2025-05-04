import React, { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../utils/trpc';

interface IncomeForm {
  amount: number;
  currency: string;
  exchange_rate: number;
  description: string;
  date: string;
}

const IncomePage: React.FC = () => {
  const { user } = useAuth();
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<IncomeForm>({
    defaultValues: {
      currency: 'USD',
      exchange_rate: 1,
      date: new Date().toISOString().split('T')[0],
    },
  });

  // Отримання доходів користувача
  const {
    data: incomes,
    isLoading,
    refetch,
  } = trpc.incomes.getByUser.useQuery({ user_id: user?.id || 0 }, { enabled: !!user });

  // Мутації для операцій з доходами
  const createIncome = trpc.incomes.create.useMutation({
    onSuccess: () => refetch(),
  });

  const updateIncome = trpc.incomes.update.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteIncome = trpc.incomes.delete.useMutation({
    onSuccess: () => refetch(),
  });

  // Обробка відправки форми
  const onSubmit = async (data: IncomeForm) => {
    if (!user) return;

    try {
      if (editingIncomeId) {
        // Оновлення існуючого доходу
        await updateIncome.mutateAsync({
          id: editingIncomeId,
          ...data,
          user_id: user.id,
        });
      } else {
        // Створення нового доходу
        await createIncome.mutateAsync({
          ...data,
          user_id: user.id,
        });
      }

      // Скидання форми та стану
      reset();
      setIsAddingIncome(false);
      setEditingIncomeId(null);
    } catch (error) {
      console.error('Error saving income:', error);
    }
  };

  // Функція для редагування доходу
  const handleEdit = (income: any) => {
    setEditingIncomeId(income.id);
    setIsAddingIncome(true);

    // Заповнення форми даними доходу
    setValue('amount', income.amount);
    setValue('currency', income.currency);
    setValue('exchange_rate', income.exchange_rate);
    setValue('description', income.description || '');
    setValue('date', income.date.split('T')[0]);
  };

  // Функція для видалення доходу
  const handleDelete = async (id: number) => {
    if (confirm('Ви впевнені, що хочете видалити цей дохід?')) {
      try {
        await deleteIncome.mutateAsync({ id });
      } catch (error) {
        console.error('Error deleting income:', error);
      }
    }
  };

  // Спостереження за полями форми
  const currency = useWatch({ control, name: 'currency' });
  const date = useWatch({ control, name: 'date' });

  // Мутація для отримання курсу валюти від НБУ
  const getNBUExchangeRate = trpc.services.getNBUExchangeRate.useQuery(
    { currency: currency || 'USD', date: date || new Date().toISOString().split('T')[0] },
    { enabled: false } // Не запускати запит автоматично
  );

  // Функція для отримання курсу валюти від НБУ
  const fetchExchangeRate = async () => {
    // Якщо валюта UAH, встановлюємо курс 1 і виходимо
    if (currency === 'UAH') {
      setValue('exchange_rate', 1);
      return;
    }

    // Встановлюємо стан завантаження
    setIsLoadingRate(true);

    try {
      // Отримуємо курс валюти від НБУ через tRPC
      const result = await getNBUExchangeRate.refetch();

      // Якщо курс отримано успішно, встановлюємо його у формі
      if (result.data && result.data.rate !== null) {
        setValue('exchange_rate', result.data.rate);
      } else {
        // Якщо виникла помилка, показуємо повідомлення
        alert(
          "Не вдалося отримати курс валюти. Перевірте з'єднання з інтернетом або введіть курс вручну."
        );
      }
    } catch (error) {
      console.error('Помилка при отриманні курсу валюти:', error);
      alert('Помилка при отриманні курсу валюти. Спробуйте ще раз або введіть курс вручну.');
    } finally {
      // Знімаємо стан завантаження
      setIsLoadingRate(false);
    }
  };

  // Функція для скасування редагування
  const handleCancel = () => {
    setIsAddingIncome(false);
    setEditingIncomeId(null);
    reset();
  };

  if (isLoading) {
    return <div>Завантаження...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Доходи</h1>
        {!isAddingIncome && (
          <button
            onClick={() => setIsAddingIncome(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Додати дохід
          </button>
        )}
      </div>

      {/* Форма додавання/редагування доходу */}
      {isAddingIncome && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {editingIncomeId ? 'Редагувати дохід' : 'Додати новий дохід'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Сума</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  {...register('amount', {
                    required: "Це поле обов'язкове",
                    min: { value: 0.01, message: 'Сума має бути більше 0' },
                  })}
                />
                {errors.amount && (
                  <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Валюта</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  {...register('currency', {
                    required: "Це поле обов'язкове",
                    onChange: e => {
                      // Якщо валюта змінилась на UAH, встановлюємо курс 1
                      if (e.target.value === 'UAH') {
                        setValue('exchange_rate', 1);
                      }
                    },
                  })}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="UAH">UAH</option>
                </select>
                {errors.currency && (
                  <p className="text-red-500 text-sm mt-1">{errors.currency.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Курс обміну (до гривні)
                </label>
                <div className="flex">
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-l-md"
                    {...register('exchange_rate', {
                      required: "Це поле обов'язкове",
                      min: { value: 0.01, message: 'Курс має бути більше 0' },
                    })}
                  />
                  <button
                    type="button"
                    className={`px-3 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 ${isLoadingRate ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={fetchExchangeRate}
                    disabled={isLoadingRate}
                  >
                    {isLoadingRate ? '...' : 'НБУ'}
                  </button>
                </div>
                {errors.exchange_rate && (
                  <p className="text-red-500 text-sm mt-1">{errors.exchange_rate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  {...register('date', {
                    required: "Це поле обов'язкове",
                  })}
                />
                {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Опис</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                {...register('description')}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Скасувати
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                {editingIncomeId ? 'Оновити' : 'Зберегти'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Таблиця доходів */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {incomes && incomes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сума
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Валюта
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Курс
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сума (UAH)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Опис
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дії
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {incomes.map(income => (
                  <tr key={income.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(income.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {income.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {income.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {income.exchange_rate.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(income.amount * income.exchange_rate).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {income.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(income)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Редагувати
                      </button>
                      <button
                        onClick={() => handleDelete(income.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Видалити
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            Немає доходів для відображення. Додайте свій перший дохід.
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomePage;
