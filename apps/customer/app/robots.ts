import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  const baseUrl = envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')
    ? (envUrl.startsWith('http') ? envUrl : `https://${envUrl}`)
    : 'https://laundelle.co.uk';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
