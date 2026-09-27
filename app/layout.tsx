import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Canvas and WebGL Practice",
  description: "Practice drawing, first-person views, and a 3D table model.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
