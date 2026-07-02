'use client'

import * as React from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { X, Plus, Tag as TagIcon, FolderPlus, Trash2, Check } from 'lucide-react'
import { usePromptStore } from '@/lib/prompt-store'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: string[]
}

export function BatchEditDialog({ open, onOpenChange, selectedIds }: Props) {
  const { tags: allTags, collections, batchAddTags, batchRemoveTags, batchSetCollection, batchDelete } = usePromptStore()
  const { toast } = useToast()

  const [addTagsInput, setAddTagsInput] = React.useState('')
  const [addTags, setAddTags] = React.useState<string[]>([])
  const [removeTags, setRemoveTags] = React.useState<string[]>([])
  const [removeTagsInput, setRemoveTagsInput] = React.useState('')
  const [targetCollection, setTargetCollection] = React.useState<string>('none')
  const [processing, setProcessing] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setAddTagsInput('')
      setAddTags([])
      setRemoveTags([])
      setRemoveTagsInput('')
      setTargetCollection('none')
    }
  }, [open])

  const addAddTag = () => {
    const t = addTagsInput.trim()
    if (!t || addTags.includes(t)) {
      setAddTagsInput('')
      return
    }
    setAddTags([...addTags, t])
    setAddTagsInput('')
  }

  const addRemoveTag = () => {
    const t = removeTagsInput.trim()
    if (!t || removeTags.includes(t)) {
      setRemoveTagsInput('')
      return
    }
    setRemoveTags([...removeTags, t])
    setRemoveTagsInput('')
  }

  const handleAddTags = async () => {
    if (addTags.length === 0) {
      toast({ title: '请输入至少一个标签', variant: 'destructive' })
      return
    }
    setProcessing(true)
    const ok = await batchAddTags(selectedIds, addTags)
    setProcessing(false)
    if (ok) {
      toast({ title: '批量添加成功', description: `已为 ${selectedIds.length} 条提示词添加 ${addTags.length} 个标签` })
      onOpenChange(false)
    }
  }

  const handleRemoveTags = async () => {
    if (removeTags.length === 0) {
      toast({ title: '请输入至少一个标签', variant: 'destructive' })
      return
    }
    setProcessing(true)
    const ok = await batchRemoveTags(selectedIds, removeTags)
    setProcessing(false)
    if (ok) {
      toast({ title: '批量移除成功', description: `已从 ${selectedIds.length} 条提示词移除 ${removeTags.length} 个标签` })
      onOpenChange(false)
    }
  }

  const handleSetCollection = async () => {
    setProcessing(true)
    const collectionId = targetCollection === 'none' ? null : targetCollection
    const ok = await batchSetCollection(selectedIds, collectionId)
    setProcessing(false)
    if (ok) {
      const name = targetCollection === 'none' ? '移出收藏夹' : collections.find((c) => c.id === targetCollection)?.name
      toast({ title: '收藏夹已更新', description: `${selectedIds.length} 条提示词 → ${name}` })
      onOpenChange(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`确定删除选中的 ${selectedIds.length} 条提示词？此操作无法撤销。`)) return
    setProcessing(true)
    const ok = await batchDelete(selectedIds)
    setProcessing(false)
    if (ok) {
      toast({ title: '批量删除成功', description: `已删除 ${selectedIds.length} 条提示词` })
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>批量编辑（已选 {selectedIds.length} 条）</DialogTitle>
          <DialogDescription>
            对选中的提示词进行批量标签、收藏夹或删除操作
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="addTags" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="addTags" className="text-xs">加标签</TabsTrigger>
            <TabsTrigger value="removeTags" className="text-xs">移除标签</TabsTrigger>
            <TabsTrigger value="collection" className="text-xs">收藏夹</TabsTrigger>
            <TabsTrigger value="delete" className="text-xs text-destructive">删除</TabsTrigger>
          </TabsList>

          {/* Add tags */}
          <TabsContent value="addTags" className="space-y-3 mt-4">
            <Label>添加标签到选中的提示词</Label>
            <div className="flex gap-2">
              <Input
                placeholder="输入标签后回车"
                value={addTagsInput}
                onChange={(e) => setAddTagsInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAddTag() } }}
              />
              <Button variant="outline" onClick={addAddTag}><Plus className="h-4 w-4" /></Button>
            </div>
            {addTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {addTags.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <button onClick={() => setAddTags(addTags.filter((x) => x !== t))} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-muted-foreground">常用：</span>
                {allTags.slice(0, 10).map((t) => (
                  <button
                    key={t.name}
                    onClick={() => !addTags.includes(t.name) && setAddTags([...addTags, t.name])}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border',
                      addTags.includes(t.name) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 hover:bg-muted border-transparent',
                    )}
                  >
                    <Plus className="h-2.5 w-2.5" />
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            <Button onClick={handleAddTags} disabled={processing || addTags.length === 0} className="w-full gap-1.5">
              <TagIcon className="h-4 w-4" />
              批量添加 {addTags.length > 0 && `(${addTags.length} 个标签)`}
            </Button>
          </TabsContent>

          {/* Remove tags */}
          <TabsContent value="removeTags" className="space-y-3 mt-4">
            <Label>从选中的提示词移除标签</Label>
            <div className="flex gap-2">
              <Input
                placeholder="输入标签后回车"
                value={removeTagsInput}
                onChange={(e) => setRemoveTagsInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRemoveTag() } }}
              />
              <Button variant="outline" onClick={addRemoveTag}><Plus className="h-4 w-4" /></Button>
            </div>
            {removeTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {removeTags.map((t) => (
                  <Badge key={t} variant="destructive" className="gap-1">
                    {t}
                    <button onClick={() => setRemoveTags(removeTags.filter((x) => x !== t))} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-muted-foreground">常用：</span>
                {allTags.slice(0, 10).map((t) => (
                  <button
                    key={t.name}
                    onClick={() => !removeTags.includes(t.name) && setRemoveTags([...removeTags, t.name])}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border',
                      removeTags.includes(t.name) ? 'bg-destructive text-destructive-foreground border-destructive' : 'bg-muted/40 hover:bg-muted border-transparent',
                    )}
                  >
                    <Plus className="h-2.5 w-2.5" />
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            <Button onClick={handleRemoveTags} disabled={processing || removeTags.length === 0} variant="outline" className="w-full gap-1.5">
              <X className="h-4 w-4" />
              批量移除 {removeTags.length > 0 && `(${removeTags.length} 个标签)`}
            </Button>
          </TabsContent>

          {/* Collection */}
          <TabsContent value="collection" className="space-y-3 mt-4">
            <Label>将选中的提示词加入收藏夹</Label>
            <Select value={targetCollection} onValueChange={setTargetCollection}>
              <SelectTrigger>
                <SelectValue placeholder="选择收藏夹" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无（移出收藏夹）</SelectItem>
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
            <Button onClick={handleSetCollection} disabled={processing} className="w-full gap-1.5">
              <FolderPlus className="h-4 w-4" />
              应用收藏夹分组
            </Button>
          </TabsContent>

          {/* Delete */}
          <TabsContent value="delete" className="space-y-3 mt-4">
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                <span className="font-medium">删除选中的 {selectedIds.length} 条提示词</span>
              </div>
              <p className="text-xs text-muted-foreground">
                此操作无法撤销，删除后将同时移除所有关联的分类、标签、收藏夹信息。
              </p>
            </div>
            <Button onClick={handleDelete} disabled={processing} variant="destructive" className="w-full gap-1.5">
              <Trash2 className="h-4 w-4" />
              确认删除 {selectedIds.length} 条
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
