# PromptHub Android — 构建说明

本项目基于 [wolf28014/tishici](https://github.com/wolf28014/tishici)（PromptHub 提示词库 Next.js 版）改造为安卓 APP。

## 技术架构

| 项 | 原 Web 版 | 安卓版 |
|---|---|---|
| 框架 | Next.js 16 (App Router + API Routes) | Next.js 16 静态导出 (`output: 'export'`) |
| 数据存储 | Prisma + 服务端 SQLite | **客户端 sql.js (WASM SQLite)**，数据持久化到 localStorage |
| API 调用 | 服务端 `/api/*` 路由 | **客户端直调** (`src/lib/client/*`) |
| AI 调用 | 服务端 z-ai-web-dev-sdk | **客户端 HTTP 调用** OpenAI 兼容协议（用户填 API Key） |
| 同步码 | 服务端编码 | **客户端 base64 编码**，纯本地 |
| 打包 | Node.js 服务器 | **Capacitor 6** 包装到 Android WebView |
| UI | 桌面优先 + 响应式 | **移动端优先**：底部 Tab + 抽屉式筛选 |

## 项目结构

```
prompthub-android/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # 根布局
│   │   ├── page.tsx             # 主页（底部 Tab + 5 个页面）
│   │   └── globals.css          # 全局样式（含移动端安全区域）
│   ├── components/              # 复用原仓库 shadcn/ui 组件
│   │   ├── ui/                  # shadcn 基础组件
│   │   ├── prompt-form-dialog.tsx
│   │   ├── prompt-detail-sheet.tsx
│   │   ├── ai-generate-dialog.tsx
│   │   ├── import-export-dialog.tsx
│   │   ├── cloud-sync-dialog.tsx
│   │   ├── batch-edit-dialog.tsx
│   │   ├── share-dialog.tsx
│   │   ├── collection-manager-dialog.tsx
│   │   ├── background-selector.tsx
│   │   ├── similar-prompts.tsx
│   │   ├── star-rating.tsx
│   │   ├── version-history-dialog.tsx
│   │   ├── theme-provider.tsx
│   │   ├── theme-toggle.tsx
│   │   ├── page-background-applier.tsx
│   │   └── category-icon.tsx
│   ├── lib/
│   │   ├── client/
│   │   │   ├── db.ts            # sql.js 客户端 SQLite（替代 Prisma）
│   │   │   ├── ai.ts            # AI 客户端封装（替代服务端 z-ai-sdk）
│   │   │   ├── sync.ts          # 同步码编解码
│   │   │   └── seed.ts          # 预置 9 大分类 + 30 条精选提示词
│   │   ├── prompt-store.ts      # Zustand store（重写为客户端调用）
│   │   ├── prompt-types.ts      # 类型 + 工具函数
│   │   ├── settings-store.ts    # localStorage 设置
│   │   ├── api-helpers.ts       # 兼容占位
│   │   └── utils.ts
│   └── hooks/
│       ├── use-mobile.ts
│       └── use-toast.ts
├── android/                     # Capacitor 生成的 Android 工程
│   └── app/
│       ├── src/main/
│       │   ├── java/.../MainActivity.java
│       │   ├── res/             # 图标、splash、strings
│       │   └── AndroidManifest.xml
│       └── build.gradle
├── android-resources/           # 原始图标资源
├── capacitor.config.ts          # Capacitor 配置
├── next.config.ts               # Next.js 静态导出配置
├── package.json
└── out/                         # next build 静态产物（Capacitor webDir）
```

## 核心特性（保留 vs 移除）

### ✅ 保留
- 提示词 CRUD（新建/编辑/删除/复制 + `{{变量}}` 智能识别填充）
- 9 大预设分类 + 30 条精选提示词（首次启动自动种入）
- 标签云筛选
- 收藏夹分组 + 1-5 星评分
- 收藏 / 置顶
- 6 种排序（置顶/最近/使用最多/评分最高/自定义）
- 版本历史与一键恢复
- 批量编辑（多选后批量加/移标签、设置收藏夹、删除）
- AI 生成提示词（详细/简洁/创意三种风格）
- AI 相似推荐（Top 5，含相似度分数）
- AI 背景推荐
- 跨设备云同步（同步码）
- JSON 导入/导出
- 分享链接（URL base64 编码）
- 浅色/深色主题
- 页面背景设置（纯色/渐变）
- 数据统计

### ❌ 移除（移动端价值低或与 Capacitor 不兼容）
- 服务端 API 路由（已转为客户端 lib）
- Prisma ORM（已转为 sql.js）
- 拖拽排序（移动端用长按菜单更自然）
- 部分高级背景图上传（移动端从相册选取）
- 服务器部署相关脚本（vbs/bat/service 等）

## 应用元信息

| 项 | 值 |
|---|---|
| 应用名 | PromptHub 提示词库 |
| 包名 | `com.prompthub.app` |
| 最低 Android 版本 | Android 5.1 (API 22) |
| 目标 SDK | Android 14 (API 34) |
| 主色 | `#7C3AED`（紫色） |
| 图标 | 紫色渐变背景 + 白色 Sparkles |

## 本地构建步骤

### 前置依赖
- Node.js 18+ 与 npm
- Java JDK 17+（推荐 21）
- Android SDK（含 platform-tools / platforms;android-34 / build-tools;34.0.0）
- Android Studio（可选，便于调试）

### 1. 安装项目依赖
```bash
cd prompthub-android
npm install
```

### 2. 构建 Next.js 静态产物
```bash
npx next build
# 产物在 out/ 目录
```

### 3. 同步到 Android 项目
```bash
npx cap sync android
```

### 4. 构建 APK

**用 Android Studio：**
```bash
npx cap open android
# 在 Android Studio 中点击 Build → Build Bundle(s) / APK(s) → Build APK(s)
```

**用命令行：**
```bash
cd android
export ANDROID_HOME=/path/to/Android/Sdk
./gradlew assembleDebug     # 生成 debug APK
./gradlew assembleRelease   # 生成 release APK（需配置签名）

# 输出位置：
# android/app/build/outputs/apk/debug/app-debug.apk
# android/app/build/outputs/apk/release/app-release.apk
```

### 5. 在真机安装
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## AI 功能配置

APP 安装后首次使用 AI 功能前，需在 **设置 → AI API 配置** 中填入：

| 字段 | 默认值 | 说明 |
|---|---|---|
| API Key | （空） | 你的 Z.ai / OpenAI / DeepSeek API Key |
| Base URL | `https://api.z.ai/api/paas/v4` | 兼容 OpenAI 协议的接口地址 |
| 模型 | `glm-4.6` | 调用的模型名 |

推荐使用 **Z.ai GLM-4.6**（申请 Key：https://z.ai ）。
也兼容 OpenAI、DeepSeek、Moonshot、Together AI 等任何 OpenAI 兼容协议。

## 开发调试

```bash
# 启动 Next.js dev server（浏览器调试）
npm run dev
# 访问 http://localhost:3005

# 在 Android 模拟器/真机调试
npx cap run android
```

## 数据存储说明

- 所有数据存储在 **浏览器/WebView 的 localStorage** 中
- sql.js WASM 库从 CDN 加载（首次启动需联网，之后浏览器/WebView 会缓存）
- **清除 APP 数据会丢失所有提示词**，请定期用「导入/导出」备份
- 跨设备同步：在 A 设备生成同步码 → B 设备粘贴同步码即可

## 常见问题

**Q: 启动后白屏？**
A: WebView 需要联网加载 sql.js WASM 文件，请确保网络可用。后续启动会从缓存读取。

**Q: AI 功能不工作？**
A: 检查「设置 → AI API 配置」是否填入正确的 API Key 和 Base URL。

**Q: 如何备份数据？**
A: 顶部菜单 → 导入/导出 → 导出 JSON 文件。或使用同步码跨设备传输。

**Q: APK 体积为什么这么小？**
A: 因为是 WebView 包装，所有逻辑都在 HTML/JS 中。约 2-3 MB。
