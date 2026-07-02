'use client'

import * as React from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { X, Plus, Sparkles, Wand2 } from 'lucide-react'
import { usePromptStore } from '@/lib/prompt-store'
import type { Prompt } from '@/lib/prompt-types'
import { extractVariables } from '@/lib/prompt-types'
import { useToast } from '@/hooks/use-toast'
import { CategoryIcon, ICON_NAMES } from '@/components/category-icon'
import { cn } from '@/lib/utils'

type PrefillData = {
  title: string
  content: string
  description: string
  tags: string[]
  author: string
} | null

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Prompt | null
  // 兼容旧 prop
  editPrompt?: Prompt | null
  prefillData?: PrefillData
}

const COLOR_OPTIONS = ['rose', 'emerald', 'amber', 'sky', 'violet', 'teal', 'pink', 'slate']

export function PromptFormDialog({ open, onOpenChange, editing, editPrompt, prefillData }: Props) {
  const effectiveEdit = editing || editPrompt
  const isEdit = !!effectiveEdit && !!effectiveEdit.id
  const { categories, collections, createPrompt, updatePrompt, tags: allTags } = usePromptStore()
  const { toast } = useToast()

  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [categoryId, setCategoryId] = React.useState<string>('none')
  const [collectionId, setCollectionId] = React.useState<string>('none')
  const [tagsInput, setTagsInput] = React.useState('')
  const [tags, setTags] = React.useState<string[]>([])
  const [author, setAuthor] = React.useState('匿名')
  const [isPinned, setIsPinned] = React.useState(false)
  const [isFavorite, setIsFavorite] = React.useState(false)

  // category creation
  const [showNewCat, setShowNewCat] = React.useState(false)
  const [newCatName, setNewCatName] = React.useState('')
  const [newCatIcon, setNewCatIcon] = React.useState('Sparkles')
  const [newCatColor, setNewCatColor] = React.useState('violet')
  const [newCatParent, setNewCatParent] = React.useState<string>('none')

  // Common tags (top 12 by usage) - exclude already selected
  const commonTags = React.useMemo(() => {
    return allTags
      .filter((t) => !tags.includes(t.name))
      .slice(0, 12)
      .map((t) => t.name)
  }, [allTags, tags])

  // Common categories (top 8 by total prompt count, including children)
  const commonCategories = React.useMemo(() => {
    const flat: Array<{ id: string; name: string; icon: string | null; color: string | null; count: number; parentName?: string }> = []
    for (const c of categories) {
      const totalCount = c.promptCount + (c.children?.reduce((s, ch) => s + ch.promptCount, 0) || 0)
      flat.push({ id: c.id, name: c.name, icon: c.icon, color: c.color, count: totalCount })
      for (const sub of c.children || []) {
        flat.push({ id: sub.id, name: sub.name, icon: sub.icon, color: sub.color, count: sub.promptCount, parentName: c.name })
      }
    }
    return flat.sort((a, b) => b.count - a.count).slice(0, 8)
  }, [categories])

  // 从 sessionStorage 读取 prefillData（供 AI 生成后跳转使用）
  const [sessionPrefill, setSessionPrefill] = React.useState<PrefillData>(null)
  React.useEffect(() => {
    if (open) {
      try {
        const raw = sessionStorage.getItem('prompthub_prefill')
        if (raw) {
          setSessionPrefill(JSON.parse(raw))
          sessionStorage.removeItem('prompthub_prefill')
        }
      } catch {}
    } else {
      setSessionPrefill(null)
    }
  }, [open])

  const effectivePrefill = prefillData || sessionPrefill

  React.useEffect(() => {
    if (!open) return
    if (effectiveEdit && effectiveEdit.id) {
      setTitle(effectiveEdit.title)
      setContent(effectiveEdit.content)
      setDescription(effectiveEdit.description || '')
      setCategoryId(effectiveEdit.categoryId || 'none')
      setCollectionId(effectiveEdit.collectionId || 'none')
      setTags(effectiveEdit.tags || [])
      setTagsInput('')
      setAuthor(effectiveEdit.author || '匿名')
      setIsPinned(effectiveEdit.isPinned)
      setIsFavorite(effectiveEdit.isFavorite)
    } else if (effectivePrefill) {
      setTitle(effectivePrefill.title)
      setContent(effectivePrefill.content)
      setDescription(effectivePrefill.description || '')
      setCategoryId('none')
      setCollectionId('none')
      setTags(effectivePrefill.tags || [])
      setTagsInput('')
      setAuthor(effectivePrefill.author || '匿名')
      setIsPinned(false)
      setIsFavorite(false)
    } else {
      // 新建空白模式
      setTitle('')
      setContent('')
      setDescription('')
      setCategoryId('none')
      setCollectionId('none')
      setTags([])
      setTagsInput('')
      setAuthor('匿名')
      setIsPinned(false)
      setIsFavorite(false)
    }
    setShowNewCat(false)
    setNewCatName('')
    setNewCatIcon('Sparkles')
    setNewCatColor('violet')
    setNewCatParent('none')
  }, [open, effectiveEdit, effectivePrefill])

  const variables = React.useMemo(() => extractVariables(content), [content])

  const addTag = () => {
    const t = tagsInput.trim()
    if (!t) return
    if (tags.includes(t)) {
      setTagsInput('')
      return
    }
    setTags([...tags, t])
    setTagsInput('')
  }

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t))

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return
    try {
      const { createCategory } = await import('@/lib/client/db')
      const cat = await createCategory({
        name: newCatName.trim(),
        icon: newCatIcon,
        color: newCatColor,
        parentId: newCatParent === 'none' ? null : newCatParent,
      })
      await usePromptStore.getState().fetchCategories()
      setCategoryId(cat.id)
      setShowNewCat(false)
      setNewCatName('')
      setNewCatParent('none')
      toast({ title: '分类已创建', description: cat.name })
    } catch (e) {
      toast({ title: '创建分类失败', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: '请填写标题和内容', variant: 'destructive' })
      return
    }
    const payload = {
      title: title.trim(),
      content: content.trim(),
      description: description.trim() || undefined,
      categoryId: categoryId === 'none' ? null : categoryId,
      collectionId: collectionId === 'none' ? null : collectionId,
      tags,
      author: author.trim() || '匿名',
      isPinned,
      isFavorite,
    }

    if (isEdit && effectiveEdit) {
      const ok = await updatePrompt(effectiveEdit.id, payload)
      if (ok) {
        toast({ title: '提示词已更新', description: title })
        onOpenChange(false)
      } else {
        toast({ title: '更新失败', variant: 'destructive' })
      }
    } else {
      const ok = await createPrompt(payload)
      if (ok) {
        toast({ title: '提示词已创建', description: title })
        onOpenChange(false)
      } else {
        toast({ title: '创建失败', variant: 'destructive' })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-violet-500" />
            {isEdit ? '编辑提示词' : '新建提示词'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? '修改提示词内容、分类与标签' : '创建一个新的提示词，支持 {{变量}} 占位符'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">标题 <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              placeholder="例如：爆款小红书种草文案"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="desc">简短描述</Label>
            <Input
              id="desc"
              placeholder="一句话说明这个提示词的用途"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>分类</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowNewCat(!showNewCat)}
              >
                {showNewCat ? '取消' : '+ 新建分类'}
              </Button>
            </div>
            {!showNewCat ? (
              <>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未分类</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="inline-flex items-center gap-2">
                          <CategoryIcon name={c.icon} className="h-3.5 w-3.5" />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                    {categories.map((c) =>
                      c.children?.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          <span className="inline-flex items-center gap-2">
                            <CategoryIcon name={sub.icon} className="h-3.5 w-3.5" />
                            <span className="text-muted-foreground">{c.name} /</span> {sub.name}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {commonCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-xs text-muted-foreground">常用：</span>
                    {commonCategories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategoryId(c.id)}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors',
                          categoryId === c.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/40 hover:bg-muted border-transparent',
                        )}
                      >
                        <CategoryIcon name={c.icon} className="h-3 w-3" />
                        {c.parentName ? `${c.parentName}/${c.name}` : c.name}
                        <span className={cn(
                          'text-[10px]',
                          categoryId === c.id ? 'text-primary-foreground/70' : 'text-muted-foreground',
                        )}>
                          {c.count}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                <Input
                  placeholder="分类名称"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
                <div className="space-y-1">
                  <Label className="text-xs">父级分类（留空则作为顶级分类）</Label>
                  <Select value={newCatParent} onValueChange={setNewCatParent}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="无（顶级分类）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无（顶级分类）</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="inline-flex items-center gap-2">
                            <CategoryIcon name={c.icon} className="h-3.5 w-3.5" />
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">图标</Label>
                    <Select value={newCatIcon} onValueChange={setNewCatIcon}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ICON_NAMES.map((n) => (
                          <SelectItem key={n} value={n}>
                            <span className="inline-flex items-center gap-2">
                              <CategoryIcon name={n} className="h-3.5 w-3.5" />
                              {n}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">颜色</Label>
                    <Select value={newCatColor} onValueChange={setNewCatColor}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOR_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            <span className="inline-flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full bg-${c}-500`} />
                              {c}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateCategory}
                  disabled={!newCatName.trim()}
                >
                  创建分类
                </Button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">提示词内容 <span className="text-destructive">*</span></Label>
              {variables.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  识别到 {variables.length} 个变量
                </span>
              )}
            </div>
            <Textarea
              id="content"
              placeholder={'支持 {{变量}} 占位，例如：\n请为 {{主题}} 写一篇关于 {{字数}} 字的文章'}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
            {variables.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {variables.map((v) => (
                  <Badge key={v} variant="secondary" className="text-xs font-mono">
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>标签</Label>
            <div className="flex gap-2">
              <Input
                placeholder="输入标签后回车"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="ml-1 rounded-full hover:bg-background/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {commonTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-muted-foreground">常用：</span>
                {commonTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTags([...tags, t])}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted/40 hover:bg-muted border border-transparent transition-colors"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Author */}
          <div className="space-y-2">
            <Label htmlFor="author">作者</Label>
            <Input
              id="author"
              placeholder="作者署名"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>

          {/* Collection */}
          {collections.length > 0 && (
            <div className="space-y-2">
              <Label>收藏夹分组</Label>
              <Select value={collectionId} onValueChange={setCollectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择收藏夹（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无（不属于任何收藏夹）</SelectItem>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', `bg-${c.color || 'violet'}-500`)} />
                        {c.name}
                        <span className="text-xs text-muted-foreground">({c.promptCount})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="cursor-pointer">置顶</Label>
                <p className="text-xs text-muted-foreground">在列表中优先展示</p>
              </div>
              <Switch checked={isPinned} onCheckedChange={setIsPinned} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="cursor-pointer">收藏</Label>
                <p className="text-xs text-muted-foreground">加入收藏夹</p>
              </div>
              <Switch checked={isFavorite} onCheckedChange={setIsFavorite} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            {isEdit ? '保存修改' : '创建提示词'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
