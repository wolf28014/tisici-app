// 客户端 AI 调用：用户在设置中填入 ZAI API Key，直接 HTTP 调用
// 兼容 OpenAI Chat Completions 格式

import type { Background } from './db'

export type AIConfig = {
  apiKey: string
  baseUrl: string // 默认 https://api.z.ai/api/paas/v4
  model: string // 默认 glm-4.6
}

const AI_CONFIG_KEY = 'prompthub_ai_config'

export function getAIConfig(): AIConfig {
  if (typeof localStorage === 'undefined') {
    return { apiKey: '', baseUrl: 'https://api.z.ai/api/paas/v4', model: 'glm-4.6' }
  }
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        apiKey: parsed.apiKey || '',
        baseUrl: parsed.baseUrl || 'https://api.z.ai/api/paas/v4',
        model: parsed.model || 'glm-4.6',
      }
    }
  } catch {}
  return { apiKey: '', baseUrl: 'https://api.z.ai/api/paas/v4', model: 'glm-4.6' }
}

export function setAIConfig(cfg: Partial<AIConfig>): AIConfig {
  const cur = getAIConfig()
  const next = { ...cur, ...cfg }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(next))
  }
  return next
}

export function isAIConfigured(): boolean {
  return !!getAIConfig().apiKey
}

// ============================================
// 调用 AI 对话
// ============================================
async function callAI(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean },
): Promise<string> {
  const cfg = getAIConfig()
  if (!cfg.apiKey) {
    throw new Error('尚未配置 AI API Key，请到「设置」中填写')
  }

  const url = `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`
  const body: Record<string, unknown> = {
    model: cfg.model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 4096,
  }
  if (options?.jsonMode) {
    body.response_format = { type: 'json_object' }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`AI 调用失败 (${res.status}): ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  return data?.choices?.[0]?.message?.content || ''
}

// ============================================
// AI 生成提示词
// ============================================
export type GeneratedPrompt = {
  title: string
  description: string
  content: string
  tags: string[]
  suggestedCategory: string
}

export async function aiGeneratePrompt(
  description: string,
  style: 'detailed' | 'concise' | 'creative',
): Promise<GeneratedPrompt> {
  const styleHint = {
    detailed: '结构完整、字段齐全、步骤清晰、每段都有详细要求',
    concise: '简短有力、只保留核心要素、不啰嗦',
    creative: '富有想象力、使用比喻和故事化表达、不拘一格',
  }[style]

  const system = `你是一位顶级 Prompt 工程师，擅长为用户编写结构化、可直接复用的高质量 AI 提示词。
你只能输出 JSON，不要任何解释或 markdown 代码块。
JSON 结构：
{
  "title": "标题（≤20字，简短有力）",
  "description": "一句话描述这个提示词的用途（≤40字）",
  "content": "完整提示词正文，使用 {{变量}} 占位符标记需要用户填写的变量。结构化排版，包含角色设定、任务说明、输出格式要求。",
  "tags": ["3-5个标签"],
  "suggestedCategory": "建议分类名（从：写作创作/编程开发/学习辅导/生活日常/工作效率/电商运营/AI模特商拍/AI短剧制作/其他 中选一个）"
}`

  const user = `请按以下要求生成一个提示词：
【用户需求】${description}
【风格要求】${styleHint}

注意：
- content 中所有用户需要填写的内容都用 {{变量名}} 形式
- 不要在 content 中保留任何解释性文字
- 直接输出 JSON，不要 markdown 代码块`

  const raw = await callAI(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: style === 'creative' ? 0.9 : 0.7, jsonMode: true, maxTokens: 2000 },
  )

  // 提取 JSON（容错：模型可能仍包裹 ```json）
  const jsonStr = extractJSON(raw)
  if (!jsonStr) throw new Error('AI 返回格式错误，无法解析')
  return JSON.parse(jsonStr) as GeneratedPrompt
}

// ============================================
// AI 相似推荐
// ============================================
export type SimilarPrompt = {
  id: string
  title: string
  reason: string
  score: number
}

export async function aiFindSimilar(
  target: { title: string; content: string; description?: string | null; tags: string[] },
  candidates: Array<{ id: string; title: string; content: string; description?: string | null; tags: string[] }>,
): Promise<SimilarPrompt[]> {
  if (candidates.length === 0) return []

  const system = `你是提示词相似度评估专家。只能输出 JSON 数组，不要任何解释。
JSON 结构：
[
  { "id": "候选id", "title": "候选标题", "reason": "20-40 字解释为什么相似", "score": 0-100 整数 }
]
按 score 从高到低排序，最多返回 5 条。`

  // 为了控制上下文长度，每个候选只取前 200 字
  const shortCands = candidates.map(c => ({
    id: c.id,
    title: c.title,
    content: c.content.slice(0, 200),
    description: c.description?.slice(0, 80) ?? '',
    tags: c.tags.slice(0, 5),
  }))

  const user = `目标提示词：
标题：${target.title}
描述：${target.description ?? ''}
内容：${target.content.slice(0, 400)}
标签：${target.tags.join(', ')}

候选提示词列表：
${JSON.stringify(shortCands, null, 2)}

请评估每个候选与目标的相似度，返回 Top 5。`

  const raw = await callAI(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.3, jsonMode: true, maxTokens: 1500 },
  )

  const jsonStr = extractJSON(raw)
  if (!jsonStr) return []
  try {
    const arr = JSON.parse(jsonStr) as SimilarPrompt[]
    return arr.sort((a, b) => b.score - a.score).slice(0, 5)
  } catch {
    return []
  }
}

