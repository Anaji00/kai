import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://kaiwellnessretreats.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/retreats",
          "/retreats/*",
          "/about",
          "/book",
          "/testimonials",
          "/manifest.webmanifest",
          "/*.png",
          "/*.jpg",
          "/*.jpeg",
          "/*.webp",
          "/*.svg",
          "/*.ico",
        ],
        disallow: [
          "/api/",
          "/api/*",
          "/my-retreat",
          "/my-retreat/*",
          "/offline",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
