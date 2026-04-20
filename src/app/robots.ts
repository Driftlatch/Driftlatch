import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app/", "/api/", "/login", "/buy", "/thanks"],
      },
    ],
    sitemap: "https://driftlatch.com/sitemap.xml",
  };
}
