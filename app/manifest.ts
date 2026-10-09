import type { MetadataRoute } from "next";

// Web app manifest: makes the Control Center installable on phones and desktops (PWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Media Creative Control Center",
    short_name: "Media Creative",
    description: "Modem rentals, invoices and clients for Media Creative.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0e15",
    theme_color: "#0a0e15",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "New Invoice", url: "/invoices/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Modem WiFi", url: "/rentals", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Invoices", url: "/invoices", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
