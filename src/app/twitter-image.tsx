import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Driftlatch. Closeness at home. Clarity at work.";
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

        {/* Chevron mark — two rectangles meeting at centre-top */}
        <div
          style={{
            position: "relative",
            width: 120,
            height: 80,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          {/* Left arm */}
          <div
            style={{
              position: "absolute",
              width: 14,
              height: 72,
              background: "#C27A5C",
              borderRadius: 6,
              transform: "rotate(-45deg)",
              transformOrigin: "top center",
              top: 0,
              left: 28,
            }}
          />
          {/* Right arm */}
          <div
            style={{
              position: "absolute",
              width: 14,
              height: 72,
              background: "#C27A5C",
              borderRadius: 6,
              transform: "rotate(45deg)",
              transformOrigin: "top center",
              top: 0,
              right: 28,
            }}
          />
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
          Driftlatch
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
          Closeness at home. Clarity at work.
        </div>
      </div>
    ),
    { ...size },
  );
}
