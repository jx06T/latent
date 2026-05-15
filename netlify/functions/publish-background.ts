import type { Config } from '@netlify/functions'
import { handlePublishBackground } from '../../src/lib/publish-background-core.js'

export default handlePublishBackground

export const config: Config = { path: '/functions/publish-background' }
