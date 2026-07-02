'use client'

import * as React from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Copy, Pencil, Trash2, Star, Pin, Check, Wand2, Clock, User, Hash, Share2,
  History, Sparkles, Loader2,
} from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { usePromptStore } from '@/lib/prompt-store'
import {
  type Prompt, getColorClass, extractVariables, fillVariables, copyToClipboard,
} from '@/lib/prompt-types'
import { aiAutoFillVariables } from '@/lib/client/ai'
import { isAIConfigured } from '@/lib/client/ai'
import { useToast } from '@/hooks/use-toast'
import { CategoryIcon } from '@/components/category-icon'
import { StarRating } from '@/components/star-rating'
import { SimilarPrompts } from '@/components/similar-prompts'
import { VersionHistoryDialog } from '@/components/version-history-dialog'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

function isLightColor(hex: string): boolean {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return true
  const r = parseInt(m[1], 16)
  const g = parseInt(m[2], 16)
  const b = parseInt(m[3], 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.5
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (p: Prompt) => void
  onShare: (p: Prompt) => void
}

export function PromptDetailSheet({ open, onOpenChange, onEdit, onShare }: Props) {
  const prompt = usePromptStore((s) => s.selectedPrompt)
  const toggleFavorite = usePromptStore((s) => s.toggleFavorite)
  const togglePin = usePromptStore((s) => s.togglePin)
  const incrementUsage = usePromptStore((s) => s.incrementUsage)
  const deletePrompt = usePromptStore((s) => s.deletePrompt)
  const selectPrompt = usePromptStore((s) => s.selectPrompt)
  const setRating = usePromptStore((s) => s.setRating)
  const { toast } = useToast()

  const [mode, setMode] = React.useState<'view' | 'use'>('view')
  const [values, setValues] = React.useState<Record<string, string>>({})
  const [copied, setCopied] = React.useState(false)
  const [showVersions, setShowVersions] = React.useState(false)
  const [aiFilling, setAiFilling] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setMode('view')
      setValues({})
      setCopied(false)
      setAiFilling(false)
    }
  }, [open, prompt?.id])

  if (!prompt) return null

  const variables = extractVariables(prompt.content)
  const filledContent = fillVariables(prompt.content, values)
  const color = getColorClass(prompt.category?.color)

  const handleCopy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast({ title: `已复制${label}`, description: '可直接粘贴到 AI 对话框使用' })
      if (label === '提示词') {
        await incrementUsage(prompt.id)
      }
    } else {
      toast({ title: '复制失败', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    const ok = await deletePrompt(prompt.id)
    if (ok) {
      toast({ title: '提示词已删除' })
      selectPrompt(null)
      onOpenChange(false)
    }
  }

  // AI 自动填充变量
  const handleAiAutoFill = async () => {
    if (!isAIConfigured()) {
      toast({
        title: '请先配置 AI API Key',
        description: '设置 → AI API 配置',
        variant: 'destructive',
      })
      return
    }
    if (variables.length === 0) {
      toast({ title: '该提示词没有变量需要填充' })
      return
    }
    setAiFilling(true)
    // 立即切换到 use 模式，让用户看到填充效果
    if (mode !== 'use') setMode('use')
    try {
      const result = await aiAutoFillVariables(
        prompt.title,
        prompt.content,
        prompt.description,
        variables,
      )
      const filledCount = Object.keys(result).length
      if (filledCount === 0) {
        toast({
          title: 'AI 未能生成填充内容',
          description: '请检查 API Key 是否有效，或重试',
          variant: 'destructive',
        })
      } else {
        setValues(result)
        // 列出已填充的变量，方便用户确认
        const sample = Object.entries(result).slice(0, 2)
          .map(([k, v]) => `${k}=${v.length > 12 ? v.slice(0, 12) + '...' : v}`)
          .join('，')
        toast({
          title: `✅ AI 已填充 ${filledCount}/${variables.length} 个变量`,
          description: filledCount <= 2 ? `已填入：${sample}` : `前 2 个：${sample}...`,
        })
      }
    } catch (e) {
      toast({
        title: 'AI 填充失败',
        description: (e as Error).message,
        variant: 'destructive',
      })
    } finally {
      setAiFilling(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-3 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <SheetTitle className="text-xl leading-tight flex items-start gap-2">
                {prompt.isPinned && <Pin className="h-4 w-4 text-amber-500 flex-shrink-0 mt-1" />}
                <span className="break-words">{prompt.title}</span>
              </SheetTitle>
              {prompt.description && (
                <SheetDescription className="text-sm leading-relaxed">
                  {prompt.description}
                </SheetDescription>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {prompt.category && (
                  <Badge variant="outline" className={`gap-1 ${color.text} ${color.border}`}>
                    <CategoryIcon name={prompt.category.icon} className="h-3 w-3" />
                    {prompt.category.name}
                  </Badge>
                )}
                {prompt.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                {prompt.author && (
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" /> {prompt.author}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Hash className="h-3 w-3" /> 使用 {prompt.usageCount} 次
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {format(new Date(prompt.createdAt), 'yyyy-MM-dd')}
                </span>
              </div>
              {/* Rating */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">我的评分：</span>
                <StarRating
                  value={prompt.rating}
                  onChange={(v) => setRating(prompt.id, v)}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Action bar */}
        <div className="px-6 py-3 border-b bg-muted/30">
          <div className="flex flex-wrap items-center gap-2">
            {/* AI 自动填充变量 - 醒目主色按钮 */}
            <Button
              size="sm"
              onClick={handleAiAutoFill}
              disabled={aiFilling || variables.length === 0}
              className="gap-1.5 bg-violet-500 hover:bg-violet-600 text-white"
              title={variables.length === 0 ? '该提示词没有变量' : 'AI 推断变量取值'}
            >
              {aiFilling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {aiFilling ? 'AI 填充中...' : 'AI 自动填充'}
            </Button>
            <Button
              size="sm"
              variant={mode === 'use' ? 'default' : 'outline'}
              onClick={() => setMode(mode === 'use' ? 'view' : 'use')}
              className="gap-1.5"
            >
              <Wand2 className="h-3.5 w-3.5" />
              {mode === 'use' ? '退出填充' : '填充变量使用'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopy(mode === 'use' ? filledContent : prompt.content, '提示词')}
              className="gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? '已复制' : '复制'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleFavorite(prompt.id)}
              className="gap-1.5"
            >
              <Star className={`h-3.5 w-3.5 ${prompt.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
              {prompt.isFavorite ? '已收藏' : '收藏'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => togglePin(prompt.id)}
              className="gap-1.5"
            >
              <Pin className={`h-3.5 w-3.5 ${prompt.isPinned ? 'fill-amber-500 text-amber-500' : ''}`} />
              {prompt.isPinned ? '已置顶' : '置顶'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onShare(prompt)}
              className="gap-1.5"
            >
              <Share2 className="h-3.5 w-3.5" />
              分享
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowVersions(true)}
              className="gap-1.5"
            >
              <History className="h-3.5 w-3.5" />
              版本历史
            </Button>
            <div className="ml-auto flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onEdit(prompt)
                  onOpenChange(false)
                }}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" /> 编辑
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> 删除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>删除提示词？</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作无法撤销。确定删除「{prompt.title}」吗？
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {mode === 'use' && variables.length > 0 && (
            <div className="mb-4 space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-violet-500" />
                <h4 className="text-sm font-medium">填充变量</h4>
                <span className="text-xs text-muted-foreground">
                  ({variables.length} 个变量，留空则保留占位符)
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {variables.map((v) => (
                  <div key={v} className="space-y-1.5">
                    <Label htmlFor={`var-${v}`} className="text-xs font-mono">{`{{${v}}}`}</Label>
                    <Textarea
                      id={`var-${v}`}
                      placeholder={`输入 ${v}`}
                      value={values[v] || ''}
                      onChange={(e) => setValues({ ...values, [v]: e.target.value })}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {mode === 'use' && variables.length === 0 && (
            <div className="mb-4 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              该提示词没有变量占位符，可直接复制使用。
            </div>
          )}

          {/* 提示词内容（默认显示完整内容） */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                {mode === 'use' ? '填充后的提示词' : '提示词内容'}
              </h4>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => handleCopy(mode === 'use' ? filledContent : prompt.content, '提示词')}
              >
                <Copy className="h-3 w-3" /> 复制
              </Button>
            </div>
            <pre className="whitespace-pre-wrap break-words rounded-lg border bg-muted/30 p-4 text-sm font-mono leading-relaxed">
              {mode === 'use' ? filledContent : prompt.content}
            </pre>
          </div>

          {/* AI Similar prompts */}
          <SimilarPrompts
            promptId={prompt.id}
            onSelectPrompt={(p) => selectPrompt(p)}
          />
        </div>
      </SheetContent>

      {/* Version history dialog */}
      <VersionHistoryDialog
        open={showVersions}
        onOpenChange={setShowVersions}
        promptId={prompt.id}
      />
    </Sheet>
  )
}
