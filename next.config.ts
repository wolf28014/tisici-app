import type { NextConfig } from "next";

// GitHub Pages 部署需要 basePath（仓库子路径）
// 安卓 APK 不需要 basePath
// 通过环境变量 BUILD_TARGET 区分：
//   - 'web' 或 'pages'：部署到 GitHub Pages，需要 basePath
//   - 其他/未设置：APK / 本地预览，无需 basePath
const repoName = process.env.GITHUB_REPOSITORY?.split('/')?.[1] || 'tisici-app'
const isPagesBuild = process.env.BUILD_TARGET === 'web' || process.env.BUILD_TARGET === 'pages'
const basePath = isPagesBuild ? `/${repoName}` : ''

const nextConfig: NextConfig = {
  // 静态导出，供 Capacitor 打包到 Android WebView 或部署到 GitHub Pages
  output: "export",
  // Android WebView 中静态资源需用相对路径；GitHub Pages 需要绝对路径
  assetPrefix: isPagesBuild ? `${basePath}/` : "./",
  basePath,
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
