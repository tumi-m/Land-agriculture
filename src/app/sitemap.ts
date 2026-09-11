import type { MetadataRoute } from "next";

/** The explorer and the guide. Farm pages join when P4.11 lands. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.VERCEL_PROJECT_PRODUCTION_URL != null
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : (process.env.VERCEL_URL ?? "http://localhost:3000");
  return [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/guide`, lastModified: new Date() },
  ];
}
