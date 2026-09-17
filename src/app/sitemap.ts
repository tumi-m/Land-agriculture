import type { MetadataRoute } from "next";

/** The explorer, the guide and the receipt verifier. Farm pages join when
 *  P4.11 lands. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.VERCEL_PROJECT_PRODUCTION_URL != null
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : (process.env.VERCEL_URL ?? "http://localhost:3000");
  return [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/guide`, lastModified: new Date() },
    { url: `${base}/verify`, lastModified: new Date() },
  ];
}
