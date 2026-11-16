/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public URL of the optional tutor gateway. A URL, never a secret. Unset means the local guide only. */
  readonly VITE_TUTOR_URL?: string
  /** `remote` calls the same-origin /api/hint function; anything else uses the local guide. Set by vite.config.ts. Never a secret. */
  readonly VITE_TUTOR_MODE?: string
}
