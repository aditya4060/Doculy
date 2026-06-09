import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Doculy",
  description: "Ask grounded questions about uploaded PDFs and text files."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
