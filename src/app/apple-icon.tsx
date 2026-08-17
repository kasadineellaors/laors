import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 42,
          background: "#27425d",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#f5f0e8",
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        LAORS
      </div>
    ),
    { ...size },
  );
}
