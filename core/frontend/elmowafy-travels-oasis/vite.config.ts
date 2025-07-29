import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react-native": "react-native-web", // Add this line for web compatibility
    },
  },
  optimizeDeps: {
    exclude: ['react-native-game-engine'],
    esbuild: {
      jsxInject: "import React from 'react';",
      jsx: 'automatic'
    }
  }
}));
