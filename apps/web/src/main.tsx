import '@fontsource-variable/inter-tight';
import '@frame/core/styles.css';
import './app/global.css';
import { ThemeProvider } from '@frame/themes';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.tsx';
import { appTheme, applyDomainTokens } from './app/theme.ts';

applyDomainTokens();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={appTheme}>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