// ============================================
// AI 背景推荐
// ============================================
export type AIBackgroundRecommend = {
  background: Background | null
  reason: string
  imageKeyword: string
  recommendType: string
}

const PRESET_COLORS = [
  '#FFFFFF', '#F3F4F6', '#D1D5DB', '#6B7280', '#374151', '#111827',
  '#FEF3C7', '#FCE7F3', '#DBEAFE', '#D1FAE5', '#EDE9FE', '#FFEDD5',
]

export async function aiRecommendBackground(
  title: string,
  content: string,
  description?: string | null,
): Promise<AIBackgroundRecommend> {
  const system = `你是视觉设计顾问。根据提示词内容推荐一个合适的背景。
只能输出 JSON，结构：
{
  "recommendType": "color" 或 "image",
  "value": "如果是 color 则为 hex 颜色；如果是 image 则为图片关键词（英文）",
  "reason": "30 字以内解释为什么推荐",
  "imageKeyword": "如果 recommendType 是 image，给出英文关键词；如果是 color，给空字符串"
}
背景应与提示词主题氛围匹配。简洁内容用纯色，富有画面感的内容用 image。`

  const user = `提示词信息：
标题：${title}
描述：${description ?? ''}
内容：${content.slice(0, 300)}

可选预设色：${PRESET_COLORS.join(', ')}
请推荐背景。`

  const raw = await callAI(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.5, jsonMode: true, maxTokens: 500 },
  )

  const jsonStr = extractJSON(raw)
  if (!jsonStr) {
    return {
      background: { type: 'color', value: '#F3F4F6', name: '浅灰' },
      reason: '默认推荐',
      imageKeyword: '',
      recommendType: 'color',
    }
  }
  try {
    const parsed = JSON.parse(jsonStr) as {
      recommendType: 'color' | 'image'
      value: string
      reason: string
      imageKeyword: string
    }
    const bg: Background | null =
      parsed.recommendType === 'color'
        ? { type: 'color', value: parsed.value, name: 'AI 推荐' }
        : { type: 'image', value: parsed.value, name: parsed.imageKeyword }
    return {
      background: bg,
      reason: parsed.reason,
      imageKeyword: parsed.imageKeyword || '',
      recommendType: parsed.recommendType,
    }
  } catch {
    return {
      background: { type: 'color', value: '#F3F4F6', name: '浅灰' },
      reason: '默认推荐',
      imageKeyword: '',
      recommendType: 'color',
    }
  }
}

// ============================================
// 工具：从可能含 markdown 代码块的响应中提取 JSON
// ============================================
function extractJSON(text: string): string | null {
  if (!text) return null
  const trimmed = text.trim()
  // 直接是 JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed
  }
  // 提取 ```json ... ``` 或 ``` ... ```
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) {
    return match[1].trim()
  }
  // 找第一个 { 或 [
  const start = trimmed.search(/[{[]/)
  if (start === -1) return null
  const end = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'))
  if (end <= start) return null
  return trimmed.slice(start, end + 1)
}

// ============================================
// AI 热门提示词搜索（生成当月热门提示词）
// ============================================
export type HotPrompt = GeneratedPrompt

export async function aiSearchHotPrompts(category?: string): Promise<HotPrompt[]> {
  const system = `你是一位顶级 Prompt 工程师，熟悉当下（${new Date().getFullYear()}年${new Date().getMonth() + 1}月）AI 社区最热门的提示词趋势。
你只能输出 JSON 数组，不要任何解释或 markdown 代码块。
数组结构（共 10 条）：
[
  {
    "title": "标题（≤20字，吸睛）",
    "description": "一句话描述（≤40字）",
    "content": "完整提示词正文，使用 {{变量}} 占位符。结构化排版。",
    "tags": ["3-5个标签"],
    "suggestedCategory": "从：写作创作/编程开发/学习辅导/生活日常/工作效率/电商运营/AI模特商拍/AI短剧制作/其他 中选一个"
  }
]
要求：
- 涵盖当下最热的 AI 应用场景（如 ChatGPT、Claude、Midjourney、Sora、AI 编程、AI 短视频等）
- 内容要有实用价值，不能是空话
- 直接输出 JSON 数组，不要包裹在对象里`

  const user = category
    ? `请生成 10 条当前最热门的 ${category} 相关提示词。`
    : `请生成 10 条当前 AI 社区最热门、最受欢迎的提示词，覆盖多个领域。`

  const raw = await callAI(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.9, jsonMode: true, maxTokens: 4000 },
  )

  const jsonStr = extractJSON(raw)
  if (!jsonStr) return []
  try {
    const arr = JSON.parse(jsonStr) as HotPrompt[]
    return Array.isArray(arr) ? arr.slice(0, 10) : []
  } catch {
    return []
  }
}
