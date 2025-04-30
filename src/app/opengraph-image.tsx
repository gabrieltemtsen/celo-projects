import { ImageResponse } from "next/og";

// Dynamic title from environment variable or fallback
export const alt = "Celo Projects";

// Image dimensions
export const size = {
  width: 600,
  height: 400,
};

// Content type
export const contentType = "image/png";

// OG image generation
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #FBCC5C 0%, #35D07F 100%)",
          position: "relative",
        }}
      >
        {/* Overlay for text contrast */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.25)",
          }}
        />
        {/* Title */}
        <h1
          style={{
            fontSize: "50px",
            fontWeight: "bold",
            color: "#FFFFFF",
            textAlign: "center",
            padding: "0 20px",
            textShadow: "2px 2px 6px rgba(0,0,0,0.6)",
            zIndex: 10,
          }}
        >
          {alt}
        </h1>
        {/* Tagline */}
        <p
          style={{
            fontSize: "26px",
            color: "#FFFFFF",
            textAlign: "center",
            marginTop: "20px",
            padding: "0 20px",
            textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
            zIndex: 10,
          }}
        >
          Swipe to Support
        </p>
      </div>
    ),
    {
      ...size,
    },
  );
}
