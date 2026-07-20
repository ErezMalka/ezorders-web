import { ImageResponse } from "next/og";

export const alt = "EZOrders — the all-in-one restaurant ordering & management system";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #3B33C8 0%, #191D2A 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "20px", height: "20px", borderRadius: "9999px", background: "#F05D86" }} />
          <div style={{ fontSize: "34px", color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
            Restaurant ordering & management
          </div>
        </div>

        <div style={{ display: "flex", marginTop: "28px", fontSize: "104px", fontWeight: 800, color: "#ffffff" }}>
          EZ<span style={{ color: "#F05D86" }}>Orders</span>
        </div>

        <div style={{ display: "flex", marginTop: "24px", fontSize: "40px", color: "rgba(255,255,255,0.85)", maxWidth: "900px", lineHeight: 1.3 }}>
          POS, orders, digital menus, loyalty and multi-branch control — one connected system.
        </div>

        <div style={{ display: "flex", marginTop: "56px", gap: "16px" }}>
          {["POS", "Orders", "Digital menu", "Loyalty", "Reports"].map((chip) => (
            <div
              key={chip}
              style={{
                display: "flex",
                padding: "12px 26px",
                borderRadius: "9999px",
                background: "rgba(255,255,255,0.12)",
                color: "#ffffff",
                fontSize: "28px",
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
