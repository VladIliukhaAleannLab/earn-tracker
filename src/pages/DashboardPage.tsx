import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../utils/trpc';
import { DateTime } from 'luxon';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Отримання доходів користувача
  const { data: incomes, isLoading: incomesLoading } = trpc.incomes.getByUser.useQuery(
    { user_id: user?.id || 0 },
    { enabled: !!user }
  );

  // Отримання подій користувача
  const { data: events, isLoading: eventsLoading } = trpc.events.getByUser.useQuery(
    { user_id: user?.id || 0 },
    { enabled: !!user }
  );

  // Розрахунок загального доходу
  const totalIncome = React.useMemo(() => {
    if (!incomes) return 0;
    return incomes.reduce((sum, income) => sum + income.amount * income.exchange_rate, 0);
  }, [incomes]);

  // Отримання поточної дати з використанням Luxon
  const currentDate = DateTime.now();
  const currentYear = currentDate.year;
  const currentQuarter = Math.ceil(currentDate.month / 3);

  // Розрахунок початку і кінця поточного кварталу з використанням Luxon
  const firstMonthOfQuarter = (currentQuarter - 1) * 3 + 1;
  const startOfQuarter = DateTime.local(currentYear, firstMonthOfQuarter, 1).startOf('day');
  const endOfQuarter = startOfQuarter.endOf('quarter');

  console.log(
    `Current quarter: ${currentQuarter} of ${currentYear}: ${startOfQuarter.toISODate()} to ${endOfQuarter.toISODate()}`
  );

  // Отримання доходів за поточний квартал
  const { data: quarterlyData } = trpc.analytics.calculateTaxes.useQuery(
    {
      user_id: user?.id || 0,
      start_date: startOfQuarter.toISODate() || '',
      end_date: endOfQuarter.toISODate() || '',
    },
    {
      enabled: !!user,
      onSuccess: _ => {
        console.log(
          `Got quarterly tax data for period: ${startOfQuarter.toISODate()} to ${endOfQuarter.toISODate()}`
        );
      },
    }
  );

  // Найближчі події
  const upcomingEvents = React.useMemo(() => {
    if (!events) return [];
    return events
      .filter(event => !event.completed)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [events]);

  if (incomesLoading || eventsLoading) {
    return <div>Завантаження...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Панель управління</h1>

      {/* Картки з основною інформацією */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Загальний дохід</h2>
          <p className="text-2xl font-bold text-green-600">{totalIncome.toFixed(2)} ₴</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Дохід за квартал</h2>
          <p className="text-2xl font-bold text-blue-600">
            {quarterlyData?.totalIncome.toFixed(2) || '0.00'} ₴
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Податки за квартал</h2>
          <p className="text-2xl font-bold text-red-600">
            {quarterlyData?.totalTax.toFixed(2) || '0.00'} ₴
          </p>
        </div>
      </div>

      {/* Останні доходи */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Останні доходи</h2>
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
                    Опис
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {incomes.slice(0, 5).map(income => (
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
                      {income.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">Немає доходів для відображення</p>
        )}
      </div>

      {/* Найближчі події */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Найближчі події</h2>
        {upcomingEvents.length > 0 ? (
          <ul className="space-y-2">
            {upcomingEvents.map(event => (
              <li key={event.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{event.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(event.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {event.type === 'tax_payment'
                      ? 'Сплата податків'
                      : event.type === 'report_submission'
                        ? 'Подання звіту'
                        : 'Інше'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Немає найближчих подій</p>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
