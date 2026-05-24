import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    allowedHosts: ["suzanna-unhusbanded-gala.ngrok-free.dev"],
    port: 5173,
    watch: {
      usePolling: true,
    }
  }
})
