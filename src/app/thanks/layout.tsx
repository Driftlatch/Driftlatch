import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thank you — Driftlatch",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function ThanksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
