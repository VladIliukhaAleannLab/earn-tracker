import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../utils/trpc';
import { DateTime } from 'luxon';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'quarter' | 'year'>('quarter');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [quarter, setQuarter] = useState<number>(Math.floor(new Date().getMonth() / 3) + 1);

  // Розрахунок початку і кінця періоду
  const { startDate, endDate } = React.useMemo(() => {
    if (period === 'quarter') {
      // Використовуємо Luxon для розрахунку дат кварталу
      const firstMonthOfQuarter = (quarter - 1) * 3 + 1;
      const start = DateTime.local(year, firstMonthOfQuarter, 1).startOf('day');
      const end = start.endOf('quarter');

      console.log(`Quarter ${quarter} of ${year}: ${start.toISODate()} to ${end.toISODate()}`);

      return {
        startDate: start.toISODate() || '',
        endDate: end.toISODate() || '',
      };
    } else {
      // Використовуємо Luxon для розрахунку дат року
      const start = DateTime.local(year, 1, 1).startOf('day');
      const end = DateTime.local(year, 12, 31).endOf('day');

      console.log(`Year ${year}: ${start.toISODate()} to ${end.toISODate()}`);

      return {
        startDate: start.toISODate() || '',
        endDate: end.toISODate() || '',
      };
    }
  }, [period, year, quarter]);

  // Отримання доходів за період
  const { data: incomeData, isLoading: incomeLoading } = trpc.analytics.getIncomeByPeriod.useQuery(
    {
      user_id: user?.id || 0,
      start_date: startDate,
      end_date: endDate,
    },
    { enabled: !!user }
  );

  // Отримання податків за період
  const { data: taxData, isLoading: taxLoading } = trpc.analytics.calculateTaxes.useQuery(
    {
      user_id: user?.id || 0,
      start_date: startDate,
      end_date: endDate,
    },
    { enabled: !!user }
  );

  // Підготовка даних для графіків
  const chartData = React.useMemo(() => {
    if (!incomeData) return [];

    // Групування доходів за місяцями або днями
    const groupedData = new Map();

    incomeData.forEach(income => {
      const date = new Date(income.date);
      let key;

      if (period === 'year') {
        // Групування за місяцями для року
        key = date.getMonth();
      } else {
        // Групування за днями для кварталу
        key = date.getDate() + '-' + (date.getMonth() + 1);
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          name: period === 'year' ? getMonthName(date.getMonth()) : key,
          amount: 0,
        });
      }

      groupedData.get(key).amount += income.amount * income.exchange_rate;
    });

    return Array.from(groupedData.values());
  }, [incomeData, period]);

  // Підготовка даних для кругової діаграми податків
  const taxChartData = React.useMemo(() => {
    if (!taxData || !taxData.taxes) return [];
    return taxData.taxes.map(tax => ({
      name: tax.name,
      value: tax.amount,
    }));
  }, [taxData]);

  // Кольори для кругової діаграми
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Функція для отримання назви місяця
  function getMonthName(monthIndex: number): string {
    const months = [
      'Січень',
      'Лютий',
      'Березень',
      'Квітень',
      'Травень',
      'Червень',
      'Липень',
      'Серпень',
      'Вересень',
      'Жовтень',
      'Листопад',
      'Грудень',
    ];
    return months[monthIndex];
  }

  // Функція для зміни року
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(parseInt(e.target.value));
  };

  // Функція для зміни кварталу
  const handleQuarterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setQuarter(parseInt(e.target.value));
  };

  if (incomeLoading || taxLoading) {
    return <div>Завантаження...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Аналітика</h1>

      {/* Фільтри */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Період</label>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value as 'quarter' | 'year')}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="quarter">Квартал</option>
              <option value="year">Рік</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Рік</label>
            <select
              value={year}
              onChange={handleYearChange}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {period === 'quarter' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Квартал</label>
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
          )}
        </div>
      </div>

      {/* Загальна інформація */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Загальний дохід</h2>
          <p className="text-2xl font-bold text-green-600">
            {taxData?.totalIncome.toFixed(2) || '0.00'} ₴
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Загальний податок</h2>
          <p className="text-2xl font-bold text-red-600">
            {taxData?.totalTax.toFixed(2) || '0.00'} ₴
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Чистий дохід</h2>
          <p className="text-2xl font-bold text-blue-600">
            {((taxData?.totalIncome || 0) - (taxData?.totalTax || 0)).toFixed(2)} ₴
          </p>
        </div>
      </div>

      {/* Графік доходів */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Динаміка доходів</h2>
        {chartData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={value => [`${Number(value).toFixed(2)} ₴`, 'Сума']} />
                <Legend />
                <Bar dataKey="amount" name="Дохід (₴)" fill="#4F46E5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-10">Немає даних для відображення</p>
        )}
      </div>

      {/* Графік податків */}
      {taxChartData.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Розподіл податків</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taxChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taxChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={value => [`${Number(value).toFixed(2)} ₴`, 'Сума']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Таблиця податків */}
          <div className="mt-4">
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
                {taxData?.taxes.map((tax, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tax.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tax.amount.toFixed(2)} ₴
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Загалом
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {taxData?.totalTax.toFixed(2)} ₴
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
