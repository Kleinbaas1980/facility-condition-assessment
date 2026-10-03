import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
export const metadata: Metadata = {
  title: "Facility Condition Assessment | Field Capture",
  description: "Facility condition assessment by functional area, element and component.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
