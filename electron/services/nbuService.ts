import { DateTime } from 'luxon';
// Використовуємо вбудований fetch

interface NBUCurrencyRate {
  r030: number;
  txt: string;
  rate: number;
  cc: string;
  exchangedate: string;
}

/**
 * Сервіс для отримання курсів валют від Національного банку України
 */
export const nbuService = {
  /**
   * Отримати курс валюти на вказану дату
   * @param currency Код валюти (USD, EUR, тощо)
   * @param date Дата у форматі ISO (YYYY-MM-DD)
   * @returns Курс валюти до гривні або null у випадку помилки
   */
  async getCurrencyRate(currency: string, date: string): Promise<number | null> {
    try {
      // Якщо валюта UAH, повертаємо 1
      if (currency === 'UAH') {
        return 1;
      }

      // Перетворюємо дату у формат, який очікує API НБУ (YYYYMMDD)
      const dt = DateTime.fromISO(date);
      const formattedDate = dt.toFormat('yyyyMMdd');

      // Формуємо URL для запиту до API НБУ
      const url = `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${currency}&date=${formattedDate}&json`;

      // Виконуємо запит до API
      const response = await fetch(url);

      if (!response.ok) {
        console.error('Помилка отримання курсу валют:', response.statusText);
        return null;
      }

      const data: NBUCurrencyRate[] = (await response.json()) as NBUCurrencyRate[];

      // Перевіряємо, чи отримали дані
      if (!data || data.length === 0) {
        console.error('Не вдалося отримати курс валюти');
        return null;
      }

      // Повертаємо курс валюти
      return data[0].rate;
    } catch (error) {
      console.error('Помилка при отриманні курсу валюти:', error);
      return null;
    }
  },
};
