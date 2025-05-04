import { createTRPCReact } from '@trpc/react-query';
import { createTRPCProxyClient, httpBatchLink, TRPCLink, TRPCClientError } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import type { AnyRouter, inferRouterError } from '@trpc/server';
import type { AppRouter } from '../../electron/trpc';

// Створення клієнта tRPC для React
export const trpc = createTRPCReact<AppRouter>();

// Функція для виклику tRPC через Electron IPC
function createIPCLink<TRouter extends AnyRouter>(): TRPCLink<TRouter> {
  return () => {
    return ({ op }) => {
      return observable((observer) => {
        const { path, input, type } = op;

        console.log(`tRPC client request: ${path}, type: ${type}`, input);

        // Використовуємо Electron IPC для комунікації з основним процесом
        window.electron.ipcRenderer.invoke('trpc', {
          path,
          type,
          input,
        }).then((result) => {
          console.log(`tRPC client response: ${path}`, result);

          if (result && result.error) {
            observer.error(TRPCClientError.from(result.error));
          } else {
            observer.next({
              result: {
                type: 'data',
                data: result.result ?? null,
              },
            });
            observer.complete();
          }
        }).catch((error) => {
          console.error(`tRPC client error: ${path}`, error);
          observer.error(TRPCClientError.from(error));
        });

        // Повернення функції для скасування підписки
        return () => {
          // Нічого не робимо при скасуванні
        };
      });
    };
  };
}

// Створюємо лінк для IPC
const ipcLink = createIPCLink<AppRouter>();

// Створення клієнта tRPC
export const trpcClient = trpc.createClient({
  links: [
    ipcLink, // без виклику ()
  ],
});
