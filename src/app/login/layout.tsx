import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in to Driftlatch",
  description:
    "Log in to your Driftlatch account. Privacy-first focus and presence tool for founders.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
