import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Driftlatch",
  description:
    "Driftlatch annual plan at $59 per year or $9.99 per month. Full access. Privacy-first. 14-day refund.",
  openGraph: {
    title: "Driftlatch Pricing",
    description: "$59 per year. Full access. Cancel anytime.",
    url: "https://driftlatch.com/pricing",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
