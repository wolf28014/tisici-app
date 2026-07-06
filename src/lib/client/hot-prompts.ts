// 热门提示词管理：调用 AI 生成 + 缓存 + 按 suggestedCategory 自动分类保存
import {
  createPrompt, queryPrompts, queryCategories, createCategory,
  deletePrompt, updatePrompt, type Prompt, type Category,
} from './db'
import { aiSearchHotPrompts, aiRemoveVariables } from './ai'

const HOT_CACHE_KEY = 'prompthub_hot_cache'
const HOT_CATEGORY_NAME = '热门推荐'

// 预设 9 大分类名（与 seed.ts 对应）
const PRESET_CATEGORIES = [
  '写作创作', '编程开发', '学习辅导', '生活日常', '工作效率',
  '电商运营', 'AI模特商拍', 'AI短剧制作', '其他',
]

type HotCache = {
  lastFetch: number
  promptIds: string[]
}

function getCache(): HotCache | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(HOT_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setCache(cache: HotCache) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(HOT_CACHE_KEY, JSON.stringify(cache))
}

// 获取或创建分类（按 name 查找，不存在则创建）
async function getOrCreateCategory(name: string, color?: string): Promise<string | null> {
  const cats = await queryCategories()
  const find = (list: any[]): any => {
    for (const c of list) {
      if (c.name === name) return c
      if (c.children) {
        const sub = find(c.children)
        if (sub) return sub
      }
    }
    return null
  }
  const existing = find(cats)
  if (existing) return existing.id
  const cat = await createCategory({
    name,
    description: `${name} 相关提示词`,
    icon: 'Sparkles',
    color: color || 'violet',
  })
  return cat.id
}

// 颜色映射：分类名 -> 颜色
const CATEGORY_COLORS: Record<string, string> = {
  '写作创作': 'rose',
  '编程开发': 'emerald',
  '学习辅导': 'sky',
  '生活日常': 'teal',
  '工作效率': 'violet',
  '电商运营': 'amber',
  'AI模特商拍': 'pink',
  'AI短剧制作': 'rose',
  '其他': 'slate',
}

// 清空旧的热门提示词（author === 'AI 热门'）
async function clearOldHotPrompts() {
  const all = await queryPrompts({})
  const oldHot = all.filter(p => p.author === 'AI 热门')
  for (const p of oldHot) {
    await deletePrompt(p.id)
  }
}

export type HotFetchResult = {
  success: boolean
  count: number
  message: string
  prompts: Prompt[]
}

export type FetchProgress = {
  stage: 'starting' | 'cleaning' | 'calling_ai' | 'saving' | 'done' | 'error'
  message: string
  current?: number
  total?: number
}

