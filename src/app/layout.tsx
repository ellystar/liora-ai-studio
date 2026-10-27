import type { Metadata } from "next";
import { Newsreader, Spline_Sans_Mono } from "next/font/google";
import { AtelierProvider } from "@/lib/store";
import { DemoBar } from "@/components/DemoBar";
import { GuestGate } from "@/components/GuestGate";
import "./globals.css";

const display = Newsreader({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const mono = Spline_Sans_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Liora Atelier",
  description: "Liora Atelier — front-end prototype",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${display.variable} ${mono.variable}`}
    >
      <body>
        <AtelierProvider>
          <GuestGate />
          {children}
          <DemoBar />
        </AtelierProvider>
      </body>
    </html>
  );
}
