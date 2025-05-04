import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient } from './utils/trpc';
import App from './App';
import './styles/index.css';

// Створення клієнта для React Query
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </trpc.Provider>
    </QueryClientProvider>
  </React.StrictMode>
);
