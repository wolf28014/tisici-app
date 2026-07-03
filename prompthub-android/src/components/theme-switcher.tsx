'use client'

import * as React from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Check } from 'lucide-react'
import {
  THEMES, getCurrentThemeId, setTheme, applyTheme, type Theme,
} from '@/lib/client/themes'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ThemeSwitcher({ open, onOpenChange }: Props) {
  const [currentId, setCurrentId] = React.useState(getCurrentThemeId())

  React.useEffect(() => {
    if (open) {
      setCurrentId(getCurrentThemeId())
    }
  }, [open])

  const handleSelect = (theme: Theme) => {
    setTheme(theme.id)
    setCurrentId(theme.id)
    // 短暂延迟后关闭，让用户看到选中效果
    setTimeout(() => onOpenChange(false), 200)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>选择主题</DialogTitle>
          <DialogDescription>
            共 {THEMES.length} 套主题，切换后立即生效，背景/字体/图标颜色都会变化
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 py-2">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => handleSelect(theme)}
              className={cn(
                'relative rounded-xl border-2 overflow-hidden touch-feedback text-left transition-all',
                currentId === theme.id
                  ? 'border-primary ring-2 ring-primary/30 scale-105'
                  : 'border-border hover:border-primary/40',
              )}
              style={{
                background: theme.vars.appBg || theme.vars.background,
                color: theme.vars.foreground,
              }}
            >
              {/* 主题预览 */}
              <div className="p-3 h-24 flex flex-col justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{theme.emoji}</span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: theme.vars.foreground }}
                  >
                    {theme.name}
                  </span>
                  {currentId === theme.id && (
                    <Check
                      className="w-3.5 h-3.5 ml-auto"
                      style={{ color: theme.vars.primary }}
                    />
                  )}
                </div>
                <div
                  className="text-[10px] leading-tight"
                  style={{ color: theme.vars.mutedForeground }}
                >
                  {theme.description}
                </div>
                {/* 色块预览 */}
                <div className="flex gap-1">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ background: theme.vars.primary }}
                  />
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{
                      background: theme.vars.card,
                      borderColor: theme.vars.border,
                    }}
                  />
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ background: theme.vars.accent }}
                  />
                </div>
              </div>
              {/* 选中标记 */}
              {currentId === theme.id && (
                <div
                  className="absolute top-0 right-0 px-2 py-0.5 text-[9px] text-white font-medium rounded-bl-lg"
                  style={{ background: theme.vars.primary }}
                >
                  当前
                </div>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 主题应用初始化（在 layout 中调用）
export function ThemeInitializer() {
  React.useEffect(() => {
    const theme = getCurrentThemeId()
    const themeObj = THEMES.find(t => t.id === theme)
    if (themeObj) {
      applyTheme(themeObj)
    }
  }, [])
  return null
}
