import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Service fees admin",
  description: "Backoffice for editing serviceFee.json — every change is a tracked PR.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
