import { Kysely } from 'kysely';
import { Database } from '../database';
import { addQuarterYearToTaxSettings } from "./add-quarter-year-to-tax-settings";

// Функція для запуску всіх міграцій
export async function runMigrations(db: Kysely<Database>) {
  console.log('Running database migrations...');

  // Масив міграцій для запуску
  const migrations = [
    { name: 'add-quarter-year-to-tax-settings', migrate: () => addQuarterYearToTaxSettings(db) }
  ];

  // Запускаємо кожну міграцію окремо
  for (const migration of migrations) {
    try {
      console.log(`Running migration: ${migration.name}`);
      await migration.migrate();
      console.log(`Migration ${migration.name} completed successfully`);
    } catch (error) {
      console.error(`Error running migration ${migration.name}:`, error);
      // Продовжуємо з наступною міграцією навіть якщо поточна не вдалася
    }
  }

  console.log('All migrations completed');
}
