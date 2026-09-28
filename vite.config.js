import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// Site multi-página: "/" é a retrospectiva (home atual, pós-evento),
// "/convite.html" é o convite original, mantido acessível por link direto.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        convite: fileURLToPath(new URL("./convite.html", import.meta.url)),
      },
    },
  },
});
