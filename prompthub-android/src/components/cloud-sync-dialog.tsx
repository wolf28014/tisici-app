'use client'

import * as React from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Cloud, Download, Upload, Copy, Check, Loader2, RefreshCw } from 'lucide-react'
import { usePromptStore } from '@/lib/prompt-store'
import { useToast } from '@/hooks/use-toast'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CloudSyncDialog({ open, onOpenChange }: Props) {
  const { generateSyncCode, applySyncCode } = usePromptStore()
  const { toast } = useToast()

  const [code, setCode] = React.useState('')
  const [generating, setGenerating] = React.useState(false)
  const [importCode, setImportCode] = React.useState('')
  const [importing, setImporting] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setCode('')
      setImportCode('')
      setCopied(false)
    }
  }, [open])

  const handleGenerate = async () => {
    setGenerating(true)
    setCode('')
    try {
      const result = await generateSyncCode()
      if (result) {
        setCode(result)
        toast({ title: '同步码已生成', description: `数据大小：${(result.length / 1024).toFixed(1)}KB` })
      } else {
        toast({ title: '生成失败', variant: 'destructive' })
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast({ title: '已复制到剪贴板' })
    } catch {
      toast({ title: '复制失败', variant: 'destructive' })
    }
  }

  const handleImport = async () => {
    if (!importCode.trim()) {
      toast({ title: '请粘贴同步码', variant: 'destructive' })
      return
    }
    setImporting(true)
    try {
      const result = await applySyncCode(importCode.trim())
      if (result) {
        toast({
          title: '同步成功',
          description: `新增 ${result.imported} 条，跳过 ${result.skipped} 条重复`,
        })
        onOpenChange(false)
      } else {
        toast({ title: '同步失败，请检查同步码', variant: 'destructive' })
      }
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-violet-500" />
            跨设备云同步
          </DialogTitle>
          <DialogDescription>
            生成同步码后在其他设备粘贴，即可同步全部提示词、分类、收藏夹
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="text-xs gap-1">
              <Upload className="h-3.5 w-3.5" />
              生成同步码
            </TabsTrigger>
            <TabsTrigger value="import" className="text-xs gap-1">
              <Download className="h-3.5 w-3.5" />
              导入同步码
            </TabsTrigger>
          </TabsList>

          {/* Export tab */}
          <TabsContent value="export" className="space-y-3 mt-4">
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <div className="font-medium text-foreground">使用方法：</div>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>点击"生成同步码"</li>
                <li>复制生成的同步码</li>
                <li>在其他设备打开此页面</li>
                <li>切换到"导入同步码"标签，粘贴并同步</li>
              </ol>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full gap-1.5"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  {code ? '重新生成同步码' : '生成同步码'}
                </>
              )}
            </Button>

            {code && (
              <div className="space-y-2">
                <Label>同步码（{code.length} 字符）</Label>
                <Textarea
                  readOnly
                  value={code}
                  rows={5}
                  className="text-xs font-mono resize-none"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
                <Button onClick={handleCopy} variant="outline" className="w-full gap-1.5">
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? '已复制' : '复制同步码'}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Import tab */}
          <TabsContent value="import" className="space-y-3 mt-4">
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <div className="font-medium text-foreground">使用方法：</div>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>从其他设备复制同步码</li>
                <li>粘贴到下方输入框</li>
                <li>点击"开始同步"</li>
                <li>已有的提示词（按标题去重）会跳过</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label>粘贴同步码</Label>
              <Textarea
                placeholder="在此粘贴从其他设备复制的同步码..."
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                rows={5}
                className="text-xs font-mono resize-none"
              />
            </div>

            <Button
              onClick={handleImport}
              disabled={importing || !importCode.trim()}
              className="w-full gap-1.5"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  同步中...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  开始同步
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
