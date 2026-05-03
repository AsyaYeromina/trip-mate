import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trip Mate",
  description: "Trip preparation with destination facts, weather, and packing guidance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
