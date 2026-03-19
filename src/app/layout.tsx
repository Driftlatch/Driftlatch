import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const inter = localFont({
  src: "../../public/fonts/Inter-VariableFont_opsz,wght.ttf",
  display: "swap",
  variable: "--font-sans",
});

const zodiak = localFont({
  src: "../../public/fonts/Zodiak-Variable.woff2",
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Driftlatch",
  description: "Closeness at home. Clarity at work.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${zodiak.variable}`}>
      <body>{children}</body>
    </html>
  );
}
