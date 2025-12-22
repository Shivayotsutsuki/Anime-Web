import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        open: true
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'icons': ['@fortawesome/fontawesome-svg-core', '@fortawesome/free-solid-svg-icons', '@fortawesome/free-brands-svg-icons', '@fortawesome/react-fontawesome']
                }
            }
        }
    }
})
