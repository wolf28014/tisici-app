import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静态导出，供 Capacitor 打包到 Android WebView
  output: "export",
  // Android WebView 中静态资源需用相对路径
  assetPrefix: "./",
  images: {
    unoptimized: true,
  },
  // 静态导出不支持 ISR / dynamic route 服务端逻辑
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
