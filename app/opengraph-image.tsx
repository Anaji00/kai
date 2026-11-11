import { ImageResponse } from "next/og";

export const alt = "KAI Wellness Retreats — Nurse-Led Quiet Luxury Sanctuaries";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1A2621 0%, #2D3E35 60%, #3D5246 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          color: "#FAF7F2",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#C07D63",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: "bold",
                color: "#FFFFFF",
              }}
            >
              K
            </div>
            <span
              style={{
                fontSize: "22px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#E5DDD0",
                fontWeight: 600,
              }}
            >
              KAI Wellness Retreats
            </span>
          </div>
          <span
            style={{
              padding: "8px 20px",
              borderRadius: "9999px",
              background: "rgba(250, 247, 242, 0.12)",
              border: "1px solid rgba(250, 247, 242, 0.25)",
              fontSize: "14px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#E5DDD0",
            }}
          >
            2026–2027 Sanctuaries
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <h1
            style={{
              fontSize: "60px",
              fontWeight: 400,
              lineHeight: 1.15,
              color: "#FAF7F2",
              margin: 0,
            }}
          >
            Where Clinical Science Meets Somatic Restoration
          </h1>
          <p
            style={{
              fontSize: "22px",
              color: "#D1C7B7",
              lineHeight: 1.5,
              maxWidth: "920px",
              margin: 0,
            }}
          >
            Thoughtfully curated luxury retreats created by Kareena & Armaan Islam • Puerto Vallarta • Riviera Maya
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(229, 221, 208, 0.25)",
            paddingTop: "24px",
          }}
        >
          <span style={{ fontSize: "16px", color: "#A89F91", letterSpacing: "0.05em" }}>
            Strictly 12–14 Guests • Yoga • Crystal Sound Baths
          </span>
          <span style={{ fontSize: "16px", color: "#C07D63", fontWeight: 600 }}>
            kaiwellnessretreats.com
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

