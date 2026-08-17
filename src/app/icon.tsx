import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 14,
          background: "#27425d",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#f5f0e8",
          fontWeight: 700,
          letterSpacing: -0.5,
        }}
      >
        L
      </div>
    ),
    { ...size },
  );
}
