import { type MetadataRoute } from 'next'
import { routeGroups, routeTypes } from '@/routes'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: [...routeGroups.landing],
      disallow: [...routeTypes.authed],
    },
    sitemap: 'https://supermemory.ai/sitemap.xml',
  }
}