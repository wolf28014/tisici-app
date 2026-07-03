// 10 套主题：每套有独特的背景、主色、文字色
// 通过修改 CSS 变量实现全局切换

export type Theme = {
  id: string
  name: string
  description: string
  emoji: string
  // CSS 变量值
  vars: {
    background: string
    foreground: string
    card: string
    primary: string
    primaryForeground: string
    accent: string
    border: string
    muted: string
    mutedForeground: string
    // 主题色（用于按钮、链接、强调）
    ring: string
    // 自定义背景（可以是渐变）
    appBg?: string
  }
  // 是否深色主题（影响图标渲染）
  isDark: boolean
}

export const THEMES: Theme[] = [
  {
    id: 'inkblack',
    name: '墨黑',
    description: '极简黑白，专业沉稳',
    emoji: '⚫',
    isDark: false,
    vars: {
      background: '#ffffff',
      foreground: '#0a0a0a',
      card: '#ffffff',
      primary: '#171717',
      primaryForeground: '#ffffff',
      accent: 'rgba(0,0,0,0.05)',
      border: 'rgba(0,0,0,0.08)',
      muted: '#f5f5f5',
      mutedForeground: '#737373',
      ring: '#171717',
    },
  },
  {
    id: 'sakura',
    name: '樱花',
    description: '粉色浪漫，温柔治愈',
    emoji: '🌸',
    isDark: false,
    vars: {
      background: '#fff5f7',
      foreground: '#831843',
      card: '#ffffff',
      primary: '#ec4899',
      primaryForeground: '#ffffff',
      accent: '#fce7f3',
      border: '#fbcfe8',
      muted: '#fce7f3',
      mutedForeground: '#be185d',
      ring: '#ec4899',
      appBg: 'linear-gradient(135deg, #fff5f7 0%, #fce7f3 100%)',
    },
  },
  {
    id: 'mint',
    name: '薄荷',
    description: '清新薄荷，活力满满',
    emoji: '🌿',
    isDark: false,
    vars: {
      background: '#f0fdf4',
      foreground: '#052e16',
      card: '#ffffff',
      primary: '#10b981',
      primaryForeground: '#ffffff',
      accent: '#d1fae5',
      border: '#a7f3d0',
      muted: '#dcfce7',
      mutedForeground: '#047857',
      ring: '#10b981',
      appBg: 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)',
    },
  },
  {
    id: 'sunset',
    name: '夕阳',
    description: '橙红暖调，温暖治愈',
    emoji: '🌅',
    isDark: false,
    vars: {
      background: '#fff7ed',
      foreground: '#431407',
      card: '#ffffff',
      primary: '#f97316',
      primaryForeground: '#ffffff',
      accent: '#fed7aa',
      border: '#fdba74',
      muted: '#ffedd5',
      mutedForeground: '#c2410c',
      ring: '#f97316',
      appBg: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
    },
  },
  {
    id: 'deepsea',
    name: '深海',
    description: '深蓝静谧，专注深沉',
    emoji: '🌊',
    isDark: true,
    vars: {
      background: '#0c1929',
      foreground: '#e0e7ff',
      card: '#1e293b',
      primary: '#3b82f6',
      primaryForeground: '#ffffff',
      accent: 'rgba(59,130,246,0.15)',
      border: 'rgba(96,165,250,0.2)',
      muted: '#1e293b',
      mutedForeground: '#94a3b8',
      ring: '#3b82f6',
      appBg: 'linear-gradient(135deg, #0c1929 0%, #1e3a5f 100%)',
    },
  },
  {
    id: 'lavender',
    name: '薰衣草',
    description: '紫色调，优雅神秘',
    emoji: '💜',
    isDark: false,
    vars: {
      background: '#faf5ff',
      foreground: '#3b0764',
      card: '#ffffff',
      primary: '#8b5cf6',
      primaryForeground: '#ffffff',
      accent: '#ede9fe',
      border: '#ddd6fe',
      muted: '#f5f3ff',
      mutedForeground: '#6d28d9',
      ring: '#8b5cf6',
      appBg: 'linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)',
    },
  },
  {
    id: 'coffee',
    name: '咖啡',
    description: '棕色温暖，复古文艺',
    emoji: '☕',
    isDark: false,
    vars: {
      background: '#faf6f2',
      foreground: '#3e2723',
      card: '#ffffff',
      primary: '#795548',
      primaryForeground: '#ffffff',
      accent: '#d7ccc8',
      border: '#bcaaa4',
      muted: '#efebe9',
      mutedForeground: '#5d4037',
      ring: '#795548',
      appBg: 'linear-gradient(135deg, #faf6f2 0%, #efebe9 100%)',
    },
  },
  {
    id: 'snow',
    name: '雪白',
    description: '冰蓝清爽，纯净极简',
    emoji: '❄️',
    isDark: false,
    vars: {
      background: '#f8fafc',
      foreground: '#0f172a',
      card: '#ffffff',
      primary: '#0ea5e9',
      primaryForeground: '#ffffff',
      accent: '#e0f2fe',
      border: '#bae6fd',
      muted: '#f1f5f9',
      mutedForeground: '#0369a1',
      ring: '#0ea5e9',
      appBg: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
    },
  },
  {
    id: 'jungle',
    name: '丛林',
    description: '深绿自然，沉静专注',
    emoji: '🌳',
    isDark: true,
    vars: {
      background: '#0a1f0e',
      foreground: '#d1fae5',
      card: '#14532d',
      primary: '#22c55e',
      primaryForeground: '#052e16',
      accent: 'rgba(34,197,94,0.15)',
      border: 'rgba(74,222,128,0.2)',
      muted: '#14532d',
      mutedForeground: '#86efac',
      ring: '#22c55e',
      appBg: 'linear-gradient(135deg, #0a1f0e 0%, #14532d 100%)',
    },
  },
  {
    id: 'rose',
    name: '玫瑰',
    description: '玫红典雅，热情活力',
    emoji: '🌹',
    isDark: false,
    vars: {
      background: '#fff1f2',
      foreground: '#4c0519',
      card: '#ffffff',
      primary: '#e11d48',
      primaryForeground: '#ffffff',
      accent: '#ffe4e6',
      border: '#fecdd3',
      muted: '#fff1f2',
      mutedForeground: '#9f1239',
      ring: '#e11d48',
      appBg: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
    },
  },
]

