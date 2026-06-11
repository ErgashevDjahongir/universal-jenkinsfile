/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Prod'da backend API manzili (dev'da bo'sh — Vite proxy ishlatiladi). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
