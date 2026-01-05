import '@/app/styles/index.css';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import * as Sentry from '@sentry/react';
import {
  BrowserRouter,
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router';

import App from './App';

const isProduction = import.meta.env.VITE_MODE === 'production';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '',
  integrations: [
    // React Router v7 페이지 이동 경로 추적
    Sentry.reactRouterV7BrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
    Sentry.replayIntegration(),
    Sentry.browserProfilingIntegration(),
  ],
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Analytics />
      {isProduction && <SpeedInsights />}
    </BrowserRouter>
  </StrictMode>,
);
