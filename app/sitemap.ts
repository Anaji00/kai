import { MetadataRoute } from "next";
import { RETREATS } from "@/lib/retreats";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://kaiwellnessretreats.com";

  // Static core brand routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
      images: [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    {
      url: `${baseUrl}/retreats`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.95,
      images: [
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/book`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/testimonials`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
  ];

  // Dynamic individual retreat sanctuary routes with rich image links
  const retreatRoutes: MetadataRoute.Sitemap = RETREATS.map((retreat) => ({
    url: `${baseUrl}/retreats/${retreat.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.9,
    images: [retreat.heroImage],
  }));

  return [...staticRoutes, ...retreatRoutes];
}
