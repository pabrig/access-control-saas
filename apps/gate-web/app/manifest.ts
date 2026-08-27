import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Access Gate",
    short_name: "Barrera",
    description: "Escaneo de invitaciones QR en barrera",
    start_url: "/scan",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
  };
}
