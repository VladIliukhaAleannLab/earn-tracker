import { Kysely } from 'kysely';
import { Database } from '../database';

/**
 * Проста міграція для додавання колонок year і quarter до таблиці tax_settings
 * Використовує прості SQL запити через Kysely
 */
export async function addQuarterYearToTaxSettings(db: Kysely<Database>) {
  console.log('Running simple migration...');

  try {
    // Поточний рік і квартал
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;

    // Додаємо колонки year і quarter
    try {
      // Спробуємо додати колонку year
      await db.schema
        .alterTable('tax_settings')
        .addColumn('year', 'integer', col => col.defaultTo(currentYear))
        .execute();
      console.log('Year column added successfully');
    } catch (error) {
      console.log('Year column might already exist or table does not exist yet');
    }

    try {
      // Спробуємо додати колонку quarter
      await db.schema
        .alterTable('tax_settings')
        .addColumn('quarter', 'integer', col => col.defaultTo(currentQuarter))
        .execute();
      console.log('Quarter column added successfully');
    } catch (error) {
      console.log('Quarter column might already exist or table does not exist yet');
    }

    // Оновлюємо існуючі записи, встановлюючи поточний рік і квартал для NULL значень
    try {
      await db
        .updateTable('tax_settings')
        .set({
          year: currentYear,
          quarter: currentQuarter,
        })
        .where(eb => eb.or([eb('year', 'is', null), eb('quarter', 'is', null)]))
        .execute();
      console.log('Updated existing records with current year and quarter');
    } catch (error) {
      console.log('No records to update or table does not exist yet');
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    // Не кидаємо помилку далі, щоб додаток міг продовжити роботу
  }
}
