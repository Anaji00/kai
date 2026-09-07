import { MetadataRoute } from "next";
import { RETREATS } from "@/lib/retreats";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://kaiwellnessretreats.com";

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/retreats`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/book`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  // Dynamic retreat routes
  const retreatRoutes: MetadataRoute.Sitemap = RETREATS.map((retreat) => ({
    url: `${baseUrl}/retreats/${retreat.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  return [...staticRoutes, ...retreatRoutes];
}
