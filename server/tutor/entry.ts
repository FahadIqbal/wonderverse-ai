import { createHintHandler } from './handler'

/**
 * Vercel entry point (Node.js runtime, Web Standard `fetch` export). Bundled to `api/hint.js` by
 * `npm run build:api`, because functions under `api/` run unbundled and extensionless imports do not resolve there.
 * The handler is created once per instance, so the in-memory rate limiter lives as long as the instance does.
 */
const handler = createHintHandler({ env: process.env })

export default {
  fetch: (request: Request): Promise<Response> => handler(request),
}
