import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AntdProvider } from "@/components/providers/AntdProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Hardship Allocation", template: "%s · Hardship Allocation" },
  description:
    "Staff dashboard for ranking hardship applications under a fixed budget, human review and fairness auditing.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AntdProvider>{children}</AntdProvider>
      </body>
    </html>
  );
}
