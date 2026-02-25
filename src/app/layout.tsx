import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Driftlatch",
  description: "Closeness at home. Clarity at work.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}