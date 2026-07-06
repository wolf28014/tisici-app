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
  Mail, Lock, LogOut, User as UserIcon, Cloud, Sparkles,
  Settings as SettingsIcon, Check, Loader2, Upload, Download,
} from 'lucide-react'
import {
  register, login, logout, getCurrentUser, isLoggedIn, maskEmail,
  updateCurrentUserSyncCode, getCurrentUserSyncCode, isCloudConfigured,
  setGistToken, type User,
} from '@/lib/client/auth'
import { generateSyncCode, applySyncCode } from '@/lib/client/sync'
import { usePromptStore } from '@/lib/prompt-store'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

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
  const [showCloudConfig, setShowCloudConfig] = React.useState(false)
  const [gistToken, setGistTokenInput] = React.useState('')
  const [syncing, setSyncing] = React.useState<'upload' | 'download' | null>(null)
  const { refreshAll } = usePromptStore()
  const { toast } = useToast()

  React.useEffect(() => {
    if (open) {
      setUser(getCurrentUser())
      setEmail('')
      setPassword('')
      setMode('login')
      setShowCloudConfig(false)
      setGistTokenInput('')
    }
  }, [open])

  // 登录成功后自动拉取云端数据
  const handleAutoSync = async (syncCode: string) => {
    if (!syncCode) return
    setSyncing('download')
    try {
      const result = await applySyncCode(syncCode)
      if (result) {
        await refreshAll()
        toast({
          title: '✅ 云端数据已同步',
          description: `导入 ${result.imported} 条数据`,
        })
      }
    } catch (e) {
      console.warn('Auto sync failed:', e)
    } finally {
      setSyncing(null)
    }
  }

  // 已登录视图
  if (user) {
    const hasCloudData = !!user.syncCode
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                <UserIcon className="w-4 h-4" />
              </div>
              <span>账号信息</span>
              {isCloudConfigured() && (
                <span className="ml-auto text-[10px] text-emerald-600 flex items-center gap-0.5">
                  <Check className="w-3 h-3" />云端已连接
                </span>
              )}
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
            {user.dataUpdatedAt && (
              <div className="rounded-lg border border-border p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground mb-1">数据最后更新</div>
                <div className="text-sm">
                  {new Date(user.dataUpdatedAt).toLocaleString('zh-CN')}
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
            {!isCloudConfigured() && (
              <p className="text-xs text-amber-600">
                ⚠️ 未配置云端存储，数据仅存本地。配置后可跨设备同步。
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {hasCloudData
                ? '检测到云端数据，可拉取到本设备。也可上传当前数据覆盖云端。'
                : '上传当前数据到云端，在其他设备登录后自动拉取。'}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={syncing !== null}
                onClick={async () => {
                  setSyncing('upload')
                  try {
                    const code = await generateSyncCode()
                    if (code) {
                      await updateCurrentUserSyncCode(code)
                      toast({ title: '✅ 数据已上传到云端', description: '可在其他设备登录后自动同步' })
                    }
                  } catch (e) {
                    toast({ title: '上传失败', description: (e as Error).message, variant: 'destructive' })
                  } finally {
                    setSyncing(null)
                  }
                }}
              >
                {syncing === 'upload' ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />上传中</>
                ) : (
                  <><Upload className="w-3.5 h-3.5 mr-1" />上传数据</>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={syncing !== null || !hasCloudData}
                onClick={async () => {
                  const syncCode = getCurrentUserSyncCode()
                  if (!syncCode) return
                  setSyncing('download')
                  try {
                    const result = await applySyncCode(syncCode)
                    if (result) {
                      await refreshAll()
                      toast({ title: '✅ 已拉取云端数据', description: `导入 ${result.imported} 条` })
                    }
                  } catch (e) {
                    toast({ title: '拉取失败', description: (e as Error).message, variant: 'destructive' })
                  } finally {
                    setSyncing(null)
                  }
                }}
              >
                {syncing === 'download' ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />拉取中</>
                ) : (
                  <><Download className="w-3.5 h-3.5 mr-1" />拉取数据</>
                )}
              </Button>
            </div>
          </div>

          {/* 云端配置 */}
          <div className="space-y-2">
            <button
              onClick={() => setShowCloudConfig(!showCloudConfig)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <SettingsIcon className="w-3 h-3" />
              {showCloudConfig ? '收起' : '配置'}云端存储
            </button>
            {showCloudConfig && (
              <div className="rounded-lg border border-border p-3 bg-muted/20 space-y-2">
                <Label className="text-xs">GitHub Token（用于云端存储）</Label>
                <Input
                  type="password"
                  placeholder="ghp_..."
                  value={gistToken}
                  onChange={e => setGistTokenInput(e.target.value)}
                  className="text-xs"
                />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  用于跨设备同步账号数据。需要一个有 gist 权限的 GitHub Token。
                  申请：GitHub Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token → 勾选 gist
                </p>
                <Button
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    if (!gistToken.trim()) return
                    setGistToken(gistToken.trim())
                    toast({ title: '云端存储已配置' })
                    setShowCloudConfig(false)
                  }}
                >
                  保存 Token
                </Button>
              </div>
            )}
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

  // 未登录视图
  const handleSubmit = async () => {
    if (!email || !password) return
    setLoading(true)
    try {
      const result = mode === 'login'
        ? await login(email, password)
        : await register(email, password)
      if (result.success && result.user) {
        setUser(result.user)
        onUserChange?.()
        toast({
          title: result.message,
          description: maskEmail(result.user.email),
        })
        // 登录成功后自动同步云端数据
        if (mode === 'login' && result.needsSync && result.user.syncCode) {
          // 延迟 1 秒后自动同步
          setTimeout(() => {
            handleAutoSync(result.user!.syncCode!)
            onOpenChange(false)
          }, 1000)
        } else {
          setTimeout(() => onOpenChange(false), 800)
        }
      } else {
        toast({ title: result.message, variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: '操作失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

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
              ? '登录后自动同步云端数据（需先配置 GitHub Token）'
              : '注册账号，邮箱+密码即可。配置 Token 后可跨设备同步'}
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
                  if (e.key === 'Enter') handleSubmit()
                }}
              />
            </div>
          </div>

          {/* 云端同步提示 */}
          {!isCloudConfigured() && (
            <div className="text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md">
              ⚠️ 未配置云端存储。注册/登录后请到账号信息中配置 GitHub Token，才能跨设备同步。
            </div>
          )}
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
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" />处理中...</>
            ) : mode === 'login' ? '登录' : '注册'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
