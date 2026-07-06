// 客户端 AI 调用：用户在设置中填入 API Key，直接 HTTP 调用
// 兼容 OpenAI Chat Completions 格式
// 支持多渠道配置：每个渠道独立保存 apiKey/baseUrl/model/apiFormat

import type { Background } from './db'

export type APIFormat = 'openai' | 'anthropic' | 'custom'

export type AIConfig = {
  apiKey: string
  baseUrl: string
  model: string
  apiFormat?: APIFormat // API 协议格式
}

// 多渠道配置：每个渠道独立保存
export type ChannelConfig = {
  id: string
  name: string
  apiKey: string
  baseUrl: string
  model: string
  apiFormat: APIFormat
}

const AI_CONFIG_KEY = 'prompthub_ai_config'
const AI_CHANNELS_KEY = 'prompthub_ai_channels'
const AI_ACTIVE_CHANNEL_KEY = 'prompthub_ai_active_channel'

// 预设渠道
export const AI_CHANNEL_PRESETS: Array<{
  id: string
  name: string
  baseUrl: string
  models: string[]
  defaultModel: string
  apiFormat: APIFormat
  description: string
  emoji: string
  website?: string
}> = [
  {
    id: 'zai',
    name: 'Z.ai 智谱',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    models: ['glm-4.6', 'glm-4-plus', 'glm-4-flash', 'glm-4-air'],
    defaultModel: 'glm-4.6',
    apiFormat: 'openai',
    description: '国产大模型，免费额度多，中文优秀',
    emoji: '🤖',
    website: 'https://z.ai',
  },
  {
    id: 'agnes',
    name: 'Agnes AI',
    baseUrl: 'https://apihub.agnes-ai.com/v1',
    models: ['agnes-2.0-flash'],
    defaultModel: 'agnes-2.0-flash',
    apiFormat: 'openai',
    description: 'Agnes AI 模型，快速响应',
    emoji: '✨',
    website: 'https://agnes-ai.com',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-mini', 'o1-preview'],
    defaultModel: 'gpt-4o-mini',
    apiFormat: 'openai',
    description: 'GPT 系列，效果最好但需海外网络',
    emoji: '🟢',
    website: 'https://platform.openai.com',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
    apiFormat: 'openai',
    description: '国产，性价比高，代码能力强',
    emoji: '🔵',
    website: 'https://platform.deepseek.com',
  },
  {
    id: 'moonshot',
    name: 'Moonshot Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    defaultModel: 'moonshot-v1-8k',
    apiFormat: 'openai',
    description: 'Kimi，长上下文，中文友好',
    emoji: '🌙',
    website: 'https://platform.moonshot.cn',
  },
  {
    id: 'qwen',
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
    defaultModel: 'qwen-turbo',
    apiFormat: 'openai',
    description: '阿里通义千问，国产大模型',
    emoji: '🟠',
    website: 'https://dashscope.console.aliyun.com',
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    defaultModel: 'claude-3-5-sonnet-20241022',
    apiFormat: 'anthropic',
    description: 'Claude，长文写作擅长',
    emoji: '🟣',
    website: 'https://console.anthropic.com',
  },
  {
    id: 'custom',
    name: '自定义',
    baseUrl: '',
    models: [],
    defaultModel: '',
    apiFormat: 'openai',
    description: '兼容 OpenAI 协议的任意端点',
    emoji: '⚙️',
  },
]

// ============================================
// 当前活跃配置（兼容旧代码）
// ============================================

export function getAIConfig(): AIConfig {
  // 优先从活跃渠道读取
  const activeChannel = getActiveChannel()
  if (activeChannel) {
    return {
      apiKey: activeChannel.apiKey,
      baseUrl: activeChannel.baseUrl,
      model: activeChannel.model,
      apiFormat: activeChannel.apiFormat,
    }
  }
  // 兼容旧版单配置
  if (typeof localStorage === 'undefined') {
    return { apiKey: '', baseUrl: 'https://api.z.ai/api/paas/v4', model: 'glm-4.6', apiFormat: 'openai' }
  }
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        apiKey: parsed.apiKey || '',
        baseUrl: parsed.baseUrl || 'https://api.z.ai/api/paas/v4',
        model: parsed.model || 'glm-4.6',
        apiFormat: parsed.apiFormat || 'openai',
      }
    }
  } catch {}
  return { apiKey: '', baseUrl: 'https://api.z.ai/api/paas/v4', model: 'glm-4.6', apiFormat: 'openai' }
}

