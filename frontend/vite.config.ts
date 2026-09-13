import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://biogas-digital-twin-1.onrender.com',
        changeOrigin: true,
      },
      '/ws': {
        target: 'https://biogas-digital-twin-1.onrender.com',
        ws: true,
      },
    },
  },
})
