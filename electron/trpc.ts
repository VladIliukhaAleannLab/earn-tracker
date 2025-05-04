import { initTRPC } from '@trpc/server';
import { IpcMain } from 'electron';
import { z } from 'zod';
// Використовуємо JSON.stringify/parse замість superjson
import { getDatabase } from './database';
import { sql } from 'kysely';
import { DateTime } from 'luxon';

// Створення контексту tRPC
const createContext = () => ({
  db: getDatabase(),
});

type Context = ReturnType<typeof createContext>;

// Ініціалізація tRPC
const t = initTRPC.context<Context>().create({
  // Використовуємо стандартний JSON замість superjson
});

// Базові будівельні блоки
const router = t.router;
const publicProcedure = t.procedure;

// Схеми валідації
const userSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

const incomeSchema = z.object({
  amount: z.preprocess(
    Number,
    z.number().positive({ message: "Сума має бути більше 0" })
  ),
  currency: z.string(),
  exchange_rate: z.preprocess(
      Number,
    z.number().positive({ message: "Курс обміну має бути більше 0" })
  ),
  description: z.string().optional(),
  date: z.string(),
  user_id: z.number(),
});

const taxSettingSchema = z.object({
  name: z.string(),
  type: z.enum(['fixed', 'percentage']),
  value: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val) : val),
    z.number().positive({ message: "Значення має бути більше 0" })
  ),
  active: z.preprocess(
    (val) => {
      if (typeof val === 'boolean') return val ? 1 : 0;
      if (typeof val === 'string') return val === 'true' || val === '1' ? 1 : 0;
      return val ? 1 : 0;
    },
    z.number().min(0).max(1)
  ), // Transform various inputs to 0/1 for SQLite
  year: z.number(),
  quarter: z.number().min(1).max(4),
  user_id: z.number(),
});

const eventSchema = z.object({
  type: z.enum(['tax_payment', 'report_submission', 'other']),
  description: z.string(),
  date: z.string(),
  completed: z.preprocess(
    (val) => {
      if (typeof val === 'boolean') return val ? 1 : 0;
      if (typeof val === 'string') return val === 'true' || val === '1' ? 1 : 0;
      return val ? 1 : 0;
    },
    z.number().min(0).max(1)
  ), // Transform various inputs to 0/1 for SQLite
  user_id: z.number(),
});