export function setAIConfig(cfg: Partial<AIConfig>): AIConfig {
  // 同时更新活跃渠道
  const activeChannel = getActiveChannel()
  if (activeChannel) {
    updateChannel(activeChannel.id, {
      apiKey: cfg.apiKey ?? activeChannel.apiKey,
      baseUrl: cfg.baseUrl ?? activeChannel.baseUrl,
      model: cfg.model ?? activeChannel.model,
      apiFormat: cfg.apiFormat ?? activeChannel.apiFormat,
    })
  }
  // 兼容旧版
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
// 多渠道管理
// ============================================

export function getAllChannels(): ChannelConfig[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(AI_CHANNELS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAllChannels(channels: ChannelConfig[]) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(AI_CHANNELS_KEY, JSON.stringify(channels))
}

export function getActiveChannelId(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(AI_ACTIVE_CHANNEL_KEY)
}

export function setActiveChannelId(id: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(AI_ACTIVE_CHANNEL_KEY, id)
}

export function getActiveChannel(): ChannelConfig | null {
  const id = getActiveChannelId()
  if (!id) return null
  const channels = getAllChannels()
  return channels.find(c => c.id === id) || null
}

export function addOrUpdateChannel(channel: ChannelConfig): void {
  const channels = getAllChannels()
  const idx = channels.findIndex(c => c.id === channel.id)
  if (idx >= 0) {
    channels[idx] = channel
  } else {
    channels.push(channel)
  }
  saveAllChannels(channels)
}

export function updateChannel(id: string, updates: Partial<ChannelConfig>): void {
  const channels = getAllChannels()
  const idx = channels.findIndex(c => c.id === id)
  if (idx >= 0) {
    channels[idx] = { ...channels[idx], ...updates }
    saveAllChannels(channels)
  }
}

export function deleteChannel(id: string): void {
  const channels = getAllChannels().filter(c => c.id !== id)
  saveAllChannels(channels)
  // 如果删的是活跃渠道，切到第一个
  if (getActiveChannelId() === id) {
    if (channels.length > 0) {
      setActiveChannelId(channels[0].id)
    } else {
      localStorage.removeItem(AI_ACTIVE_CHANNEL_KEY)
    }
  }
}

// 从预设创建渠道
export function createChannelFromPreset(presetId: string): ChannelConfig {
  const preset = AI_CHANNEL_PRESETS.find(p => p.id === presetId) || AI_CHANNEL_PRESETS[0]
  return {
    id: presetId + '_' + Date.now(),
    name: preset.name,
    apiKey: '',
    baseUrl: preset.baseUrl,
    model: preset.defaultModel,
    apiFormat: preset.apiFormat,
  }
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

  const format = cfg.apiFormat || 'openai'
  const tryCall = async (useJsonMode: boolean): Promise<string> => {
    if (format === 'anthropic') {
      // Anthropic Claude API 格式
      const url = `${cfg.baseUrl.replace(/\/$/, '')}/messages`
      // system message 单独传
      const systemMsg = messages.find(m => m.role === 'system')?.content || ''
      const userMessages = messages.filter(m => m.role !== 'system')
      const body: Record<string, unknown> = {
        model: cfg.model,
        max_tokens: options?.maxTokens ?? 4096,
        system: systemMsg,
        messages: userMessages.map(m => ({ role: m.role, content: m.content })),
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': cfg.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`AI 调用失败 (${res.status}): ${errText.slice(0, 200)}`)
      }
      const data = await res.json()
      return data?.content?.[0]?.text || ''
    }

    // OpenAI 兼容格式（默认）
    const url = `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`
    const body: Record<string, unknown> = {
      model: cfg.model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
    }
    if (useJsonMode && options?.jsonMode) {
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

  // jsonMode 容错
  if (options?.jsonMode) {
    try {
      return await tryCall(true)
    } catch (e) {
      const errMsg = (e as Error).message
      if (errMsg.includes('400') || errMsg.includes('422') || errMsg.includes('response_format')) {
        return await tryCall(false)
      }
      throw e
    }
  }
  return await tryCall(false)
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
    detailed: '结构完整、字段齐全、步骤清晰、每段都有详细要求，content 至少 300 字',
    concise: '简短有力、只保留核心要素、不啰嗦，content 至少 150 字',
    creative: '富有想象力、使用比喻和故事化表达、不拘一格，content 至少 250 字',
  }[style]

  const system = `你是一位顶级 Prompt 工程师，擅长为用户编写结构化、可直接复用的高质量 AI 提示词。
你只能输出 JSON，不要任何解释或 markdown 代码块。
JSON 结构：
{
  "title": "标题（≤20字，简短有力）",
  "description": "一句话描述这个提示词的用途（≤40字）",
  "content": "完整提示词正文，**不要使用 {{变量}} 占位符**，直接写出具体的、可直接复制使用的内容。结构化排版，包含：1.角色设定 2.任务背景 3.具体要求（分点详细列出）4.输出格式 5.注意事项",
  "tags": ["3-5个标签"],
  "suggestedCategory": "建议分类名（从：写作创作/编程开发/学习辅导/生活日常/工作效率/电商运营/AI模特商拍/AI短剧制作/其他 中选一个）"
}`

  const user = `请按以下要求生成一个提示词：
【用户需求】${description}
【风格要求】${styleHint}

注意：
- **content 绝对不能包含 {{}} 占位符**，必须是用户复制后可直接发给 AI 的完整内容
- content 要详细实用，包含角色设定、任务背景、具体要求、输出格式、注意事项
- 如果需要场景化，给出一个具体的场景示例（如"以智能手表为例"）
- 不要在 content 中保留任何解释性文字
- 直接输出 JSON，不要 markdown 代码块`

  const raw = await callAI(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: style === 'creative' ? 0.9 : 0.7, jsonMode: true, maxTokens: 3000 },
  )

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
// AI 热门提示词搜索（生成当月热门提示词，50 条，详细实用）
// ============================================
export type HotPrompt = GeneratedPrompt

export async function aiSearchHotPrompts(category?: string): Promise<HotPrompt[]> {
  const system = `你是一位顶级 Prompt 工程师，熟悉当下（${new Date().getFullYear()}年${new Date().getMonth() + 1}月）AI 社区最热门的提示词趋势。
你只能输出 JSON 数组，不要任何解释或 markdown 代码块。

【重要】每条提示词的 content 字段必须是一份**详细的、可直接复制使用的高质量提示词**，包含：
1. 角色设定（你是谁）
2. 任务背景（为什么要做这件事）
3. 具体要求（分点列出，每点都要详细）
4. 输出格式（明确的结构要求）
5. 注意事项（避免什么、强调什么）

content 字段长度至少 200 字，不能是简单的一两句话。

数组结构（共 50 条）：
[
  {
    "title": "标题（≤20字，吸睛）",
    "description": "一句话描述（≤40字）",
    "content": "完整提示词正文，至少 200 字，结构化排版，包含角色设定/任务背景/具体要求/输出格式/注意事项。**不要使用 {{变量}} 占位符**，直接写出具体场景示例。",
    "tags": ["3-5个标签"],
    "suggestedCategory": "从：写作创作/编程开发/学习辅导/生活日常/工作效率/电商运营/AI模特商拍/AI短剧制作/其他 中选一个"
  }
]

要求：
- 涵盖当下最热的 AI 应用场景（如 ChatGPT、Claude、Midjourney、Sora、AI 编程、AI 短视频等）
- 必须 50 条，每条内容不同，覆盖多个领域
- **content 字段绝对不能包含 {{}} 占位符**，必须是用户复制后可直接发给 AI 的完整、详细提示词
- 每条 content 必须有实际使用价值，不能是空话套话
- 直接输出 JSON 数组，不要包裹在对象里`

  const user = category
    ? `请生成 50 条当前最热门的 ${category} 相关提示词。每条 content 必须是详细的、可直接使用的完整提示词（至少 200 字），不含 {{变量}}。`
    : `请生成 50 条当前 AI 社区最热门、最受欢迎的提示词，覆盖写作、编程、学习、生活、工作、电商、AI 模特、AI 短剧等多个领域。每条 content 必须是详细的、可直接复制使用的完整提示词（至少 200 字），不含 {{变量}} 占位符。`

  const raw = await callAI(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.9, jsonMode: true, maxTokens: 16000 },
  )

  const jsonStr = extractJSON(raw)
  if (!jsonStr) return []
  try {
    const arr = JSON.parse(jsonStr) as HotPrompt[]
    return Array.isArray(arr) ? arr.slice(0, 50) : []
  } catch {
    return []
  }
}

// ============================================
// AI 搜索提示词（按关键词，30 条，详细实用）
// 返回：最常用 10 + 最热门 10 + 最高评价 10
// ============================================
export type SearchedPrompt = GeneratedPrompt & {
  searchType?: '常用' | '热门' | '高评价'
}

export async function aiSearchPromptsByKeyword(keyword: string): Promise<SearchedPrompt[]> {
  if (!keyword.trim()) return []

  const system = `你是一位 Prompt 搜索引擎，能从全网（GitHub、PromptHero、PromptBase、Reddit r/ChatGPT、各种 AI 社区）搜索并整理与关键词相关的提示词。
你只能输出 JSON 数组，不要任何解释或 markdown 代码块。

【重要】每条提示词的 content 字段必须是一份**详细的、可直接复制使用的高质量提示词**，包含：
1. 角色设定（你是谁）
2. 任务背景（为什么要做这件事）
3. 具体要求（分点列出，每点都要详细）
4. 输出格式（明确的结构要求）
5. 注意事项（避免什么、强调什么）

content 字段长度至少 200 字，不能是简单的一两句话。

数组结构（共 30 条，分为 3 类各 10 条）：
[
  {
    "title": "标题（≤20字）",
    "description": "一句话描述（≤40字）",
    "content": "完整提示词正文，至少 200 字，结构化排版。**不要使用 {{变量}} 占位符**，必须是用户复制后可直接发给 AI 的完整内容。",
    "tags": ["3-5个标签"],
    "suggestedCategory": "从：写作创作/编程开发/学习辅导/生活日常/工作效率/电商运营/AI模特商拍/AI短剧制作/其他 中选一个",
    "searchType": "常用" | "热门" | "高评价"
  }
]

【30 条分布】
- 1-10 条：searchType = "常用"，覆盖该关键词最常用的基础场景（详细版，不是简单模板）
- 11-20 条：searchType = "热门"，近期 AI 社区讨论度高的进阶用法
- 21-30 条：searchType = "高评价"，用户反馈最好、效果最佳的精品提示词

【要求】
- 30 条内容必须各不相同，不能简单重复
- content 字段绝对不能包含 {{}} 占位符
- 每条 content 必须有实际使用价值，至少 200 字，详细具体
- 内容要贴合关键词
- 直接输出 JSON 数组`

  const user = `请搜索并整理与「${keyword}」相关的 30 条详细提示词。
分 3 类各 10 条：
1. 最常用 10 条（基础场景，新手必备，但要详细）
2. 最热门 10 条（近期讨论度高，进阶用法）
3. 最高评价 10 条（精品，效果最佳）

每条 content 至少 200 字，包含角色设定/任务背景/具体要求/输出格式/注意事项。
请输出 JSON 数组。`

  const raw = await callAI(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.8, jsonMode: true, maxTokens: 16000 },
  )

  const jsonStr = extractJSON(raw)
  if (!jsonStr) return []
  try {
    const arr = JSON.parse(jsonStr) as SearchedPrompt[]
    return Array.isArray(arr) ? arr.slice(0, 30) : []
  } catch {
    return []
  }
}

// ============================================
// AI 去除变量（重写为完整可直接使用的提示词）
// ============================================
export async function aiRemoveVariables(
  title: string,
  content: string,
  description?: string | null,
): Promise<{ title: string; content: string; description: string }> {
  const system = `你是一位 Prompt 重写助手。给定一个含 {{变量}} 占位符的提示词，请把它重写为**不含任何变量、可直接复制使用**的完整提示词。

【重写规则】
1. 把所有 {{变量}} 替换为具体的、合理的默认值（结合提示词语境）
2. 例如 {{主题}} → "职场成长"；{{目标人群}} → "25-35岁白领"；{{产品}} → "智能手表"
3. 保留原提示词的结构、语气、要求点
4. 输出**纯 JSON 对象**，不要任何解释

【输出格式】
{"title": "新标题（如原标题含变量则一并替换）", "content": "完整提示词正文（无变量）", "description": "一句话描述"}`

  const user = `请重写以下提示词，去除所有 {{变量}} 占位符：

【原标题】${title}
【原描述】${description || '（无）'}
【原内容】
${content}`

  const raw = await callAI(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.6, jsonMode: true, maxTokens: 2000 },
  )

  const jsonStr = extractJSON(raw)
  if (!jsonStr) {
    return {
      title: title.replace(/\{\{[^}]+\}\}/g, '示例'),
      content: content.replace(/\{\{([^}]+)\}\}/g, (_, name) => name.trim().split(/[：:]/)[0]),
      description: description || '',
    }
  }
  try {
    const result = JSON.parse(jsonStr) as { title: string; content: string; description: string }
    return {
      title: result.title || title,
      content: result.content || content,
      description: result.description || description || '',
    }
  } catch {
    return { title, content, description: description || '' }
  }
}

