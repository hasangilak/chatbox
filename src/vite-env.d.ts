/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_YAP_BASE_URL?: string;
  readonly VITE_YAP_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
