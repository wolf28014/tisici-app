'use client'

import * as React from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { FolderPlus, Trash2, Folder } from 'lucide-react'
import { usePromptStore } from '@/lib/prompt-store'
import { useToast } from '@/hooks/use-toast'
import { CategoryIcon, ICON_NAMES } from '@/components/category-icon'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const COLOR_OPTIONS = ['rose', 'emerald', 'amber', 'sky', 'violet', 'teal', 'pink', 'slate']

export function CollectionManagerDialog({ open, onOpenChange }: Props) {
  const { collections, createCollection, deleteCollection } = usePromptStore()
  const { toast } = useToast()

  const [name, setName] = React.useState('')
  const [icon, setIcon] = React.useState('Folder')
  const [color, setColor] = React.useState('violet')
  const [creating, setCreating] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setName('')
      setIcon('Folder')
      setColor('violet')
    }
  }, [open])

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: '请输入收藏夹名称', variant: 'destructive' })
      return
    }
    setCreating(true)
    const ok = await createCollection({ name: name.trim(), icon, color })
    setCreating(false)
    if (ok) {
      toast({ title: '收藏夹已创建', description: name })
      setName('')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除收藏夹「${name}」？其中的提示词不会被删除，只是移出该收藏夹。`)) return
    const ok = await deleteCollection(id)
    if (ok) toast({ title: '收藏夹已删除' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-violet-500" />
            收藏夹管理
          </DialogTitle>
          <DialogDescription>
            创建自定义收藏夹分组，将相关提示词归类管理
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Create form */}
          <div className="space-y-3 rounded-md border p-3 bg-muted/30">
            <div className="text-sm font-medium">新建收藏夹</div>
            <Input
              placeholder="收藏夹名称（如：本周爆款、客户案例）"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">图标</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        <span className="inline-flex items-center gap-2">
                          <span className={cn('h-2.5 w-2.5 rounded-full', `bg-${c}-500`)} />
                          {c}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreate} disabled={creating || !name.trim()} size="sm" className="w-full gap-1.5">
              <FolderPlus className="h-4 w-4" />
              创建收藏夹
            </Button>
          </div>

          {/* Existing collections */}
          <div className="space-y-2">
            <div className="text-sm font-medium">已有收藏夹（{collections.length}）</div>
            {collections.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">暂无收藏夹，创建第一个吧</p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {collections.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 p-2 rounded-md border bg-card">
                    <span className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-md flex-shrink-0',
                      `bg-${c.color || 'violet'}-50 dark:bg-${c.color || 'violet'}-950/40`,
                      `text-${c.color || 'violet'}-700 dark:text-${c.color || 'violet'}-300`,
                    )}>
                      <CategoryIcon name={c.icon} className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.promptCount} 条提示词</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(c.id, c.name)}
                      title="删除收藏夹"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>完成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
