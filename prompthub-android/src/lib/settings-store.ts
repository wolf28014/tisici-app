'use client'

import * as React from 'react'

// ============================================
// 快捷标签设置
// ============================================

export type QuickTag = {
  id: string
  name: string
  icon: string // lucide icon name
  color: 'amber' | 'pink' | 'rose' | 'violet' | 'emerald' | 'sky' | 'teal' | 'orange'
  categoryId?: string | null // 关联的分类ID（可选）
  customUrl?: string // 自定义跳转URL（可选）
}

const QUICK_TAGS_KEY = 'prompthub-quick-tags'

const DEFAULT_QUICK_TAGS: QuickTag[] = [
  { id: 'default-1', name: '电商运营', icon: 'ShoppingBag', color: 'amber', categoryId: null },
  { id: 'default-2', name: 'AI模特商拍', icon: 'Snowflake', color: 'pink', categoryId: null },
  { id: 'default-3', name: 'AI短剧制作', icon: 'Clapperboard', color: 'rose', categoryId: null },
]

export function useQuickTags() {
  const [tags, setTags] = React.useState<QuickTag[]>(DEFAULT_QUICK_TAGS)
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(QUICK_TAGS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setTags(parsed)
        }
      }
    } catch {
      // ignore
    }
    setLoaded(true)
  }, [])

  const saveTags = React.useCallback((newTags: QuickTag[]) => {
    setTags(newTags)
    try {
      localStorage.setItem(QUICK_TAGS_KEY, JSON.stringify(newTags))
    } catch {
      // ignore
    }
  }, [])

  return { tags, saveTags, loaded }
}

// ============================================
// API 配置设置
// ============================================

export type ApiConfig = {
  id: string
  name: string // 配置名称（如"OpenAI"、"Anthropic"、"Z.ai"）
  provider: 'openai' | 'anthropic' | 'zai' | 'azure' | 'custom'
  baseUrl: string // API 基础 URL
  apiKey: string // API Key
  model: string // 默认模型（如 gpt-4, claude-3-opus）
  enabled: boolean
  isDefault: boolean
}

const API_CONFIGS_KEY = 'prompthub-api-configs'

const DEFAULT_API_CONFIGS: ApiConfig[] = [
  {
    id: 'default-zai',
    name: 'Z.ai（默认）',
    provider: 'zai',
    baseUrl: '',
    apiKey: '',
    model: 'glm-4.6',
    enabled: true,
    isDefault: true,
  },
]

export function useApiConfigs() {
  const [configs, setConfigs] = React.useState<ApiConfig[]>(DEFAULT_API_CONFIGS)
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(API_CONFIGS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConfigs(parsed)
        }
      }
    } catch {
      // ignore
    }
    setLoaded(true)
  }, [])

  const saveConfigs = React.useCallback((newConfigs: ApiConfig[]) => {
    setConfigs(newConfigs)
    try {
      localStorage.setItem(API_CONFIGS_KEY, JSON.stringify(newConfigs))
    } catch {
      // ignore
    }
  }, [])

  const getDefaultConfig = React.useCallback(() => {
    return configs.find((c) => c.enabled && c.isDefault) || configs.find((c) => c.enabled) || null
  }, [configs])

  return { configs, saveConfigs, loaded, getDefaultConfig }
}

// ============================================
// Provider 预设
// ============================================

export const API_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  anthropic: {
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  },
  zai: {
    name: 'Z.ai',
    baseUrl: '',
    models: ['glm-4.6', 'glm-4-plus', 'glm-4-flash'],
  },
  azure: {
    name: 'Azure OpenAI',
    baseUrl: 'https://你的资源名.openai.azure.com',
    models: ['gpt-4o', 'gpt-4', 'gpt-35-turbo'],
  },
  custom: {
    name: '自定义',
    baseUrl: '',
    models: [],
  },
} as const

export type ProviderKey = keyof typeof API_PROVIDERS
