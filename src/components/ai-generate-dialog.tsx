'use client'

import * as React from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, Check, Wand2 } from 'lucide-react'
import { usePromptStore } from '@/lib/prompt-store'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (generated: {
    title: string
    description: string
    content: string
    tags: string[]
    suggestedCategory: string
  }) => void
}

const STYLE_OPTIONS = [
  { value: 'detailed', label: '详细版', desc: '完整背景、步骤、输出格式' },
  { value: 'concise', label: '简洁版', desc: '精炼直接，只保留核心' },
  { value: 'creative', label: '创意版', desc: '角色扮演、情境化表达' },
]

const EXAMPLE_PROMPTS = [
  '帮我写一个小红书种草文案的提示词',
  '生成一个代码 review 的提示词',
  '帮我做一个男装羽绒服商品主图的 AI 提示词',
  '生成一个短剧剧本开头的提示词',
  '帮我写一个电商客服催付话术的提示词',
]

export function AIGenerateDialog({ open, onOpenChange, onApply }: Props) {
  const { generatePrompt } = usePromptStore()
  const { toast } = useToast()

  const [description, setDescription] = React.useState('')
  const [style, setStyle] = React.useState<'detailed' | 'concise' | 'creative'>('detailed')
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<{
    title: string
    description: string
    content: string
    tags: string[]
    suggestedCategory: string
  } | null>(null)

  React.useEffect(() => {
    if (open) {
      setDescription('')
      setResult(null)
      setStyle('detailed')
    }
  }, [open])

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast({ title: '请描述你想要的提示词', variant: 'destructive' })
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const generated = await generatePrompt(description.trim(), style)
      if (generated) {
        setResult(generated)
        toast({ title: '生成成功', description: generated.title })
      } else {
        toast({ title: '生成失败，请重试', variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (!result) return
    onApply(result)
    onOpenChange(false)
  }

  const handleExample = (ex: string) => {
    setDescription(ex)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-violet-500" />
            AI 自动生成提示词
          </DialogTitle>
          <DialogDescription>
            描述你想要的提示词用途，AI 自动生成完整的专业提示词
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Description input */}
          <div className="space-y-2">
            <Label>描述你想要的提示词 <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder="例如：帮我写一个生成电商商品详情页文案的提示词，需要包含卖点提炼、使用场景、FAQ"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Style select */}
          <div className="space-y-2">
            <Label>生成风格</Label>
            <Select value={style} onValueChange={(v) => setStyle(v as typeof style)} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <span className="inline-flex items-center gap-2">
                      <span className="font-medium">{s.label}</span>
                      <span className="text-xs text-muted-foreground">— {s.desc}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Examples */}
          {!result && !loading && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">不知道怎么描述？试试这些：</Label>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_PROMPTS.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => handleExample(ex)}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted/40 hover:bg-muted border border-transparent transition-colors text-left"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={loading || !description.trim()}
            className="w-full gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                AI 生成中...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {result ? '重新生成' : '生成提示词'}
              </>
            )}
          </Button>

          {/* Result */}
          {result && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <Check className="h-4 w-4" />
                生成成功
              </div>

              <div className="space-y-1">
                <Label className="text-xs">标题</Label>
                <div className="text-sm font-medium">{result.title}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">描述</Label>
                <div className="text-sm text-muted-foreground">{result.description}</div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">建议分类</Label>
                <Badge variant="outline">{result.suggestedCategory}</Badge>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">标签</Label>
                <div className="flex flex-wrap gap-1.5">
                  {result.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">提示词内容</Label>
                <pre className="whitespace-pre-wrap break-words rounded bg-background p-3 text-xs font-mono max-h-60 overflow-y-auto border">
                  {result.content}
                </pre>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          {result && (
            <Button onClick={handleApply} className="gap-1.5">
              <Check className="h-4 w-4" />
              应用到表单
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
