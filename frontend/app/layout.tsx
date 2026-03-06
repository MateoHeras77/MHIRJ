import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AiCopilot } from "@/components/AiCopilot";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MHIRJ Route Intelligence",
  description: "CRJ market opportunity dashboard for Toronto Pearson (YYZ)",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-slate-50 print:bg-white`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-auto print:overflow-visible print:bg-white">
            {children}
          </main>
        </div>
        <AiCopilot />
      </body>
    </html>
  );
}