// 拉取热门提示词
// onProgress: 进度回调，让 UI 能实时反馈
// 注意：不再清空旧数据，每次搜索都是追加保存
export async function fetchHotPrompts(
  force = false,
  onProgress?: (p: FetchProgress) => void,
): Promise<HotFetchResult> {
  // 检查缓存（仅用于显示"上次拉取时间"，不再阻止重新拉取）
  const cache = getCache()

  try {
    onProgress?.({ stage: 'starting', message: '开始拉取热门提示词（不清空已有数据）...' })

    onProgress?.({ stage: 'calling_ai', message: '正在调用 AI 生成 50 条热门提示词（约 15-30 秒）...' })
    const generated = await aiSearchHotPrompts()
    if (generated.length === 0) {
      onProgress?.({ stage: 'error', message: 'AI 未返回有效内容' })
      return { success: false, count: 0, message: 'AI 未返回有效内容（请检查 API Key 配置）', prompts: [] }
    }

    onProgress?.({ stage: 'saving', message: `正在按分类保存 ${generated.length} 条提示词...`, current: 0, total: generated.length })

    // 预先创建/获取所有分类
    const categoryMap = new Map<string, string>()
    for (const catName of PRESET_CATEGORIES) {
      const id = await getOrCreateCategory(catName, CATEGORY_COLORS[catName])
      if (id) categoryMap.set(catName, id)
    }
    // "热门推荐" 分类也保留，作为兜底
    const hotCatId = await getOrCreateCategory(HOT_CATEGORY_NAME, 'rose')
    if (hotCatId) categoryMap.set(HOT_CATEGORY_NAME, hotCatId)

    const newIds: string[] = []
    for (let i = 0; i < generated.length; i++) {
      const g = generated[i]
      // 按 suggestedCategory 找分类，找不到则放"热门推荐"
      const catName = g.suggestedCategory && PRESET_CATEGORIES.includes(g.suggestedCategory)
        ? g.suggestedCategory
        : HOT_CATEGORY_NAME
      const categoryId = categoryMap.get(catName) || hotCatId

      const p = await createPrompt({
        title: g.title,
        content: g.content,
        description: g.description,
        categoryId,
        tags: ['热门', ...(g.tags || [])],
        author: 'AI 热门',
        source: `AI 自动搜索 - ${catName}`,
      })
      newIds.push(p.id)

      if (onProgress && i % 5 === 0) {
        onProgress({
          stage: 'saving',
          message: `已保存 ${i + 1}/${generated.length} 条...`,
          current: i + 1,
          total: generated.length,
        })
      }
    }

    // 更新缓存（追加新 ID，不删除旧的）
    const oldIds = cache?.promptIds || []
    setCache({ lastFetch: Date.now(), promptIds: [...oldIds, ...newIds] })
    onProgress?.({ stage: 'done', message: `完成！本次新增 ${newIds.length} 条` })

    return {
      success: true,
      count: newIds.length,
      message: `成功获取 ${newIds.length} 条热门提示词，已按分类保存`,
      prompts: await queryPrompts({}),
    }
  } catch (e) {
    onProgress?.({ stage: 'error', message: (e as Error).message })
    return {
      success: false,
      count: 0,
      message: '拉取失败：' + (e as Error).message,
      prompts: [],
    }
  }
}

// 启动时自动拉取（仅当从未拉取过时才自动拉取，避免每次启动都生成导致数据膨胀）
// 用户可随时手动点击"AI 热门搜索"追加新数据，已保存的不会删除
export async function autoFetchHotIfNeeded(): Promise<void> {
  try {
    const { isAIConfigured } = await import('./ai')
    if (!isAIConfigured()) return
  } catch {
    return
  }
  // 检查是否已有热门数据，如果有就不再自动拉取（避免每次启动重复生成）
  const all = await queryPrompts({})
  const hasHot = all.some(p => p.author === 'AI 热门')
  if (hasHot) return
  // 没有热门数据时，静默拉取一次
  try {
    await fetchHotPrompts(false)
  } catch (e) {
    console.warn('autoFetchHot failed:', e)
  }
}

export function shouldShowHotHint(): boolean {
  const cache = getCache()
  return !cache || Date.now() - cache.lastFetch > 24 * 60 * 60 * 1000
}

// ============================================
// 批量去除已存在提示词中的变量
// 找出所有 content 含 {{}} 的提示词，逐条调 AI 重写
// ============================================
export type RemoveVariablesProgress = {
  current: number
  total: number
  currentTitle: string
}

export async function removeAllVariablesFromExisting(
  onProgress?: (p: RemoveVariablesProgress) => void,
): Promise<{ processed: number; success: number; failed: number }> {
  const all = await queryPrompts({})
  const withVars = all.filter(p => p.content.includes('{{'))
  const total = withVars.length
  let success = 0
  let failed = 0

  for (let i = 0; i < withVars.length; i++) {
    const p = withVars[i]
    onProgress?.({ current: i + 1, total, currentTitle: p.title })

    try {
      const rewritten = await aiRemoveVariables(p.title, p.content, p.description)
      await updatePrompt(p.id, {
        title: rewritten.title,
        content: rewritten.content,
        description: rewritten.description,
      })
      success++
    } catch (e) {
      console.warn(`Failed to remove variables from ${p.id}:`, e)
      failed++
    }
  }

  return { processed: total, success, failed }
}
