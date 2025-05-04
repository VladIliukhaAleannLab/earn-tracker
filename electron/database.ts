import { Kysely, SqliteDialect, Generated } from 'kysely';
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

// Типи для бази даних
export interface UserTable {
  id: Generated<number>;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface IncomeTable {
  id: Generated<number>;
  user_id: number;
  amount: number;
  currency: string;
  exchange_rate: number;
  description: string | null;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface TaxSettingTable {
  id: Generated<number>;
  user_id: number;
  name: string;
  type: 'fixed' | 'percentage';
  value: number;
  active: number; // 0 = false, 1 = true for SQLite compatibility
  created_at: string;
  updated_at: string;
}

export interface EventTable {
  id: Generated<number>;
  user_id: number;
  type: 'tax_payment' | 'report_submission' | 'other';
  description: string;
  date: string;
  completed: number; // 0 = false, 1 = true for SQLite compatibility
  created_at: string;
  updated_at: string;
}

// Інтерфейс бази даних
export interface Database {
  users: UserTable;
  incomes: IncomeTable;
  tax_settings: TaxSettingTable;
  events: EventTable;
}

// Глобальна змінна для доступу до бази даних
let db: Kysely<Database> | null = null;

// Функція для отримання шляху до бази даних
function getDatabasePath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'earn-tracker.db');
}

// Функція для створення таблиць
async function createTables(db: Kysely<Database>) {
  console.log('Creating database tables...');

  // Створення таблиці користувачів
  await db.schema
    .createTable('users')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('username', 'text', (col) => col.notNull().unique())
    .addColumn('password_hash', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(new Date().toISOString()))
    .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(new Date().toISOString()))
    .execute();
  console.log('Users table created');

  // Створення таблиці доходів
  await db.schema
    .createTable('incomes')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('user_id', 'integer', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('amount', 'real', (col) => col.notNull())
    .addColumn('currency', 'text', (col) => col.notNull())
    .addColumn('exchange_rate', 'real', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('date', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(new Date().toISOString()))
    .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(new Date().toISOString()))
    .execute();
  console.log('Incomes table created');

  // Створення таблиці налаштувань податків
  await db.schema
    .createTable('tax_settings')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('user_id', 'integer', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('type', 'text', (col) => col.notNull())
    .addColumn('value', 'real', (col) => col.notNull())
    .addColumn('active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(new Date().toISOString()))
    .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(new Date().toISOString()))
    .execute();
  console.log('Tax settings table created');

  // Створення таблиці подій
  await db.schema
    .createTable('events')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('user_id', 'integer', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('type', 'text', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('date', 'text', (col) => col.notNull())
    .addColumn('completed', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(new Date().toISOString()))
    .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(new Date().toISOString()))
    .execute();
  console.log('Events table created');

  // Додаємо тестового користувача, якщо таблиця порожня
  const userCount = await db.selectFrom('users').select(db.fn.count('id').as('count')).executeTakeFirst();
  if (userCount && Number(userCount.count) === 0) {
    await db.insertInto('users').values({
      username: 'admin',
      password_hash: 'admin', // В реальному додатку це має бути хеш
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).execute();
    console.log('Test user created');
  }
}

// Функція для ініціалізації бази даних
export async function setupDatabase() {
  try {
    console.log('Setting up database...');
    const dbPath = getDatabasePath();
    console.log('Database path:', dbPath);

    // Створення директорії, якщо вона не існує
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      console.log('Creating database directory:', dbDir);
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Створення з'єднання з базою даних
    console.log('Creating SQLite connection...');
    const sqlite = new Database(dbPath);

    db = new Kysely<Database>({
      dialect: new SqliteDialect({
        database: sqlite,
      }),
    });
    console.log('Kysely initialized');

    // Створення таблиць
    await createTables(db);
    console.log('Database setup completed successfully');

    return db;
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  }
}

// Функція для отримання екземпляра бази даних
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call setupDatabase first.');
  }
  return db;
}
