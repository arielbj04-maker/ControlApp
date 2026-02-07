import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANTE: Reemplaza 'NOMBRE_EXACTO_DE_TU_REPO' con el nombre de tu repositorio en GitHub.
  // Ejemplo: Si tu repo es https://github.com/usuario/mi-app, pon base: '/mi-app/'
  base: '/NOMBRE_EXACTO_DE_TU_REPO/',
})