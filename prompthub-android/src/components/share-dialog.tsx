'use client'

import * as React from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Copy, Check, Link2, Save } from 'lucide-react'
import {
  type Prompt, encodePromptToShare, copyToClipboard,
} from '@/lib/prompt-types'
import { usePromptStore } from '@/lib/prompt-store'
import { useToast } from '@/hooks/use-toast'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt: Prompt | null
}

export function ShareDialog({ open, onOpenChange, prompt }: Props) {
  const { createPrompt } = usePromptStore()
  const { toast } = useToast()
  const [copied, setCopied] = React.useState(false)

  if (!prompt) return null

  const shareData = {
    title: prompt.title,
    content: prompt.content,
    description: prompt.description,
    tags: prompt.tags,
    author: prompt.author,
  }

  // Generate share link (encode prompt data into URL hash)
  const encoded = encodePromptToShare(shareData)
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}#s=${encoded}`
    : ''

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(shareUrl)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast({ title: '分享链接已复制' })
    }
  }

  const handleCopyContent = async () => {
    const text = `# ${prompt.title}\n\n${prompt.description || ''}\n\n${prompt.content}`
    const ok = await copyToClipboard(text)
    if (ok) toast({ title: '完整内容已复制' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-violet-500" />
            分享提示词
          </DialogTitle>
          <DialogDescription>
            通过链接分享「{prompt.title}」，对方打开链接后可一键保存到自己库中
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>分享链接</Label>
            <Textarea
              readOnly
              value={shareUrl}
              rows={3}
              className="text-xs font-mono resize-none"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCopyLink} className="flex-1 gap-1.5">
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? '已复制' : '复制链接'}
            </Button>
            <Button variant="outline" onClick={handleCopyContent} className="flex-1 gap-1.5">
              <Copy className="h-4 w-4" />
              复制完整内容
            </Button>
          </div>

          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="font-medium text-foreground mb-1">使用说明</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>对方打开链接后会看到提示词详情</li>
              <li>可一键保存到自己库中，无需手动复制</li>
              <li>链接包含完整内容，可离线打开</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Component to handle share link on page load
export function ShareLinkHandler() {
  const { createPrompt } = usePromptStore()
  const { toast } = useToast()
  const [handled, setHandled] = React.useState(false)
  const [shareData, setShareData] = React.useState<{
    title: string
    content: string
    description?: string | null
    tags?: string[]
    author?: string | null
  } | null>(null)

  React.useEffect(() => {
    if (handled) return
    if (typeof window === 'undefined') return

    const hash = window.location.hash
    if (!hash.startsWith('#s=')) return

    setHandled(true)

    import('@/lib/prompt-types').then(({ decodePromptFromShare }) => {
      const encoded = hash.slice(3)
      const data = decodePromptFromShare(encoded)
      if (!data) {
        toast({ title: '分享链接无效', variant: 'destructive' })
        return
      }
      setShareData(data)
    })
  }, [handled, toast])

  const handleConfirm = async () => {
    if (!shareData) return
    const success = await createPrompt({
      title: shareData.title,
      content: shareData.content,
      description: shareData.description || undefined,
      tags: shareData.tags || [],
      author: shareData.author || '分享导入',
    })
    if (success) {
      toast({ title: '提示词已保存到库中' })
      history.replaceState(null, '', window.location.pathname)
    }
    setShareData(null)
  }

  const handleCancel = () => {
    setShareData(null)
    history.replaceState(null, '', window.location.pathname)
  }

  if (!shareData) return null

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) handleCancel() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>从分享链接导入</DialogTitle>
          <DialogDescription>
            有人向你分享了一条提示词，是否保存到你的库中？
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground mb-1">标题</div>
            <div className="font-medium">{shareData.title}</div>
          </div>
          {shareData.description && (
            <div className="text-sm text-muted-foreground">{shareData.description}</div>
          )}
          {shareData.tags && shareData.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {shareData.tags.map((t) => (
                <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>取消</Button>
          <Button onClick={handleConfirm}>保存到我的库</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
