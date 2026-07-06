import ZAI from 'z-ai-web-dev-sdk'
import type { NextRequest } from 'next/server'

// ============================================
// AI 配置类型
// ============================================
export type AIConfig = {
  apiKey?: string
  baseUrl?: string
  model?: string
  provider?: string
}

// ============================================
// 从请求头读取 API 配置
// ============================================
export function getAIConfigFromRequest(req: NextRequest): AIConfig {
  return {
    apiKey: req.headers.get('x-api-key') || undefined,
    baseUrl: req.headers.get('x-api-base-url') || undefined,
    model: req.headers.get('x-api-model') || undefined,
    provider: req.headers.get('x-api-provider') || undefined,
  }
}

// ============================================
// 创建 AI 客户端
// ============================================
export async function createAIClient(config?: AIConfig) {
  // 如果有自定义 API Key，使用自定义配置
  if (config?.apiKey) {
    // Z.ai SDK 支持通过环境变量或配置传入 API Key
    // 这里我们直接创建实例，SDK 会自动处理
    if (config.provider === 'zai' || !config.provider) {
      // Z.ai: 如果有 API Key，设置环境变量
      if (config.apiKey) {
        process.env.ZAI_API_KEY = config.apiKey
      }
      if (config.baseUrl) {
        process.env.ZAI_BASE_URL = config.baseUrl
      }
    }
    // 对于其他 provider（OpenAI/Anthropic 等），也通过环境变量传递
    // SDK 会自动读取
  }

  // 创建 ZAI 实例（SDK 会自动读取环境变量）
  const zai = await ZAI.create()
  return zai
}

// ============================================
// 调用 AI 对话（统一接口）
// ============================================
export async function callAI(
  config: AIConfig | undefined,
  messages: Array<{ role: string; content: string }>,
  options?: { thinking?: 'enabled' | 'disabled' }
): Promise<string> {
  const zai = await createAIClient(config)

  const completion = await zai.chat.completions.create({
    messages: messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    thinking: options?.thinking ? { type: options.thinking } : { type: 'disabled' },
  })

  return completion.choices[0]?.message?.content || ''
}
