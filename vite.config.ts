import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const PUBLIC_FILES = ["manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

/** Gera dist/sw.js com a lista de arquivos do build e uma versão que muda quando qualquer um deles muda. */
function serviceWorker(): Plugin {
  return {
    name: "viagem-service-worker",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle).sort();
      const publics = PUBLIC_FILES.filter((f) => existsSync(`public/${f}`));
      const hash = createHash("sha1");
      built.forEach((f) => hash.update(f));
      publics.forEach((f) => hash.update(readFileSync(`public/${f}`)));
      const precache = ["./", ...built, ...publics];
      const source = readFileSync("src/sw.template.js", "utf8")
        .replace('"__VERSION__"', JSON.stringify(hash.digest("hex").slice(0, 10)))
        .replace("const PRECACHE = __PRECACHE__;", `const PRECACHE = ${JSON.stringify(precache)};`);
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

// base "./": os caminhos funcionam em qualquer endereço, inclusive em subpasta (GitHub Pages).
export default defineConfig({
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  plugins: [react(), serviceWorker()],
});
