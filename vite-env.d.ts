/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_VORKAI_API_URL?: string;
  readonly VITE_AQI_DASHBOARD_URL?: string;
  readonly VITE_AQI_FEED_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
