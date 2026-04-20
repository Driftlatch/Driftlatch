import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pressure EQ — Driftlatch",
  description:
    "8 real situations. No right answers. See how your emotional intelligence holds up under pressure. Free. Takes 4 minutes.",
  openGraph: {
    title: "Take the Pressure EQ",
    description:
      "See how your EQ performs under your specific pressure pattern. Free. 4 minutes.",
    url: "https://driftlatch.com/pressure-eq",
    images: [{ url: "/og-pressure-eq.png", width: 1200, height: 630 }],
  },
};

export default function PressureEQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
