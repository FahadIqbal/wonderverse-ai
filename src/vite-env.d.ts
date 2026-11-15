/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public URL of the optional tutor gateway. A URL, never a secret. Unset means the local guide only. */
  readonly VITE_TUTOR_URL?: string
}
