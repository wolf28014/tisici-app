'use client'

import * as React from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Download, Upload, FileJson, AlertTriangle } from 'lucide-react'
import { usePromptStore } from '@/lib/prompt-store'
import { useToast } from '@/hooks/use-toast'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportExportDialog({ open, onOpenChange }: Props) {
  const { exportData, importData } = usePromptStore()
  const { toast } = useToast()
  const [mode, setMode] = React.useState<'merge' | 'replace'>('merge')
  const [importing, setImporting] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    await exportData()
    toast({ title: '导出成功', description: '备份文件已下载到本地' })
    onOpenChange(false)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const result = await importData(data, mode)
      if (result) {
        toast({
          title: '导入成功',
          description: `新增 ${result.imported} 条，跳过 ${result.skipped} 条重复${mode === 'replace' ? '（替换模式）' : ''}`,
        })
        onOpenChange(false)
      } else {
        toast({ title: '导入失败', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: '文件解析失败', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-violet-500" />
            导入 / 导出
          </DialogTitle>
          <DialogDescription>
            备份你的提示词库，或在其他设备恢复
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Export */}
          <div className="space-y-2">
            <Label>导出当前提示词库</Label>
            <p className="text-xs text-muted-foreground">
              将所有分类和提示词导出为 JSON 文件，可用于备份或迁移。
            </p>
            <Button onClick={handleExport} className="w-full gap-1.5">
              <Download className="h-4 w-4" />
              导出为 JSON 文件
            </Button>
          </div>

          <div className="border-t pt-4 space-y-3">
            <Label>导入提示词</Label>

            <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'merge' | 'replace')}>
              <label className="flex items-start gap-2 cursor-pointer p-2 rounded-md hover:bg-accent">
                <RadioGroupItem value="merge" className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium">合并导入</div>
                  <div className="text-xs text-muted-foreground">仅添加新的提示词，已有的（按标题去重）将跳过</div>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer p-2 rounded-md hover:bg-accent">
                <RadioGroupItem value="replace" className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    替换导入
                    <span className="text-amber-600 inline-flex items-center gap-0.5 text-[10px]">
                      <AlertTriangle className="h-3 w-3" /> 谨慎
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">清空所有现有数据，然后导入文件内容</div>
                </div>
              </label>
            </RadioGroup>

            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full gap-1.5"
              disabled={importing}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {importing ? '导入中...' : '选择 JSON 文件导入'}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
