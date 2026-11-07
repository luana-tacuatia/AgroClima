import type { MetadataRoute } from "next";

/**
 * Web App Manifest (Fase 7 — PWA). Permite instalar o AgroClima na tela inicial do celular.
 * O Next.js serve este arquivo em /manifest.webmanifest e inclui o <link rel="manifest"> no <head>.
 * Ainda não há service worker: o app instalado precisa de internet para consultar as previsões.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AgroClima — previsões comparadas",
    short_name: "AgroClima",
    description:
      "Compare previsões do tempo de fontes públicas e veja se elas concordam antes de planejar o trabalho no campo.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#059669",
    categories: ["weather", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
