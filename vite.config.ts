import type { UserConfig } from "vite"
import { fileURLToPath } from "url"
import { dirname } from "path"
import { MODULE } from "./src/scripts/constants"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const s_PACKAGE_ID = `modules/${MODULE.id}`

const config: UserConfig = {
  publicDir: "public",
  root: "src/",
  base: `/${s_PACKAGE_ID}/`, // Base module path that 30001 / served dev directory.
  logLevel: "info",
  server: {
    port: 30001,
    open: true,
    proxy: {
      // Serves static files from main Foundry server.
      [`^(/${s_PACKAGE_ID}/(assets|lang|packs|style.css))`]:
        "http://localhost:30000",

      // All other paths besides package ID path are served from main Foundry server.
      [`^(?!/${s_PACKAGE_ID}/)`]: "http://localhost:30000",

      // Enable socket.io from main Foundry server.
      "/socket.io": { target: "ws://localhost:30000", ws: true },
    },
  },
  build: {
    outDir: __dirname,
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      name: MODULE.id,
      entry: "./index.js",
      formats: ["es"],
      fileName: "index",
    },
  },
}

export default config
