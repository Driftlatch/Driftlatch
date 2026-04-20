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
  metadataBase: new URL("https://driftlatch.com"),

  title: {
    default: "Driftlatch — Closeness at home. Clarity at work.",
    template: "%s | Driftlatch",
  },

  description:
    "A privacy-first system for founders and high-drive professionals. Manage pressure so work does not follow you home and home tension does not take your focus at work.",

  keywords: [
    "founder mental health",
    "work life balance founders",
    "emotional intelligence",
    "pressure management",
    "founder wellbeing",
    "focus tool",
    "presence tool",
    "work stress",
    "relationship stress",
    "founder burnout",
  ],

  authors: [{ name: "Driftlatch" }],
  creator: "Driftlatch",
  publisher: "Driftlatch",

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://driftlatch.com",
    siteName: "Driftlatch",
    title: "Driftlatch — Closeness at home. Clarity at work.",
    description:
      "A privacy-first system for founders. Manage pressure so work does not follow you home.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Driftlatch — Closeness at home. Clarity at work.",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Driftlatch — Closeness at home. Clarity at work.",
    description:
      "A privacy-first system for founders. Manage pressure so work does not follow you home.",
    images: ["/og-image.png"],
    creator: "@driftlatch",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  icons: {
    icon: [
      { url: "/icon.png", sizes: "any" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },

  manifest: "/manifest.json",

  alternates: {
    canonical: "https://driftlatch.com",
  },

  appleWebApp: {
    capable: true,
    title: "Driftlatch",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0E",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Driftlatch",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  description:
    "A privacy-first system for founders and high-drive professionals to manage pressure so work does not follow you home.",
  url: "https://driftlatch.com",
  offers: {
    "@type": "Offer",
    price: "59",
    priceCurrency: "USD",
    priceValidUntil: "2027-12-31",
  },
  creator: {
    "@type": "Organization",
    name: "Driftlatch",
    url: "https://driftlatch.com",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${zodiak.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
