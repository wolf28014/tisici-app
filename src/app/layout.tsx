import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { PageBackgroundApplier } from "@/components/page-background-applier";

export const metadata: Metadata = {
  title: "提示词库 · PromptHub",
  description: "管理、分类、复用你的 AI 提示词，让创意触手可及。",
  keywords: ["提示词", "Prompt", "AI", "提示词库", "Prompt Library"],
  authors: [{ name: "PromptHub" }],
  icons: {
    icon: "/logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#7c3aed",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <PageBackgroundApplier />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
