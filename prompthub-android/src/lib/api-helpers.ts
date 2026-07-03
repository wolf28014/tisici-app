'use client'

// 在 Capacitor 版本中，AI 调用直接走客户端 fetch（见 src/lib/client/ai.ts）
// 这里仅保留空实现以兼容旧组件 import
export function getApiHeaders(): Record<string, string> {
  return {}
}

export async function fetchWithAIConfig(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  return fetch(url, { ...options, headers })
}
