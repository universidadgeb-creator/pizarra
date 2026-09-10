import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANTE: cambia "pizarra1pct" por el nombre exacto de tu repositorio
// de GitHub (ej. si tu repo es github.com/tu-usuario/mi-repo, pon "/mi-repo/").
// Si vas a publicar en la raíz de un sitio tipo "tu-usuario.github.io"
// (repo llamado exactamente así), usa base: "/" en su lugar.
export default defineConfig({
  plugins: [react()],
  base: "/pizarra/",
});
