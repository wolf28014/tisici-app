'use client'

import * as React from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Lock, LogOut, User as UserIcon, Cloud, Sparkles } from 'lucide-react'
import {
  register, login, logout, getCurrentUser, isLoggedIn, maskEmail,
  updateCurrentUserSyncCode, type User,
} from '@/lib/client/auth'
import { generateSyncCode, applySyncCode } from '@/lib/client/sync'
import { usePromptStore } from '@/lib/prompt-store'
import { useToast } from '@/hooks/use-toast'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserChange?: () => void
}

export function AuthDialog({ open, onOpenChange, onUserChange }: Props) {
  const [mode, setMode] = React.useState<'login' | 'register'>('login')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [user, setUser] = React.useState<User | null>(null)
  const { refreshAll } = usePromptStore()
  const { toast } = useToast()

  React.useEffect(() => {
    if (open) {
      setUser(getCurrentUser())
      setEmail('')
      setPassword('')
      setMode('login')
    }
  }, [open])

  // 已登录视图
  if (user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                <UserIcon className="w-4 h-4" />
              </div>
              <span>账号信息</span>
            </DialogTitle>
            <DialogDescription>已登录账号</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-border p-3 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">邮箱</div>
              <div className="text-sm font-medium">{user.email}</div>
            </div>
            <div className="rounded-lg border border-border p-3 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">注册时间</div>
              <div className="text-sm">
                {new Date(user.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
            {user.lastLoginAt && (
              <div className="rounded-lg border border-border p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground mb-1">最后登录</div>
                <div className="text-sm">
                  {new Date(user.lastLoginAt).toLocaleString('zh-CN')}
                </div>
              </div>
            )}
          </div>

          {/* 数据同步区 */}
          <div className="rounded-lg border border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/30 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">
              <Cloud className="w-4 h-4" />
              数据同步
            </div>
            <p className="text-xs text-muted-foreground">
              上传当前数据到云端（生成同步码），或在其他设备登录后粘贴同步码拉取数据。
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const code = await generateSyncCode()
                  if (code) {
                    updateCurrentUserSyncCode(code)
                    try {
                      await navigator.clipboard.writeText(code)
                      toast({ title: '同步码已复制到剪贴板', description: '可在其他设备粘贴' })
                    } catch {
                      toast({ title: '同步码已生成', description: '请手动复制' })
                    }
                  }
                }}
              >
                <Cloud className="w-3.5 h-3.5 mr-1" />上传数据
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const code = prompt('请粘贴同步码：')
                  if (!code) return
                  const result = await applySyncCode(code)
                  if (result) {
                    await refreshAll()
                    toast({ title: '同步成功', description: `导入 ${result.imported} 条` })
                  } else {
                    toast({ title: '同步失败', variant: 'destructive' })
                  }
                }}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />拉取数据
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                logout()
                setUser(null)
                onUserChange?.()
                toast({ title: '已登出' })
                onOpenChange(false)
              }}
            >
              <LogOut className="w-4 h-4 mr-1" />登出
            </Button>
            <Button onClick={() => onOpenChange(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // 未登录视图：登录/注册表单
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
              <UserIcon className="w-4 h-4" />
            </div>
            <span>{mode === 'login' ? '登录账号' : '注册账号'}</span>
          </DialogTitle>
          <DialogDescription>
            {mode === 'login'
              ? '登录后可跨设备同步数据'
              : '注册账号，邮箱+密码即可，无需手机号'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="auth-email" className="text-xs">邮箱</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="pl-9"
                autoComplete="email"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-password" className="text-xs">密码（≥6位）</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="auth-password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-9"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleSubmit()
                  }
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="ghost"
            className="sm:mr-auto text-xs"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !email || !password}
            className="bg-violet-500 hover:bg-violet-600"
          >
            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  async function handleSubmit() {
    if (!email || !password) return
    setLoading(true)
    try {
      const result = mode === 'login'
        ? await login(email, password)
        : await register(email, password)
      if (result.success && result.user) {
        setUser(result.user)
        onUserChange?.()
        toast({ title: result.message, description: maskEmail(result.user.email) })
        setTimeout(() => onOpenChange(false), 800)
      } else {
        toast({ title: result.message, variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: '操作失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }
}
