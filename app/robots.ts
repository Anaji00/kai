import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://kaiwellnessretreats.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/portal",
          "/portal/*",
          "/api/portal",
          "/api/portal/*",
          "/staff-sanctuary-gate",
          "/staff-sanctuary-gate/*",
          "/ops-gate",
          "/ops-gate/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
