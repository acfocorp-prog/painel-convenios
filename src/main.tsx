import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { router } from './router';
import { queryClient } from './lib/query-client';
import './index.css';

// PWA: registera service worker gerado pelo vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors position="top-center" closeButton />
    </QueryClientProvider>
  </StrictMode>,
);