const THEME_STORAGE_KEY = 'prompthub_theme'

export function getCurrentThemeId(): string {
  if (typeof localStorage === 'undefined') return 'lavender'
  return localStorage.getItem(THEME_STORAGE_KEY) || 'lavender'
}

export function getCurrentTheme(): Theme {
  const id = getCurrentThemeId()
  return THEMES.find(t => t.id === id) || THEMES[5] // 默认薰衣草
}

export function setTheme(themeId: string): void {
  if (typeof localStorage === 'undefined') return
  const theme = THEMES.find(t => t.id === themeId)
  if (!theme) return
  localStorage.setItem(THEME_STORAGE_KEY, themeId)
  applyTheme(theme)
  // 同时设置 dark class（影响 next-themes）
  if (typeof document !== 'undefined') {
    if (theme.isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  // 设置 CSS 变量
  root.style.setProperty('--background', theme.vars.background)
  root.style.setProperty('--foreground', theme.vars.foreground)
  root.style.setProperty('--card', theme.vars.card)
  root.style.setProperty('--card-foreground', theme.vars.foreground)
  root.style.setProperty('--primary', theme.vars.primary)
  root.style.setProperty('--primary-foreground', theme.vars.primaryForeground)
  root.style.setProperty('--accent', theme.vars.accent)
  root.style.setProperty('--accent-foreground', theme.vars.foreground)
  root.style.setProperty('--border', theme.vars.border)
  root.style.setProperty('--input', theme.vars.border)
  root.style.setProperty('--ring', theme.vars.ring)
  root.style.setProperty('--muted', theme.vars.muted)
  root.style.setProperty('--muted-foreground', theme.vars.mutedForeground)
  root.style.setProperty('--secondary', theme.vars.muted)
  root.style.setProperty('--secondary-foreground', theme.vars.foreground)
  root.style.setProperty('--popover', theme.vars.card)
  root.style.setProperty('--popover-foreground', theme.vars.foreground)
  // 自定义背景
  if (theme.vars.appBg) {
    document.body.style.background = theme.vars.appBg
    document.body.style.backgroundAttachment = 'fixed'
  } else {
    document.body.style.background = theme.vars.background
  }
  // dark class
  if (theme.isDark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

// 把 oklch 颜色转换的工具（用于覆盖 Tailwind 4 默认 oklch 变量）
// 因为 Tailwind 4 用 oklch，我们用 hex 时需要确保 CSS 变量是 hex 或 rgb
