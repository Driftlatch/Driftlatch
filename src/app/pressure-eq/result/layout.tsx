import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Pressure EQ Fingerprint — Driftlatch",
  description:
    "Your EQ fingerprint across 6 domains. See where your emotional intelligence drops under pressure and where to start.",
  robots: { index: false, follow: false },
};

export default function ResultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
