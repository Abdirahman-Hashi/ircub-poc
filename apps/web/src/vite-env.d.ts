/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API from the browser's point of view; empty → use the nginx /api proxy. */
  readonly VITE_API_URL?: string;
  /** Public URL of the mocks app for demo links; empty → derived from the API URL. */
  readonly VITE_MOCKS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
