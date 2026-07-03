'use client'

import * as React from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { History, RotateCcw, Clock, FileText } from 'lucide-react'
import { usePromptStore } from '@/lib/prompt-store'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Version } from '@/lib/prompt-types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  promptId: string | null
}

export function VersionHistoryDialog({ open, onOpenChange, promptId }: Props) {
  const { fetchVersions, restoreVersion } = usePromptStore()
  const { toast } = useToast()
  const [versions, setVersions] = React.useState<Version[]>([])
  const [current, setCurrent] = React.useState<{ title: string; content: string } | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [restoring, setRestoring] = React.useState<string | null>(null)
  const [previewVersion, setPreviewVersion] = React.useState<Version | null>(null)

  React.useEffect(() => {
    if (!open || !promptId) return
    setLoading(true)
    setPreviewVersion(null)
    fetchVersions(promptId).then((data) => {
      if (data) {
        setVersions(data.versions)
        setCurrent({ title: data.current.title, content: data.current.content })
      }
      setLoading(false)
    })
  }, [open, promptId, fetchVersions])

  const handleRestore = async (versionId: string, versionNum: number) => {
    if (!promptId) return
    if (!confirm(`确定恢复到第 ${versionNum} 版？当前版本会自动备份。`)) return
    setRestoring(versionId)
    const ok = await restoreVersion(promptId, versionId)
    setRestoring(null)
    if (ok) {
      toast({ title: '已恢复', description: `已恢复到第 ${versionNum} 版` })
      onOpenChange(false)
    } else {
      toast({ title: '恢复失败', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-violet-500" />
            版本历史
          </DialogTitle>
          <DialogDescription>
            每次修改标题或内容时会自动保存版本，可随时恢复
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
        ) : versions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            暂无历史版本（修改标题或内容后会自动保存版本）
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {/* Current version */}
            {current && (
              <div className="rounded-md border-2 border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge>当前版本</Badge>
                    <span className="text-sm font-medium truncate">{current.title}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 font-mono">{current.content}</p>
              </div>
            )}

            {/* Version list */}
            <div className="text-xs text-muted-foreground px-1">历史版本（{versions.length}）</div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={cn(
                    'rounded-md border p-3 transition-colors',
                    previewVersion?.id === v.id ? 'border-primary bg-accent' : 'hover:bg-accent/50',
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline">v{v.versionNum}</Badge>
                      <span className="text-sm font-medium truncate">{v.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(v.createdAt), 'MM-dd HH:mm')}
                    </span>
                  </div>
                  {v.changeNote && (
                    <p className="text-xs text-muted-foreground mb-2">{v.changeNote}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={() => setPreviewVersion(previewVersion?.id === v.id ? null : v)}
                    >
                      <FileText className="h-3 w-3" />
                      {previewVersion?.id === v.id ? '收起预览' : '预览内容'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      disabled={restoring === v.id}
                      onClick={() => handleRestore(v.id, v.versionNum)}
                    >
                      <RotateCcw className="h-3 w-3" />
                      {restoring === v.id ? '恢复中...' : '恢复此版本'}
                    </Button>
                  </div>
                  {previewVersion?.id === v.id && (
                    <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-muted/40 p-2 text-xs font-mono max-h-48 overflow-y-auto">
                      {v.content}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
