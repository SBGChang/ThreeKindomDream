import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// PORT 優先於預設值 —— 同時開兩個 session 時 5173 會被占住。
const port = Number(process.env['PORT'] ?? 5173);

export default defineConfig({
  plugins: [react()],
  server: { port },
});
