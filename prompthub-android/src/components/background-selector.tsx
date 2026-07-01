'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { PRESET_BACKGROUNDS, type Background } from '@/lib/prompt-types'
import { Button } from '@/components/ui/button'
import { Upload, X, ImageIcon, Check, Sparkles, Loader2 } from 'lucide-react'
import { usePromptStore } from '@/lib/prompt-store'

type Props = {
  value: Background | null
  onChange: (bg: Background | null) => void
  /** Context for AI recommendation: prompt title + content */
  aiContext?: { title: string; content: string; description?: string }
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

export function BackgroundSelector({ value, onChange, aiContext }: Props) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiReason, setAiReason] = React.useState<string | null>(null)
  const { recommendBackground } = usePromptStore()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件')
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError(`图片不能超过 5MB（当前 ${(file.size / 1024 / 1024).toFixed(2)}MB）`)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const dataUrl = await readFileAsDataURL(file)
      onChange({
        type: 'image',
        value: dataUrl,
        name: file.name,
      })
    } catch {
      setError('图片读取失败，请重试')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleClear = () => {
    onChange(null)
    setError(null)
    setAiReason(null)
  }

  const handleAIRecommend = async () => {
    if (!aiContext || (!aiContext.title.trim() && !aiContext.content.trim())) {
      setError('请先填写标题和内容，AI 才能推荐合适的背景')
      return
    }
    setAiLoading(true)
    setError(null)
    setAiReason(null)
    try {
      const result = await recommendBackground(aiContext.title, aiContext.content, aiContext.description)
      if (result) {
        if (result.background) {
          onChange(result.background)
          setAiReason(result.reason || 'AI 已推荐')
        } else if (result.recommendType === 'image' && result.imageKeyword) {
          setAiReason(`AI 建议上传图片，搜索关键词：${result.imageKeyword}`)
        } else {
          setAiReason(result.reason || 'AI 无法推荐')
        }
      } else {
        setError('AI 推荐失败，请重试')
      }
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Preview */}
      {value && (
        <div className="relative rounded-md border overflow-hidden">
          <div
            className="h-24 w-full flex items-center justify-center"
            style={{
              background: value.type === 'color' ? value.value : undefined,
              backgroundImage: value.type === 'image' ? `url(${value.value})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <span
              className={cn(
                'text-xs font-medium px-2 py-1 rounded',
                isLightBackground(value) ? 'bg-black/10 text-black' : 'bg-white/15 text-white',
              )}
            >
              {value.type === 'color' ? (value.name || value.value) : (value.name || '自定义图片')}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
            title="清除背景"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* AI recommend */}
      {aiContext && (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5 border-violet-300 text-violet-600 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-950/40"
            disabled={aiLoading}
            onClick={handleAIRecommend}
          >
            {aiLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                AI 推荐中...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                AI 智能推荐背景
              </>
            )}
          </Button>
          {aiReason && (
            <p className="text-xs text-violet-600 dark:text-violet-400 mt-1.5 flex items-start gap-1">
              <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0" />
              {aiReason}
            </p>
          )}
        </div>
      )}

      {/* Preset colors */}
      <div>
        <div className="text-xs text-muted-foreground mb-2">6 个预设纯色（从浅到深）</div>
        <div className="grid grid-cols-6 gap-2">
          {PRESET_BACKGROUNDS.map((bg) => {
            const selected = value?.type === 'color' && value.value === bg.value
            return (
              <button
                key={bg.value}
                type="button"
                onClick={() => onChange(bg)}
                title={bg.name || bg.value}
                className={cn(
                  'relative h-10 rounded-md border-2 transition-all',
                  selected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/40',
                )}
                style={{ backgroundColor: bg.value }}
              >
                {selected && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check className={cn('h-4 w-4', isLightColor(bg.value) ? 'text-black' : 'text-white')} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom upload */}
      <div>
        <div className="text-xs text-muted-foreground mb-2">自定义上传图片（不超过 5MB）</div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <>读取中...</>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              {value?.type === 'image' ? '更换图片' : '上传图片'}
            </>
          )}
        </Button>
        {error && (
          <p className="text-xs text-destructive mt-1.5">{error}</p>
        )}
        {value?.type === 'image' && (
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            {value.name || '已上传图片'}
          </p>
        )}
      </div>
    </div>
  )
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function isLightBackground(bg: Background): boolean {
  if (bg.type === 'color') return isLightColor(bg.value)
  return false
}

function isLightColor(hex: string): boolean {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return true
  const r = parseInt(m[1], 16)
  const g = parseInt(m[2], 16)
  const b = parseInt(m[3], 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.5
}