// Створення API роутера
const appRouter = router({
  // Користувачі
  users: router({
    create: publicProcedure
      .input(userSchema)
      .mutation(async ({ input, ctx }) => {
        console.log('Creating user:', input.username);

        try {
          // Перевіряємо, чи існує користувач з таким ім'ям
          const existingUser = await ctx.db
            .selectFrom('users')
            .where('username', '==', input.username)
            .select(['id'])
            .executeTakeFirst();

          if (existingUser) {
            console.log('User already exists:', input.username);
            throw new Error('User already exists');
          }

          // Тут буде хешування пароля в реальному додатку
          const passwordHash = input.password; // Спрощено для прикладу

          // Використовуємо SQL для вставки даних
          console.log('Inserting user into database...');
          const result = await ctx.db
            .insertInto('users')
            .values({
              username: input.username,
              password_hash: passwordHash,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .returning(['id', 'username', 'created_at'])
            .executeTakeFirst();

          console.log('User created successfully:', result);
          return result;
        } catch (error) {
          console.error('Error creating user:', error);
          throw error;
        }
      }),

    login: publicProcedure
      .input(userSchema)
      .mutation(async ({ input, ctx }) => {
        console.log('Login attempt for user:', input.username);

        try {
          const user = await ctx.db
            .selectFrom('users')
            .where('username', '==', input.username)
            .select(['id', 'username', 'password_hash'])
            .executeTakeFirst();

          console.log('User found:', user ? 'yes' : 'no');

          if (!user) {
            throw new Error('User not found');
          }

          // Тут буде перевірка хешу пароля в реальному додатку
          if (user.password_hash !== input.password) {
            console.log('Invalid password');
            throw new Error('Invalid password');
          }

          console.log('Login successful for user:', input.username);
          return {
            id: user.id,
            username: user.username,
          };
        } catch (error) {
          console.error('Login error:', error);
          throw error;
        }
      }),

    getAll: publicProcedure
      .query(async ({ ctx }) => {
        return ctx.db
          .selectFrom('users')
          .select(['id', 'username', 'created_at'])
          .execute();
      }),
  }),

  // Доходи
  incomes: router({
    create: publicProcedure
      .input(incomeSchema)
      .mutation(async ({ input, ctx }) => {
        // Використовуємо SQL для вставки даних

          console.log("Creating income:", input)

        const result = await ctx.db
          .insertInto('incomes')
          .values({
            user_id: input.user_id,
            amount: input.amount,
            currency: input.currency,
            exchange_rate: input.exchange_rate,
            description: input.description || null,
            date: input.date,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .returning(['id', 'amount', 'currency', 'date'])
          .executeTakeFirst();

        return result;
      }),

    getByUser: publicProcedure
      .input(z.object({ user_id: z.number() }))
      .query(async ({ input, ctx }) => {
        return ctx.db
          .selectFrom('incomes')
          .where('user_id', '==', input.user_id)
          .selectAll()
          .execute();
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        ...incomeSchema.partial().shape,
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;

        return ctx.db
          .updateTable('incomes')
          .set({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .where('id', '==', id)
          .returning(['id', 'amount', 'currency', 'date'])
          .executeTakeFirst();
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return ctx.db
          .deleteFrom('incomes')
          .where('id', '==', input.id)
          .executeTakeFirst();
      }),
  }),

  // Налаштування податків
  taxSettings: router({
    // Копіювання податкових налаштувань з одного кварталу в інший
    copyFromQuarter: publicProcedure
      .input(z.object({
        user_id: z.number(),
        source_year: z.number(),
        source_quarter: z.number().min(1).max(4),
        target_year: z.number(),
        target_quarter: z.number().min(1).max(4),
      }))
      .mutation(async ({ input, ctx }) => {
        // Отримуємо налаштування з вихідного кварталу
        const sourceTaxSettings = await ctx.db
          .selectFrom('tax_settings')
          .where('user_id', '==', input.user_id)
          .where('year', '==', input.source_year)
          .where('quarter', '==', input.source_quarter)
          .selectAll()
          .execute();

        // Видаляємо існуючі налаштування в цільовому кварталі
        await ctx.db
          .deleteFrom('tax_settings')
          .where('user_id', '==', input.user_id)
          .where('year', '==', input.target_year)
          .where('quarter', '==', input.target_quarter)
          .execute();

        // Копіюємо налаштування в цільовий квартал
        if (sourceTaxSettings.length > 0) {
          const newTaxSettings = sourceTaxSettings.map(tax => ({
            user_id: input.user_id,
            name: tax.name,
            type: tax.type,
            value: tax.value,
            active: tax.active,
            year: input.target_year,
            quarter: input.target_quarter,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          await ctx.db
            .insertInto('tax_settings')
            .values(newTaxSettings)
            .execute();
        }

        return { success: true, count: sourceTaxSettings.length };
      }),

    create: publicProcedure
      .input(taxSettingSchema)
      .mutation(async ({ input, ctx }) => {
        // Використовуємо SQL для вставки даних
        const result = await ctx.db
          .insertInto('tax_settings')
          .values({
            user_id: input.user_id,
            name: input.name,
            type: input.type,
            value: input.value,
            active: input.active, // Already transformed by Zod schema
            year: input.year,
            quarter: input.quarter,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .returning(['id', 'name', 'type', 'value', 'year', 'quarter'])
          .executeTakeFirst();

        return result;
      }),

    getByUser: publicProcedure
      .input(z.object({
        user_id: z.number(),
        year: z.number().optional(),
        quarter: z.number().min(1).max(4).optional()
      }))
      .query(async ({ input, ctx }) => {
        let query = ctx.db
          .selectFrom('tax_settings')
          .where('user_id', '==', input.user_id);

        if (input.year !== undefined) {
          query = query.where('year', '==', input.year);
        }

        if (input.quarter !== undefined) {
          query = query.where('quarter', '==', input.quarter);
        }

        return query.selectAll().execute();
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        ...taxSettingSchema.partial().shape,
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;

        // No need to manually convert boolean to 0/1 as it's handled by Zod schema
        return ctx.db
          .updateTable('tax_settings')
          .set({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .where('id', '==', id)
          .returning(['id', 'name', 'type', 'value'])
          .executeTakeFirst();
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return ctx.db
          .deleteFrom('tax_settings')
          .where('id', '==', input.id)
          .executeTakeFirst();
      }),
  }),

  // Події
  events: router({
    create: publicProcedure
      .input(eventSchema)
      .mutation(async ({ input, ctx }) => {
        // Використовуємо SQL для вставки даних
        const result = await ctx.db
          .insertInto('events')
          .values({
            user_id: input.user_id,
            type: input.type,
            description: input.description,
            date: input.date,
            completed: input.completed, // Already transformed by Zod schema
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .returning(['id', 'type', 'description', 'date'])
          .executeTakeFirst();

        return result;
      }),

    getByUser: publicProcedure
      .input(z.object({ user_id: z.number() }))
      .query(async ({ input, ctx }) => {
        return ctx.db
          .selectFrom('events')
          .where('user_id', '==', input.user_id)
          .selectAll()
          .execute();
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        ...eventSchema.partial().shape,
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;

        // No need to manually convert boolean to 0/1 as it's handled by Zod schema
        return ctx.db
          .updateTable('events')
          .set({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .where('id', '==', id)
          .returning(['id', 'type', 'description', 'date'])
          .executeTakeFirst();
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return ctx.db
          .deleteFrom('events')
          .where('id', '==', input.id)
          .executeTakeFirst();
      }),
  }),

  // Аналітика
  analytics: router({
    getIncomeByPeriod: publicProcedure
      .input(z.object({
        user_id: z.number(),
        start_date: z.string(),
        end_date: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        return ctx.db
          .selectFrom('incomes')
          .where('user_id', '==', input.user_id)
          .where('date', '>=', input.start_date)
          .where('date', '<=', input.end_date)
          .select([
            'date',
            'amount',
            'currency',
            'exchange_rate',
          ])
          .execute();
      }),

    calculateTaxes: publicProcedure
      .input(z.object({
        user_id: z.number(),
        start_date: z.string(),
        end_date: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        // Отримуємо всі доходи за період
        const incomes = await ctx.db
          .selectFrom('incomes')
          .where('user_id', '==', input.user_id)
          .where('date', '>=', input.start_date)
          .where('date', '<=', input.end_date)
          .select([
            'amount',
            'exchange_rate',
          ])
          .execute();

        // Отримуємо активні налаштування податків для вказаного періоду
        // Визначаємо рік і квартал з дат за допомогою Luxon
        const startDate = DateTime.fromISO(input.start_date);

        // Використовуємо властивість quarter з Luxon для точного визначення кварталу
        const year = startDate.year;
        const quarter = Math.ceil(startDate.month / 3);

        console.log(`Calculating taxes for year: ${year}, quarter: ${quarter}, start_date: ${input.start_date}, end_date: ${input.end_date}`);

        // Отримуємо всі активні податки для користувача
        const allTaxSettings = await ctx.db
          .selectFrom('tax_settings')
          .where('user_id', '==', input.user_id)
          .where('active', '==', 1) // Using 1 instead of true for SQLite compatibility
          .selectAll()
          .execute();

        console.log('All tax settings:', allTaxSettings);

        // Фільтруємо податки за роком і кварталом, якщо ці поля існують
        let taxSettings = allTaxSettings;

        // Перевіряємо, чи є в податках поля year і quarter
        const hasYearQuarter = allTaxSettings.length > 0 && 'year' in allTaxSettings[0] && 'quarter' in allTaxSettings[0];

        if (hasYearQuarter) {
          console.log('Filtering tax settings by year and quarter');
          taxSettings = allTaxSettings.filter(tax => tax.year === year && tax.quarter === quarter);
          console.log('Filtered tax settings:', taxSettings);
        }

        // Розрахунок загального доходу
        const totalIncome = incomes.reduce((sum, income) => {
          return sum + income.amount * income.exchange_rate;
        }, 0);

        // Розрахунок податків
        const taxes = taxSettings.map(tax => {
          let taxAmount = 0;

          if (tax.type === 'fixed') {
            taxAmount = tax.value;
          } else if (tax.type === 'percentage') {
            taxAmount = totalIncome * (tax.value / 100);
          }

          return {
            name: tax.name,
            amount: taxAmount,
          };
        });

        return {
          totalIncome,
          taxes,
          totalTax: taxes.reduce((sum, tax) => sum + tax.amount, 0),
        };
      }),
  }),
});

// Експорт типу роутера
export type AppRouter = typeof appRouter;

// Функція для створення tRPC сервера
export function createTRPCServer(ipcMain: IpcMain) {
  // Обробка tRPC запитів через IPC
  ipcMain.handle('trpc', async (event, { path, type, input }) => {
    console.log(`tRPC server request: ${path}, type: ${type}`, input);

    try {
      const ctx = createContext();

      // Створення caller для виклику процедур
      const caller = appRouter.createCaller(ctx);

      try {
        // Розбір шляху до процедури
        const pathParts = path.split('.');
        let procedure: any = caller;

        for (const part of pathParts) {
          procedure = procedure[part];
          if (!procedure) {
            throw new Error(`Procedure ${path} not found at part ${part}`);
          }
        }

        // Виклик процедури з вхідними даними
        console.log(`Calling procedure ${path} with input:`, input);
        const result = await procedure(input);
        console.log(`Procedure ${path} result:`, result);
        return { result };
      } catch (error) {
        console.error(`tRPC procedure error (${path}):`, error);
        return { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    } catch (error) {
      console.error(`tRPC server error (${path}):`, error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
