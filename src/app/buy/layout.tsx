import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Driftlatch Access",
  description:
    "Start your Driftlatch membership. Annual plan at $59 per year. 14-day refund guarantee.",
  robots: { index: false, follow: false },
};

export default function BuyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
