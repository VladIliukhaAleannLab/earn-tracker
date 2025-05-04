import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../utils/trpc';

interface TaxSettingForm {
  name: string;
  type: 'fixed' | 'percentage';
  value: number;
  active: boolean;
}

const TaxesPage: React.FC = () => {
  const { user } = useAuth();
  const [isAddingTax, setIsAddingTax] = useState(false);
  const [editingTaxId, setEditingTaxId] = useState<number | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<TaxSettingForm>({
    defaultValues: {
      type: 'percentage',
      active: true,
    },
  });

  // Отримання податкових налаштувань користувача
  const { data: taxSettings, isLoading, refetch } = trpc.taxSettings.getByUser.useQuery(
    { user_id: user?.id || 0 },
    { enabled: !!user }
  );

  // Мутації для операцій з податковими налаштуваннями
  const createTaxSetting = trpc.taxSettings.create.useMutation({
    onSuccess: () => refetch(),
  });

  const updateTaxSetting = trpc.taxSettings.update.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteTaxSetting = trpc.taxSettings.delete.useMutation({
    onSuccess: () => refetch(),
  });

  // Обробка відправки форми
  const onSubmit = async (data: TaxSettingForm) => {
    if (!user) return;

    try {
      if (editingTaxId) {
        // Оновлення існуючого податкового налаштування
        await updateTaxSetting.mutateAsync({
          id: editingTaxId,
          ...data,
          user_id: user.id,
        });
      } else {
        // Створення нового податкового налаштування
        await createTaxSetting.mutateAsync({
          ...data,
          user_id: user.id,
        });
      }

      // Скидання форми та стану
      reset();
      setIsAddingTax(false);
      setEditingTaxId(null);
    } catch (error) {
      console.error('Error saving tax setting:', error);
    }
  };

  // Функція для редагування податкового налаштування
  const handleEdit = (taxSetting: any) => {
    setEditingTaxId(taxSetting.id);
    setIsAddingTax(true);

    // Заповнення форми даними податкового налаштування
    setValue('name', taxSetting.name);
    setValue('type', taxSetting.type);
    setValue('value', taxSetting.value);
    setValue('active', taxSetting.active === 1); // Convert 0/1 to boolean for form
  };

  // Функція для видалення податкового налаштування
  const handleDelete = async (id: number) => {
    if (confirm('Ви впевнені, що хочете видалити це податкове налаштування?')) {
      try {
        await deleteTaxSetting.mutateAsync({ id });
      } catch (error) {
        console.error('Error deleting tax setting:', error);
      }
    }
  };

  // Функція для скасування редагування
  const handleCancel = () => {
    setIsAddingTax(false);
    setEditingTaxId(null);
    reset();
  };

  // Отримання поточної дати
  const currentDate = new Date();
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [quarter, setQuarter] = useState<number>(Math.floor(currentDate.getMonth() / 3) + 1);

  // Розрахунок початку і кінця вибраного кварталу
  const { startOfQuarter, endOfQuarter } = useMemo(() => {
    const start = new Date(year, (quarter - 1) * 3, 1);
    const end = new Date(year, quarter * 3, 0);
    return {
      startOfQuarter: start,
      endOfQuarter: end
    };
  }, [year, quarter]);

  // Функція для зміни року
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(parseInt(e.target.value));
  };

  // Функція для зміни кварталу
  const handleQuarterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setQuarter(parseInt(e.target.value));
  };

  // Отримання податків за вибраний квартал
  const { data: quarterlyTaxes } = trpc.analytics.calculateTaxes.useQuery(
    {
      user_id: user?.id || 0,
      start_date: startOfQuarter.toISOString().split('T')[0],
      end_date: endOfQuarter.toISOString().split('T')[0],
    },
    { enabled: !!user }
  );

  if (isLoading) {
    return <div>Завантаження...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Податки</h1>
        {!isAddingTax && (
          <button
            onClick={() => setIsAddingTax(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Додати податок
          </button>
        )}
      </div>

      {/* Інформація про податки за вибраний квартал */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Податки за {quarter} квартал {year} року
          </h2>

          <div className="flex space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Рік
              </label>
              <select
                value={year}
                onChange={handleYearChange}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Квартал
              </label>
              <select
                value={quarter}
                onChange={handleQuarterChange}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value={1}>1 квартал</option>
                <option value={2}>2 квартал</option>
                <option value={3}>3 квартал</option>
                <option value={4}>4 квартал</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500">Загальний дохід</p>
            <p className="text-2xl font-bold text-green-600">
              {quarterlyTaxes?.totalIncome.toFixed(2) || '0.00'} ₴
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500">Загальний податок</p>
            <p className="text-2xl font-bold text-red-600">
              {quarterlyTaxes?.totalTax.toFixed(2) || '0.00'} ₴
            </p>
          </div>
        </div>

        {quarterlyTaxes?.taxes && quarterlyTaxes.taxes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Назва податку
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сума
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quarterlyTaxes.taxes.map((tax, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tax.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tax.amount.toFixed(2)} ₴
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">Немає податків для відображення</p>
        )}
      </div>

      {/* Форма додавання/редагування податкового налаштування */}
      {isAddingTax && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {editingTaxId ? 'Редагувати податок' : 'Додати новий податок'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Назва податку
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                {...register('name', { required: 'Це поле обов\'язкове' })}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип податку
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                {...register('type', { required: 'Це поле обов\'язкове' })}
              >
                <option value="percentage">Відсотковий</option>
                <option value="fixed">Фіксований</option>
              </select>
              {errors.type && (
                <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Значення
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                {...register('value', {
                  required: 'Це поле обов\'язкове',
                  min: { value: 0, message: 'Значення має бути більше або дорівнювати 0' }
                })}
              />
              {errors.value && (
                <p className="text-red-500 text-sm mt-1">{errors.value.message}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="active"
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                {...register('active')}
              />
              <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                Активний
              </label>
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
                {editingTaxId ? 'Оновити' : 'Зберегти'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Таблиця податкових налаштувань */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-xl font-semibold p-6 border-b">Налаштування податків</h2>

        {taxSettings && taxSettings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Назва
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Значення
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дії
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {taxSettings.map((taxSetting) => (
                  <tr key={taxSetting.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {taxSetting.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {taxSetting.type === 'percentage' ? 'Відсотковий' : 'Фіксований'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {taxSetting.value}
                      {taxSetting.type === 'percentage' ? '%' : ' ₴'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        taxSetting.active === 1
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {taxSetting.active === 1 ? 'Активний' : 'Неактивний'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(taxSetting)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Редагувати
                      </button>
                      <button
                        onClick={() => handleDelete(taxSetting.id)}
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
            Немає налаштувань податків. Додайте своє перше налаштування.
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxesPage;
