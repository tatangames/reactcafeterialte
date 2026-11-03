import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Cada modo con su propia caché de dependencias: si dos servidores de
  // desarrollo (normal y "pruebas") comparten la carpeta, uno puede regenerarla
  // mientras el otro la sirve y React queda duplicado ("Invalid hook call").
  cacheDir: mode === "pruebas" ? "node_modules/.vite-pruebas" : "node_modules/.vite",
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        // This will transform your SVG to a React component
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
}));
