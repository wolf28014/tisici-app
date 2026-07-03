// 公共类型与工具函数（客户端）
// 类型从 db.ts re-export，保持单一来源
export type {
  Category,
  CategoryWithCount,
  Collection,
  CollectionWithCount,
  Background,
  Prompt,
  Version,
  TagWithCount,
} from '@/lib/client/db'

import type { Background } from '@/lib/client/db'

// 6 预设背景：浅 → 深
export const PRESET_BACKGROUNDS: Background[] = [
  { type: 'color', value: '#FFFFFF', name: '纯白' },
  { type: 'color', value: '#F3F4F6', name: '浅灰' },
  { type: 'color', value: '#D1D5DB', name: '中灰' },
  { type: 'color', value: '#6B7280', name: '深灰' },
  { type: 'color', value: '#374151', name: '墨灰' },
  { type: 'color', value: '#111827', name: '近黑' },
]

// 6 渐变背景
export const GRADIENT_BACKGROUNDS: Background[] = [
  { type: 'color', value: 'linear-gradient(135deg, #fef3c7, #fde68a)', name: '暖阳' },
  { type: 'color', value: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', name: '晴空' },
  { type: 'color', value: 'linear-gradient(135deg, #fce7f3, #fbcfe8)', name: '樱花' },
  { type: 'color', value: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', name: '青苔' },
  { type: 'color', value: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', name: '薰衣草' },
  { type: 'color', value: 'linear-gradient(135deg, #1e293b, #0f172a)', name: '夜空' },
]

export function parseBackground(bg: string | null | undefined): Background | null {
  if (!bg) return null
  try {
    const parsed = JSON.parse(bg)
    if (parsed && typeof parsed === 'object' && (parsed.type === 'color' || parsed.type === 'image') && typeof parsed.value === 'string') {
      return parsed as Background
    }
  } catch {
    // ignore
  }
  return null
}

export function serializeBackground(bg: Background | null | undefined): string | null {
  if (!bg) return null
  return JSON.stringify(bg)
}

// 分类颜色 → Tailwind 类名映射
export const COLOR_CLASSES: Record<
  string,
  { bg: string; text: string; border: string; ring: string; dot: string; soft: string }
> = {
  rose: {
    bg: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-900',
    ring: 'ring-rose-500/30',
    dot: 'bg-rose-500',
    soft: 'bg-rose-50 dark:bg-rose-950/40',
  },
  emerald: {
    bg: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-900',
    ring: 'ring-emerald-500/30',
    dot: 'bg-emerald-500',
    soft: 'bg-emerald-50 dark:bg-emerald-950/40',
  },
  amber: {
    bg: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-900',
    ring: 'ring-amber-500/30',
    dot: 'bg-amber-500',
    soft: 'bg-amber-50 dark:bg-amber-950/40',
  },
  sky: {
    bg: 'bg-sky-500',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-900',
    ring: 'ring-sky-500/30',
    dot: 'bg-sky-500',
    soft: 'bg-sky-50 dark:bg-sky-950/40',
  },
  violet: {
    bg: 'bg-violet-500',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-900',
    ring: 'ring-violet-500/30',
    dot: 'bg-violet-500',
    soft: 'bg-violet-50 dark:bg-violet-950/40',
  },
  teal: {
    bg: 'bg-teal-500',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-900',
    ring: 'ring-teal-500/30',
    dot: 'bg-teal-500',
    soft: 'bg-teal-50 dark:bg-teal-950/40',
  },
  pink: {
    bg: 'bg-pink-500',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-900',
    ring: 'ring-pink-500/30',
    dot: 'bg-pink-500',
    soft: 'bg-pink-50 dark:bg-pink-950/40',
  },
  slate: {
    bg: 'bg-slate-500',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    ring: 'ring-slate-500/30',
    dot: 'bg-slate-500',
    soft: 'bg-slate-50 dark:bg-slate-800/40',
  },
}

export function getColorClass(color?: string | null) {
  return COLOR_CLASSES[color || 'slate'] || COLOR_CLASSES.slate
}

// 提取 {{变量}}
export function extractVariables(content: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g
  const set = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    set.add(match[1].trim())
  }
  return Array.from(set)
}

// 替换变量
export function fillVariables(content: string, values: Record<string, string>): string {
  return content.replace(/\{\{([^}]+)\}\}/g, (full, name) => {
    const key = name.trim()
    const v = values[key]
    return v && v.trim() ? v : full
  })
}

// 复制到剪贴板（兼容 WebView）
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

// 编码为分享 URL（base64）
export function encodePromptToShare(prompt: {
  title: string
  content: string
  description?: string | null
  tags?: string[]
  author?: string | null
}): string {
  const json = JSON.stringify(prompt)
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodePromptFromShare(encoded: string): {
  title: string
  content: string
  description?: string | null
  tags?: string[]
  author?: string | null
} | null {
  try {
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    while (b64.length % 4) b64 += '='
    const json = decodeURIComponent(escape(atob(b64)))
    return JSON.parse(json)
  } catch {
    return null
  }
}
