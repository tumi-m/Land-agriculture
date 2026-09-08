import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, IBM_Plex_Mono, Inter } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const display = Cormorant_Garamond({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Asbonge Land Locator",
  description:
    "Explore South African state agricultural land in 3D. Compare historical provincial figures, understand farming systems, and plan your application and funding route.",
  applicationName: "Asbonge Land Locator",
  keywords: [
    "agricultural land",
    "South Africa",
    "land redistribution",
    "state land lease",
    "poultry farming",
    "emerging farmers",
  ],
  openGraph: {
    title: "Asbonge Land Locator",
    description:
      "State agricultural land released for farming in South Africa, province by province.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1b17" },
  ],
};

/** Applies the stored or system theme before first paint so the page never flashes. */
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('all-theme');var d=s?s==='dark':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en-ZA"
      className={`${sans.variable} ${mono.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <a
          href="#map"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:font-mono focus:text-2xs focus:uppercase focus:tracking-widest focus:text-paper"
        >
          Skip to map
        </a>
        {children}
      </body>
    </html>
  );
}