// ============================================
// AI 自动填充变量
// 根据提示词内容和变量名，AI 为每个变量生成一个**具体的、可直接使用的取值**
// ============================================
export type AutoFillResult = Record<string, string>

export async function aiAutoFillVariables(
  promptTitle: string,
  promptContent: string,
  promptDescription: string | null | undefined,
  variables: string[],
): Promise<AutoFillResult> {
  if (variables.length === 0) return {}

  const varList = variables.map((v, i) => `${i + 1}. {{${v}}}`).join('\n')

  const system = `你是一位创意内容生成助手。给定一个提示词模板和其中的变量列表，你需要为每个变量生成一个**具体的、可直接使用的取值**，让用户拿到填充后的提示词就能直接用。

【关键要求】
1. 取值必须是**具体内容**，不能是描述性文字、不能是占位符、不能含"请输入"等字样
2. 变量名可能包含冒号和说明文字（如 "题材：霸总/重生/复仇/甜宠/穿越"），这种情况下：
   - 冒号后的说明是供你参考的取值范围或示例
   - 你需要从中选一个，或写一个符合该范围的具体值
   - 例如 {{题材：霸总/重生/复仇/甜宠/穿越}} → 取值 "霸总"
   - 例如 {{主角设定}} → 取值 "30岁破产女总裁"
   - 例如 {{单集时长}} 分钟 → 取值 "3"
3. 简单变量名（如 {{核心主题}}）直接生成具体内容：
   - {{核心主题}} → "男人逆袭成功"
   - {{目标人群}} → "25-35岁职场女性"
   - {{产品特点}} → "轻薄便携、续航12小时"
4. 取值要贴合提示词语境，长度通常 2-30 字
5. 输出**纯 JSON 对象**，键是变量名（保留原样，含冒号也保留），值是具体取值
6. 不要输出任何解释、markdown 代码块、前后缀文字

【输出格式示例】
如果变量是 ["题材：霸总/重生/复仇/甜宠/穿越", "主角设定", "核心冲突"]，输出：
{"题材：霸总/重生/复仇/甜宠/穿越": "霸总", "主角设定": "30岁破产女总裁", "核心冲突": "前夫争夺女儿抚养权"}`

  const user = `请为以下提示词的变量生成具体取值：

【提示词标题】${promptTitle}
【提示词描述】${promptDescription || '（无）'}
【提示词内容】
${promptContent}

【需要填充的变量列表】
${varList}

请输出 JSON 对象，键是变量名（保留原样），值是具体的、可直接使用的内容。`

  const raw = await callAI(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.8, jsonMode: true, maxTokens: 2000 },
  )

  if (!raw) return {}
  const jsonStr = extractJSON(raw)
  if (!jsonStr) return {}
  try {
    const result = JSON.parse(jsonStr) as AutoFillResult
    const filtered: AutoFillResult = {}
    for (const v of variables) {
      const val = result[v]
      if (typeof val === 'string' && val.trim()) {
        filtered[v] = val.trim()
      } else if (typeof val === 'number') {
        filtered[v] = String(val)
      }
    }
    return filtered
  } catch {
    return {}
  }
}
