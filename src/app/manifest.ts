import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AgendaCR | Tu agenda, en orden",
    short_name: "AgendaCR",
    description: "Organiza las citas de tu negocio y mantén tu agenda al día.",
    start_url: "/inicio",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8f5",
    theme_color: "#1e5949",
    lang: "es-CR",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
