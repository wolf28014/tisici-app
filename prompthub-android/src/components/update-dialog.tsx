'use client'

import * as React from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, X, Sparkles, ExternalLink, AlertCircle } from 'lucide-react'
import {
  checkForUpdate, downloadApk, formatSize, formatDate,
  skipVersion, type UpdateInfo,
} from '@/lib/client/updater'
import { useToast } from '@/hooks/use-toast'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  updateInfo: UpdateInfo | null
  onSkip?: () => void
}

export function UpdateDialog({ open, onOpenChange, updateInfo, onSkip }: Props) {
  const { toast } = useToast()
  const [downloading, setDownloading] = React.useState(false)

  if (!updateInfo) return null
  const { latestVersion, currentVersion, releaseNotes, apkUrl, apkSize, publishedAt, htmlUrl } = updateInfo

  const handleDownload = async () => {
    if (!apkUrl) {
      // 没有 APK 资源，跳转到 Release 页面
      window.open(htmlUrl, '_blank', 'noopener,noreferrer')
      return
    }
    setDownloading(true)
    try {
      const ok = await downloadApk(apkUrl, `PromptHub-v${latestVersion}.apk`)
      if (ok) {
        toast({
          title: '已开始下载',
          description: `PromptHub v${latestVersion}.apk`,
        })
        onOpenChange(false)
      }
    } catch (e) {
      toast({
        title: '下载失败',
        description: (e as Error).message,
        variant: 'destructive',
      })
    } finally {
      setDownloading(false)
    }
  }

  const handleSkip = () => {
    skipVersion(latestVersion)
    onSkip?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>发现新版本</span>
          </DialogTitle>
          <DialogDescription>
            PromptHub 有新版本可用
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">当前版本:</span>
            <Badge variant="outline">v{currentVersion}</Badge>
            <span className="text-muted-foreground">→</span>
            <Badge className="bg-violet-500">v{latestVersion}</Badge>
          </div>

          {publishedAt && (
            <div className="text-xs text-muted-foreground">
              发布于 {formatDate(publishedAt)}
              {apkSize ? ` · ${formatSize(apkSize)}` : ''}
            </div>
          )}

          {releaseNotes && (
            <div className="border rounded-lg p-3 bg-muted/30 max-h-48 overflow-y-auto">
              <div className="text-xs font-medium text-muted-foreground mb-1">更新内容</div>
              <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed">{releaseNotes.slice(0, 600)}</pre>
            </div>
          )}

          {!apkUrl && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                本次 Release 未附带 APK 文件。点击「前往下载」会跳转到 GitHub Release 页面，可在浏览器中下载。
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={handleSkip} className="sm:mr-auto">
            <X className="w-4 h-4 mr-1" />跳过此版本
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            稍后再说
          </Button>
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-violet-500 hover:bg-violet-600"
          >
            {downloading ? (
              <>下载中...</>
            ) : apkUrl ? (
              <><Download className="w-4 h-4 mr-1" />下载 APK</>
            ) : (
              <><ExternalLink className="w-4 h-4 mr-1" />前往下载</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 启动时自动检查更新（带节流）
export function useAutoCheckUpdate() {
  const [updateInfo, setUpdateInfo] = React.useState<UpdateInfo | null>(null)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    let mounted = true
    checkForUpdate(false).then(info => {
      if (!mounted) return
      if (info && info.hasUpdate) {
        setUpdateInfo(info)
        // 延迟 2 秒弹窗，等首页加载完
        setTimeout(() => setOpen(true), 2000)
      }
    })
    return () => { mounted = false }
  }, [])

  return { updateInfo, setUpdateInfo, open, setOpen }
}
