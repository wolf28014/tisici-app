'use client'

import * as React from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2, Sparkles, Check, Flame, Star, TrendingUp } from 'lucide-react'
import { aiSearchPromptsByKeyword, type SearchedPrompt } from '@/lib/client/ai'
import { usePromptStore } from '@/lib/prompt-store'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { createCategory, queryCategories } from '@/lib/client/db'

const PRESET_CATEGORIES = [
  '写作创作', '编程开发', '学习辅导', '生活日常', '工作效率',
  '电商运营', 'AI模特商拍', 'AI短剧制作', '其他',
]

const CATEGORY_COLORS: Record<string, string> = {
  '写作创作': 'rose',
  '编程开发': 'emerald',
  '学习辅导': 'sky',
  '生活日常': 'teal',
  '工作效率': 'violet',
  '电商运营': 'amber',
  'AI模特商拍': 'pink',
  'AI短剧制作': 'rose',
  '其他': 'slate',
}

const SEARCH_TYPE_ICON = {
  '常用': TrendingUp,
  '热门': Flame,
  '高评价': Star,
}

const SEARCH_TYPE_COLOR = {
  '常用': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
  '热门': 'text-rose-600 bg-rose-50 dark:bg-rose-950/30',
  '高评价': 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AISearchDialog({ open, onOpenChange }: Props) {
  const [keyword, setKeyword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [results, setResults] = React.useState<SearchedPrompt[]>([])
  const [saving, setSaving] = React.useState(false)
  const [savedCount, setSavedCount] = React.useState(0)
  const { refreshAll } = usePromptStore()
  const { toast } = useToast()

  React.useEffect(() => {
    if (open) {
      setKeyword('')
      setResults([])
      setSavedCount(0)
    }
  }, [open])

  const handleSearch = async () => {
    if (!keyword.trim()) {
      toast({ title: '请输入搜索关键词', variant: 'destructive' })
      return
    }
    setLoading(true)
    setResults([])
    setSavedCount(0)
    try {
      const found = await aiSearchPromptsByKeyword(keyword.trim())
      if (found.length === 0) {
        toast({ title: '未找到相关提示词', description: '请尝试其他关键词', variant: 'destructive' })
      } else {
        setResults(found)
        toast({
          title: `找到 ${found.length} 条提示词`,
          description: `常用 ${found.filter(f => f.searchType === '常用').length} / 热门 ${found.filter(f => f.searchType === '热门').length} / 高评价 ${found.filter(f => f.searchType === '高评价').length}`,
        })
      }
    } catch (e) {
      toast({
        title: '搜索失败',
        description: (e as Error).message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAll = async () => {
    if (results.length === 0) return
    setSaving(true)
    try {
      // 预先获取/创建分类
      const existingCats = await queryCategories()
      const catMap = new Map<string, string>()
      const findCat = (list: any[]): any => {
        for (const c of list) {
          if (PRESET_CATEGORIES.includes(c.name)) catMap.set(c.name, c.id)
          if (c.children) findCat(c.children)
        }
      }
      findCat(existingCats)
      // 创建缺失的分类
      for (const catName of PRESET_CATEGORIES) {
        if (!catMap.has(catName)) {
          const cat = await createCategory({
            name: catName,
            description: `${catName} 相关提示词`,
            icon: 'Sparkles',
            color: CATEGORY_COLORS[catName],
          })
          catMap.set(catName, cat.id)
        }
      }

      const { createPrompt } = await import('@/lib/client/db')
      let count = 0
      for (const r of results) {
        const catName = r.suggestedCategory && PRESET_CATEGORIES.includes(r.suggestedCategory)
          ? r.suggestedCategory
          : '其他'
        await createPrompt({
          title: r.title,
          content: r.content,
          description: r.description,
          categoryId: catMap.get(catName) || null,
          tags: [keyword.trim(), 'AI搜索', ...(r.tags || [])],
          author: 'AI 搜索',
          source: `AI 搜索 - ${r.searchType || '常用'}`,
        })
        count++
        setSavedCount(count)
      }
      await refreshAll()
      toast({
        title: `已保存 ${count} 条提示词`,
        description: `关键词「${keyword}」的搜索结果已入库`,
      })
      onOpenChange(false)
    } catch (e) {
      toast({
        title: '保存失败',
        description: (e as Error).message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // 按类型分组
  const grouped = React.useMemo(() => {
    const g: Record<string, SearchedPrompt[]> = { '常用': [], '热门': [], '高评价': [] }
    for (const r of results) {
      const t = r.searchType || '常用'
      if (g[t]) g[t].push(r)
    }
    return g
  }, [results])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
              <Search className="w-4 h-4" />
            </div>
            <span>AI 搜索提示词</span>
          </DialogTitle>
          <DialogDescription>
            输入关键词（如 codex、小红书、Python），AI 从全网搜索 30 条相关提示词，分「常用 10 / 热门 10 / 高评价 10」三类
          </DialogDescription>
        </DialogHeader>

        {/* 搜索栏 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="输入关键词，如 codex、小红书、Python..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="pl-9"
              onKeyDown={e => {
                if (e.key === 'Enter' && !loading) handleSearch()
              }}
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={loading || !keyword.trim()}
            className="bg-violet-500 hover:bg-violet-600"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            {loading ? '搜索中...' : '搜索'}
          </Button>
        </div>

        {/* 结果区 */}
        <div className="flex-1 overflow-y-auto">
          {loading && results.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-violet-500" />
              <p className="text-sm">AI 正在搜索，约 10-20 秒...</p>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">输入关键词开始搜索</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {['codex', '小红书', 'Python', 'Midjourney', '简历优化', '短剧'].map(kw => (
                  <button
                    key={kw}
                    onClick={() => setKeyword(kw)}
                    className="px-3 py-1 rounded-full bg-muted text-xs hover:bg-muted/70 touch-feedback"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              {(['常用', '热门', '高评价'] as const).map(type => {
                const items = grouped[type]
                if (items.length === 0) return null
                const Icon = SEARCH_TYPE_ICON[type]
                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', SEARCH_TYPE_COLOR[type])}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-sm font-bold">
                        {type === '常用' ? '最常用 10 条' : type === '热门' ? '最热门 10 条' : '最高评价 10 条'}
                      </h4>
                      <Badge variant="secondary" className="text-[10px] h-5">{items.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {items.map((r, i) => (
                        <div
                          key={`${type}-${i}`}
                          className="rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-colors"
                        >
                          <div className="flex items-start gap-2 mb-1">
                            <h5 className="font-bold text-sm flex-1">{r.title}</h5>
                            <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                              {r.suggestedCategory}
                            </Badge>
                          </div>
                          {r.description && (
                            <p className="text-xs text-muted-foreground mb-2">{r.description}</p>
                          )}
                          <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto bg-muted/30 p-2 rounded">
                            {r.content}
                          </pre>
                          {r.tags && r.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {r.tags.slice(0, 4).map(t => (
                                <Badge key={t} variant="secondary" className="text-[9px] h-4 px-1.5">
                                  #{t}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        {results.length > 0 && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
            <Button
              onClick={handleSaveAll}
              disabled={saving}
              className="bg-violet-500 hover:bg-violet-600"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" />保存中 {savedCount}/{results.length}</>
              ) : (
                <><Check className="w-4 h-4 mr-1" />全部保存到提示词库</>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
