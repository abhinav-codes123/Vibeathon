import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      "https://flowdine-ai.abhinavchaudhary484.chatgpt.site",
  ),
  title: {
    default: "FlowDine AI · Saffron Circuit",
    template: "%s · FlowDine AI",
  },
  description:
    "A live restaurant digital twin connecting guests, kitchen, service, inventory, and operational intelligence.",
  applicationName: "FlowDine AI",
  keywords: ["restaurant operations", "kitchen display", "live inventory", "hospitality analytics"],
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "FlowDine AI · Every table, ticket, and ingredient in one flow",
    description: "The intelligent operating system behind Saffron Circuit.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "FlowDine AI live restaurant digital twin",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FlowDine AI · Every table. Every ticket. In one flow.",
    description: "The intelligent operating system behind Saffron Circuit.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#18251f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
