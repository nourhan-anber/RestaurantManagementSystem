import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: './src/setupTests.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/setupTests.js', 'src/main.jsx', 'eslint.config.js', 'tailwind.config.js', 'postcss.config.js', 'vite.config.js']
    }
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL,
        changeOrigin: true,
        secure: false,
        rewrite: path => path.replace(/^\/api/, '/api'),
      },
    },
  },
})
