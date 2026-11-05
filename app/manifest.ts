import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KAI Wellness Retreats",
    short_name: "KAI",
    description:
      "Nurse-led luxury wellness sanctuaries bridging clinical autonomic science, somatic movement, and crystal singing bowl sound healing.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "en",
    categories: ["travel", "health", "lifestyle"],
    background_color: "#FAF7F2",
    theme_color: "#2D3E35",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "My Retreat Hub",
        short_name: "Companion",
        description: "Access your somatic schedule, flight details, and sanctuary companion",
        url: "/my-retreat",
        icons: [{ src: "/icon.png", sizes: "192x192" }],
      },
      {
        name: "Explore Sanctuaries",
        short_name: "Sanctuaries",
        description: "View upcoming luxury wellness retreats",
        url: "/retreats",
        icons: [{ src: "/icon.png", sizes: "192x192" }],
      },
    ],
  };
}
