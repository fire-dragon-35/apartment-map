import '@frame/core/styles.css';
import './app/global.css';
import { ThemeProvider } from '@frame/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.tsx';
import { appTheme, applyDomainTokens } from './app/theme.ts';

applyDomainTokens();

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={appTheme}>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
