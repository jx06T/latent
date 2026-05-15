import type { APIRoute } from 'astro'
import { handlePublishBackground } from '@/lib/publish-background-core'

export const POST: APIRoute = ({ request }) => handlePublishBackground(request)
