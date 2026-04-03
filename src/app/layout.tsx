import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "../utils/localStorage-mock"; // Mock localStorage for SSR

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LeRobot Dataset Visualizer",
  description: "Visualization of LeRobot Datasets",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
