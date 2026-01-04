/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ORG_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

