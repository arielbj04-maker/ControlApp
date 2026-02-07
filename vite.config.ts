import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Usamos ruta relativa './' para que funcione automáticamente
  // sin importar el nombre de tu repositorio.
  base: './',
})