import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy — Driftlatch",
  description: "14-day refund policy. No questions asked.",
};

export default function RefundsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
