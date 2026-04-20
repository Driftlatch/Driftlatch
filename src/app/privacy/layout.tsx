import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Driftlatch",
  description:
    "Driftlatch privacy policy. No message reading. No behavior tracking. Only what you choose to enter.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
