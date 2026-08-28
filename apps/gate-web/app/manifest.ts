import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Acceso",
    short_name: "Acceso",
    description: "Validá el QR en la puerta",
    start_url: "/scan",
    display: "standalone",
    background_color: "#f3efe6",
    theme_color: "#f3efe6",
  };
}
