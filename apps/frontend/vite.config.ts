import { defineConfig, loadEnv } from 'vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import svgr from 'vite-plugin-svgr';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      svgr({ include: '**/*.svg?react' }),
      sentryVitePlugin({
        org: env.ORG_NAME,
        project: env.PROJECT_NAME,
        authToken: env.SENTRY_AUTH_TOKEN,
      }),
    ],
    build: {
      sourcemap: true,
    },
    worker: {
      format: 'iife',
    },
    base: '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
