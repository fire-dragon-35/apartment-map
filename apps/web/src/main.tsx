import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { cssVariables } from '@lk/shared';
import App from './App.tsx';
import './styles.css';

// DESIGN.md §3: the tokens come from one place (shared) and reach the style sheet as CSS variables
for (const [name, value] of Object.entries(cssVariables())) document.documentElement.style.setProperty(name, value);

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
