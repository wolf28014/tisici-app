'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, ArrowRight } from 'lucide-react'
import { usePromptStore } from '@/lib/prompt-store'
import { useToast } from '@/hooks/use-toast'
import { getColorClass, type Prompt } from '@/lib/prompt-types'
import { CategoryIcon } from '@/components/category-icon'
import { cn } from '@/lib/utils'

type SimilarPrompt = Prompt & { reason: string; score: number }

type Props = {
  promptId: string
  onSelectPrompt: (p: Prompt) => void
}

export function SimilarPrompts({ promptId, onSelectPrompt }: Props) {
  const { findSimilar } = usePromptStore()
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(false)
  const [similar, setSimilar] = React.useState<SimilarPrompt[]>([])
  const [loaded, setLoaded] = React.useState(false)

  const handleFind = async () => {
    setLoading(true)
    setSimilar([])
    try {
      const result = await findSimilar(promptId)
      if (result) {
        setSimilar(result)
        setLoaded(true)
        if (result.length === 0) {
          toast({ title: '未找到相似提示词' })
        }
      } else {
        toast({ title: '推荐失败，请重试', variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-violet-500" />
          相似提示词推荐
        </h4>
        {!loaded && !loading && (
          <Button size="sm" variant="outline" onClick={handleFind} className="h-7 text-xs gap-1">
            <Sparkles className="h-3 w-3" />
            AI 查找相似
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          AI 正在分析相似度...
        </div>
      )}

      {!loading && loaded && similar.length === 0 && (
        <div className="text-sm text-muted-foreground py-2">未找到相似提示词</div>
      )}

      {!loading && similar.length > 0 && (
        <div className="space-y-2">
          {similar.map((p) => {
            const color = getColorClass(p.category?.color)
            return (
              <button
                key={p.id}
                onClick={() => onSelectPrompt(p)}
                className={cn(
                  'w-full flex items-start gap-2 p-2 rounded-md border bg-card hover:border-primary/40 hover:shadow-sm transition-all text-left',
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {p.category && (
                      <Badge variant="outline" className={`gap-1 text-[10px] ${color.text} ${color.border}`}>
                        <CategoryIcon name={p.category.icon} className="h-2.5 w-2.5" />
                        {p.category.parent ? p.category.parent.name : p.category.name}
                      </Badge>
                    )}
                    <span className="text-[10px] text-violet-600 dark:text-violet-400">{p.reason}</span>
                  </div>
                  <div className="text-sm font-medium truncate">{p.title}</div>
                  {p.description && (
                    <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                  )}
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-1" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
