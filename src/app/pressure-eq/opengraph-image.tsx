import { ImageResponse } from "next/og";

// Note: using Georgia/serif fallback. Zodiak (the brand serif) is not loaded into
// the edge ImageResponse runtime; loading would require fetching the woff2 as
// ArrayBuffer at request time. Skipped for risk vs. visual gain on a short wordmark.

export const runtime = "edge";
export const alt = "Pressure EQ. 4 minutes. Where pressure lands hardest.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#0B0B0E",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Warm glow behind the mark */}
        <div
          style={{
            position: "absolute",
            top: 180,
            left: 480,
            width: 240,
            height: 240,
            borderRadius: 999,
            background: "rgba(194,122,92,0.15)",
            filter: "blur(72px)",
          }}
        />

        {/* Brand chevron — matches public/icon.svg path */}
        <div style={{ display: "flex", marginBottom: 32 }}>
          <svg width={132} height={134} viewBox="188 123 649 658">
            <path
              d="M837 550.273L513.204 123L188 550.273V781L513.204 460.545L837 781V550.273Z"
              fill="#C27A5C"
            />
          </svg>
        </div>

        {/* Wordmark */}
        <div
          style={{
            color: "rgba(244,244,245,0.92)",
            fontSize: 80,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            marginBottom: 20,
            fontFamily: "Georgia, serif",
          }}
        >
          Pressure EQ
        </div>

        {/* Tagline */}
        <div
          style={{
            color: "rgba(161,161,170,0.65)",
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: "-0.01em",
            lineHeight: 1.4,
          }}
        >
          4 minutes. Where pressure lands hardest.
        </div>
      </div>
    ),
    { ...size },
  );
}
