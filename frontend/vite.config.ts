import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev: leave VITE_API_URL unset and use the proxy so requests go to the API without CORS friction.
// Production: set VITE_API_URL to your API origin (e.g. https://api.example.com) and configure CORS on the server.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:3000", changeOrigin: true },
      "/public": { target: "http://127.0.0.1:3000", changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "react";
          if (id.includes("node_modules/react-router")) return "router";
          if (id.includes("node_modules/@tanstack")) return "query";
          if (id.includes("node_modules/framer-motion")) return "motion";
        },
      },
    },
  },
});
