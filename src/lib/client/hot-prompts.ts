// 热门提示词管理：调用 AI 生成 + 缓存 + 存入"热门推荐"分类
import { createPrompt, queryPrompts, createCategory, queryCategories, deletePrompt, type Prompt, type GeneratedPrompt } from './db'
import { aiSearchHotPrompts } from './ai'

const HOT_CATEGORY_NAME = '热门推荐'
const HOT_CACHE_KEY = 'prompthub_hot_cache'
const HOT_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 小时

type HotCache = {
  lastFetch: number
  promptIds: string[]
}

function getCache(): HotCache | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(HOT_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function setCache(cache: HotCache) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(HOT_CACHE_KEY, JSON.stringify(cache))
}

// 获取或创建"热门推荐"分类
async function getOrCreateHotCategory(): Promise<string | null> {
  const cats = await queryCategories()
  // 找已有的
  const find = (list: any[]): any => {
    for (const c of list) {
      if (c.name === HOT_CATEGORY_NAME) return c
      if (c.children) {
        const sub = find(c.children)
        if (sub) return sub
      }
    }
    return null
  }
  const existing = find(cats)
  if (existing) return existing.id
  // 创建
  const cat = await createCategory({
    name: HOT_CATEGORY_NAME,
    description: 'AI 自动搜索的当前热门提示词',
    icon: 'Sparkles',
    color: 'rose',
  })
  return cat.id
}

// 清空旧的热门提示词
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

// 拉取热门提示词（24h 内只拉一次）
export async function fetchHotPrompts(force = false): Promise<HotFetchResult> {
  const cache = getCache()
  if (!force && cache && Date.now() - cache.lastFetch < HOT_CACHE_TTL) {
    // 返回已缓存的
    const all = await queryPrompts({})
    const cached = all.filter(p => cache.promptIds.includes(p.id))
    if (cached.length > 0) {
      return {
        success: true,
        count: cached.length,
        message: '使用缓存（24h 内已拉取）',
        prompts: cached,
      }
    }
  }

  try {
    const categoryId = await getOrCreateHotCategory()
    if (!categoryId) {
      return { success: false, count: 0, message: '创建分类失败', prompts: [] }
    }

    // 清空旧的
    await clearOldHotPrompts()

    // 调 AI 生成
    const generated = await aiSearchHotPrompts()
    if (generated.length === 0) {
      return { success: false, count: 0, message: 'AI 未返回有效内容（请检查 API Key 配置）', prompts: [] }
    }

    // 存入数据库
    const newIds: string[] = []
    for (const g of generated) {
      const p = await createPrompt({
        title: g.title,
        content: g.content,
        description: g.description,
        categoryId,
        tags: ['热门', ...(g.tags || [])],
        author: 'AI 热门',
        source: 'AI 自动搜索',
      })
      newIds.push(p.id)
    }

    setCache({ lastFetch: Date.now(), promptIds: newIds })

    return {
      success: true,
      count: newIds.length,
      message: `成功获取 ${newIds.length} 条热门提示词`,
      prompts: await queryPrompts({ categoryId }),
    }
  } catch (e) {
    return {
      success: false,
      count: 0,
      message: '拉取失败：' + (e as Error).message,
      prompts: [],
    }
  }
}

// 检查是否需要自动拉取（启动时调用）
// 改为每次启动都拉取（去掉 24h 节流，让用户始终拿到最新热门）
export async function autoFetchHotIfNeeded(): Promise<void> {
  // 如果 AI 未配置，跳过
  try {
    const { isAIConfigured } = await import('./ai')
    if (!isAIConfigured()) return
  } catch {
    return
  }
  // 静默拉取，不报错
  try {
    await fetchHotPrompts(true) // force=true，每次启动都拉取最新
  } catch (e) {
    console.warn('autoFetchHot failed:', e)
  }
}

export function shouldShowHotHint(): boolean {
  const cache = getCache()
  return !cache || Date.now() - cache.lastFetch > HOT_CACHE_TTL
}
