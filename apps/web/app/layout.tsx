import type { Metadata } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Acceso",
  description: "Invitá a tu lote y controlá quién entra al barrio",
};

const THEME_BOOT = `(function(){try{var t=localStorage.getItem("acceso-theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);}else if(window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.setAttribute("data-theme","dark");}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={sans.variable} suppressHydrationWarning>
      <body>
        <Script id="acceso-theme" strategy="beforeInteractive">
          {THEME_BOOT}
        </Script>
        {children}
      </body>
    </html>
  );
}
