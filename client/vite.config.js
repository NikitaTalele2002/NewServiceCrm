import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    fs: {
      strict: false,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
    middlewareMode: false,
    hmr: {
      host: 'localhost',
      port: 5173,
    },
  },
  optimizeDeps: {
    exclude: [
      "sequelize",
      "pg",
      "pg-hstore",
      "wkx",
      "tedious",
      "mssql"
    ],
    include: [
      "react",
      "react-dom",
      "react-router-dom"
    ],
  },
  build: {
    rollupOptions: {
      external: [
        "sequelize",
        "pg",
        "pg-hstore",
        "wkx",
        "tedious",
        "mssql",
        "express"
      ],
    },
    chunkSizeWarningLimit: 1000,
  },
});