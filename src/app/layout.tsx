import type { Metadata, Viewport } from "next";
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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Driftlatch",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${zodiak.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}
