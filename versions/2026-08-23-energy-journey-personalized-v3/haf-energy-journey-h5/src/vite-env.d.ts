/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HAF_ANALYTICS_ENDPOINT?: string;
  readonly VITE_HAF_READING_ENDPOINT?: string;
  readonly VITE_HAF_GREETING_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
