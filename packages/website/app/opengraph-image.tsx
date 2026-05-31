import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const FONT_DIR = join(process.cwd(), "lib", "fonts");
const geistRegular = readFileSync(join(FONT_DIR, "Geist-400.woff"));
const geistSemibold = readFileSync(join(FONT_DIR, "Geist-600.woff"));

export const alt = "Move Doctor: a deterministic linter for Sui Move";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const RADIUS = 120;
const CIRC = 2 * Math.PI * RADIUS;
const SCORE = 87;

const SEVERITIES = [
  { label: "0 errors", color: "#f87171" },
  { label: "3 warnings", color: "#fbbf24" },
  { label: "9 info", color: "#8b949e" },
];

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: 72,
        backgroundColor: "#08090c",
        backgroundImage:
          "radial-gradient(1100px 540px at 22% -20%, rgba(41,141,255,0.22), rgba(8,9,12,0))",
        color: "#ffffff",
        fontFamily: "Geist",
      }}
    >
      {/* logo */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 60,
            height: 60,
            borderRadius: 15,
            backgroundImage: "linear-gradient(135deg, #4aa0ff, #1366d6)",
          }}
        >
          <svg fill="none" height="38" viewBox="0 0 32 32" width="38">
            <title>Move Doctor</title>
            <circle cx="16" cy="16" r="8" stroke="white" strokeWidth="2.4" />
            <path
              d="M16 3.5V7"
              stroke="white"
              strokeLinecap="round"
              strokeWidth="2.4"
            />
            <path
              d="M16 25V28.5"
              stroke="white"
              strokeLinecap="round"
              strokeWidth="2.4"
            />
            <path
              d="M3.5 16H7"
              stroke="white"
              strokeLinecap="round"
              strokeWidth="2.4"
            />
            <path
              d="M25 16H28.5"
              stroke="white"
              strokeLinecap="round"
              strokeWidth="2.4"
            />
          </svg>
        </div>
        <div style={{ marginLeft: 18, fontSize: 34, fontWeight: 600 }}>
          Move Doctor
        </div>
      </div>

      {/* body */}
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 20,
        }}
      >
        {/* left */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            paddingRight: 56,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 60,
              fontWeight: 600,
              letterSpacing: -2.5,
              lineHeight: 1.06,
            }}
          >
            <div style={{ display: "flex" }}>A deterministic linter</div>
            <div style={{ display: "flex" }}>
              <span>{"for "}</span>
              <span style={{ color: "#4a9eff" }}>Sui Move</span>
              <span>.</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 30,
              fontSize: 28,
              color: "#9aa1ad",
              lineHeight: 1.4,
              maxWidth: 600,
            }}
          >
            Catches the mistakes the compiler misses. Scored, cited, and built
            for coding agents.
          </div>
        </div>

        {/* right: score ring */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              position: "relative",
              width: 280,
              height: 280,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg height="280" viewBox="0 0 280 280" width="280">
              <title>Health score</title>
              <defs>
                <linearGradient id="ring" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#298dff" />
                  <stop offset="100%" stopColor="#7dd3fc" />
                </linearGradient>
              </defs>
              <circle
                cx="140"
                cy="140"
                fill="none"
                r={RADIUS}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="16"
              />
              <circle
                cx="140"
                cy="140"
                fill="none"
                r={RADIUS}
                stroke="url(#ring)"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - SCORE / 100)}
                strokeLinecap="round"
                strokeWidth="16"
                transform="rotate(-90 140 140)"
              />
            </svg>
            <div
              style={{
                position: "absolute",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 96,
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                {SCORE}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 26,
                  color: "#9aa1ad",
                  marginTop: 6,
                }}
              >
                / 100
              </div>
            </div>
          </div>

          <div style={{ display: "flex", marginTop: 26 }}>
            {SEVERITIES.map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginLeft: 22,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: s.color,
                    marginRight: 8,
                  }}
                />
                <div
                  style={{ display: "flex", fontSize: 22, color: "#9aa1ad" }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Geist", data: geistRegular, weight: 400, style: "normal" },
        { name: "Geist", data: geistSemibold, weight: 600, style: "normal" },
      ],
    }
  );
}
