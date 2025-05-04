import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { trpc } from '../utils/trpc';

interface EventForm {
  type: 'tax_payment' | 'report_submission' | 'other';
  description: string;
  date: string;
  completed: boolean;
}

const EventsPage: React.FC = () => {
  const { user } = useAuth();
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<EventForm>({
    defaultValues: {
      type: 'tax_payment',
      date: new Date().toISOString().split('T')[0],
      completed: false,
    },
  });
  
  // Отримання подій користувача
  const { data: events, isLoading, refetch } = trpc.events.getByUser.useQuery(
    { user_id: user?.id || 0 },
    { enabled: !!user }
  );
  
  // Мутації для операцій з подіями
  const createEvent = trpc.events.create.useMutation({
    onSuccess: () => refetch(),
  });
  
  const updateEvent = trpc.events.update.useMutation({
    onSuccess: () => refetch(),
  });
  
  const deleteEvent = trpc.events.delete.useMutation({
    onSuccess: () => refetch(),
  });
  
  // Обробка відправки форми
  const onSubmit = async (data: EventForm) => {
    if (!user) return;
    
    try {
      if (editingEventId) {
        // Оновлення існуючої події
        await updateEvent.mutateAsync({
          id: editingEventId,
          ...data,
          user_id: user.id,
        });
      } else {
        // Створення нової події
        await createEvent.mutateAsync({
          ...data,
          user_id: user.id,
        });
      }
      
      // Скидання форми та стану
      reset();
      setIsAddingEvent(false);
      setEditingEventId(null);
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };
  
  // Функція для редагування події
  const handleEdit = (event: any) => {
    setEditingEventId(event.id);
    setIsAddingEvent(true);
    
    // Заповнення форми даними події
    setValue('type', event.type);
    setValue('description', event.description);
    setValue('date', event.date.split('T')[0]);
    setValue('completed', event.completed);
  };
  
  // Функція для видалення події
  const handleDelete = async (id: number) => {
    if (confirm('Ви впевнені, що хочете видалити цю подію?')) {
      try {
        await deleteEvent.mutateAsync({ id });
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };
  
  // Функція для зміни статусу події
  const handleToggleStatus = async (event: any) => {
    try {
      await updateEvent.mutateAsync({
        id: event.id,
        completed: !event.completed,
        user_id: user?.id || 0,
      });
    } catch (error) {
      console.error('Error updating event status:', error);
    }
  };
  
  // Функція для скасування редагування
  const handleCancel = () => {
    setIsAddingEvent(false);
    setEditingEventId(null);
    reset();
  };
  
  // Фільтрація подій
  const filteredEvents = React.useMemo(() => {
    if (!events) return [];
    
    return events.filter(event => {
      if (filter === 'all') return true;
      if (filter === 'completed') return event.completed;
      if (filter === 'pending') return !event.completed;
      return true;
    });
  }, [events, filter]);
  
  if (isLoading) {
    return <div>Завантаження...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Події</h1>
        {!isAddingEvent && (
          <button
            onClick={() => setIsAddingEvent(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Додати подію
          </button>
        )}
      </div>
      
      {/* Форма додавання/редагування події */}
      {isAddingEvent && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {editingEventId ? 'Редагувати подію' : 'Додати нову подію'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип події
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                {...register('type', { required: 'Це поле обов\'язкове' })}
              >
                <option value="tax_payment">Сплата податків</option>
                <option value="report_submission">Подання звіту</option>
                <option value="other">Інше</option>
              </select>
              {errors.type && (
                <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Опис
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                {...register('description', { required: 'Це поле обов\'язкове' })}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дата
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                {...register('date', { required: 'Це поле обов\'язкове' })}
              />
              {errors.date && (
                <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
              )}
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="completed"
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                {...register('completed')}
              />
              <label htmlFor="completed" className="ml-2 block text-sm text-gray-900">
                Виконано
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
                {editingEventId ? 'Оновити' : 'Зберегти'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Фільтри */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Всі
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md ${
              filter === 'pending'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Очікують
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-md ${
              filter === 'completed'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Виконані
          </button>
        </div>
      </div>
      
      {/* Список подій */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Опис
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дії
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEvents.map((event) => (
                  <tr key={event.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={event.completed}
                          onChange={() => handleToggleStatus(event)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                          event.completed
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {event.completed ? 'Виконано' : 'Очікує'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event.type === 'tax_payment'
                        ? 'Сплата податків'
                        : event.type === 'report_submission'
                        ? 'Подання звіту'
                        : 'Інше'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(event.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(event)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Редагувати
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
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
            Немає подій для відображення.
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
