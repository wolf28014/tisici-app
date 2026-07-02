'use client'

import * as React from 'react'
import { usePromptStore } from '@/lib/prompt-store'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sparkles, Search, Plus, Pin, Clock, TrendingUp, Star, Download, Upload,
  Tag as TagIcon, Settings, FolderOpen, Cloud, Wand2, Palette, Sun, Moon,
  Library, Home, Folder, BarChart3, Menu, X, Check, ChevronRight,
  Package, Trash2, Eye, RefreshCw, ExternalLink, Monitor,
  Flame, User as UserIcon, LogIn,
} from 'lucide-react'
import { PromptFormDialog } from '@/components/prompt-form-dialog'
import { PromptDetailSheet } from '@/components/prompt-detail-sheet'
import { ImportExportDialog } from '@/components/import-export-dialog'
import { ShareDialog } from '@/components/share-dialog'
import { BatchEditDialog } from '@/components/batch-edit-dialog'
import { CollectionManagerDialog } from '@/components/collection-manager-dialog'
import { CloudSyncDialog } from '@/components/cloud-sync-dialog'
import { AIGenerateDialog } from '@/components/ai-generate-dialog'
import { ThemeToggle } from '@/components/theme-toggle'
import { UpdateDialog, useAutoCheckUpdate } from '@/components/update-dialog'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { AuthDialog } from '@/components/auth-dialog'
import { getColorClass, copyToClipboard, type Prompt } from '@/lib/prompt-types'
import { getAIConfig, setAIConfig, isAIConfigured, type AIConfig } from '@/lib/client/ai'
import { checkForUpdate, APP_VERSION, GITHUB_REPO, type UpdateInfo } from '@/lib/client/updater'
import { fetchHotPrompts, autoFetchHotIfNeeded } from '@/lib/client/hot-prompts'
import { getCurrentUser, isLoggedIn, maskEmail } from '@/lib/client/auth'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

// ============================================
// 主页：PC + 移动响应式布局
// - PC (≥1024px)：左侧固定 sidebar + 主内容区
// - 移动端：底部 Tab + 抽屉筛选
// ============================================
type TabKey = 'home' | 'categories' | 'collections' | 'stats' | 'settings'

export default function HomePage() {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const {
    prompts, loading, initialize, refreshAll, fetchPrompts, selectPrompt,
    searchQuery, setSearchQuery, sortBy, setSortBy,
    showFavoritesOnly, setShowFavoritesOnly,
    activeCategoryId, activeCollectionId, activeTag, setActiveCategoryId,
    setActiveCollectionId, setActiveTag,
    categories, collections, tags,
    selectionMode, setSelectionMode, selectedIds, selectAll, clearSelection,
    error,
  } = usePromptStore()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = React.useState<TabKey>('home')
  const [filterOpen, setFilterOpen] = React.useState(false)
  const [formOpen, setFormOpen] = React.useState(false)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Prompt | null>(null)
  const [importExportOpen, setImportExportOpen] = React.useState(false)
  const [shareOpen, setShareOpen] = React.useState(false)
  const [sharingPrompt, setSharingPrompt] = React.useState<Prompt | null>(null)
  const [batchOpen, setBatchOpen] = React.useState(false)
  const [collectionOpen, setCollectionOpen] = React.useState(false)
  const [syncOpen, setSyncOpen] = React.useState(false)
  const [aiGenerateOpen, setAiGenerateOpen] = React.useState(false)

  // 应用更新检查
  const updateCheck = useAutoCheckUpdate()
  const [manualChecking, setManualChecking] = React.useState(false)

  // 主题切换器、账号对话框
  const [themeOpen, setThemeOpen] = React.useState(false)
  const [authOpen, setAuthOpen] = React.useState(false)
  const [authed, setAuthed] = React.useState(false)
  const [fetchingHot, setFetchingHot] = React.useState(false)

  // 初始化数据库
  React.useEffect(() => {
    initialize()
    setAuthed(isLoggedIn())
    // 启动时静默拉取热门提示词（24h 内只拉一次）
    autoFetchHotIfNeeded().then(() => refreshAll())
  }, [initialize, refreshAll])

  // 切换筛选条件时重新拉取（必须在任何条件 return 之前调用 hooks）
  React.useEffect(() => {
    if (activeTab === 'home') {
      fetchPrompts()
    }
  }, [activeTab, searchQuery, sortBy, showFavoritesOnly, activeCategoryId, activeCollectionId, activeTag, fetchPrompts])

  // 所有 useMemo 必须在条件 return 之前调用，保证 hooks 顺序一致
  const activeCategoryName = React.useMemo(() => {
    const find = (cats: typeof categories): string | null => {
      for (const c of cats) {
        if (c.id === activeCategoryId) return c.name
        if (c.children) {
          const sub = find(c.children)
          if (sub) return sub
        }
      }
      return null
    }
    return find(categories)
  }, [categories, activeCategoryId])

  const activeCollectionName = React.useMemo(
    () => collections.find(c => c.id === activeCollectionId)?.name,
    [collections, activeCollectionId],
  )

  const hasActiveFilter = activeCategoryId || activeCollectionId || activeTag || showFavoritesOnly

  // SSR 期间渲染骨架屏
  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="safe-top sticky top-0 z-30 bg-background border-b border-border">
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600" />
            <div className="flex-1">
              <div className="h-4 w-32 bg-muted rounded mb-1" />
              <div className="h-3 w-20 bg-muted/50 rounded" />
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-28 bg-muted/30 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const handleEdit = (p: Prompt) => {
    setEditing(p)
    setFormOpen(true)
  }

  const handleShare = (p: Prompt) => {
    setSharingPrompt(p)
    setShareOpen(true)
  }

  const handleNewPrompt = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const handleCopyPrompt = async (p: Prompt) => {
    const ok = await copyToClipboard(p.content)
    if (ok) {
      toast({ title: '已复制', description: p.title })
      await usePromptStore.getState().incrementUsage(p.id)
    }
  }

  // 手动检查更新
  const handleCheckUpdate = async () => {
    setManualChecking(true)
    try {
      const info = await checkForUpdate(true)
      if (!info) {
        toast({ title: '检查失败', description: '网络错误，请稍后重试', variant: 'destructive' })
      } else if (info.hasUpdate) {
        updateCheck.setUpdateInfo(info)
        updateCheck.setOpen(true)
      } else {
        toast({
          title: '已是最新版本',
          description: `当前 v${info.currentVersion} · 最新 v${info.latestVersion}`,
        })
      }
    } finally {
      setManualChecking(false)
    }
  }

  // 拉取 AI 热门提示词
  const handleFetchHot = async () => {
    if (!isAIConfigured()) {
      toast({ title: '请先配置 AI API Key', description: '设置 → AI API 配置', variant: 'destructive' })
      return
    }
    setFetchingHot(true)
    try {
      const result = await fetchHotPrompts(true)
      if (result.success) {
        await refreshAll()
        toast({ title: '热门提示词已更新', description: result.message })
      } else {
        toast({ title: '拉取失败', description: result.message, variant: 'destructive' })
      }
    } finally {
      setFetchingHot(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ===== PC 端左侧 Sidebar ===== */}
      <aside className="pc-only fixed left-0 top-0 bottom-0 w-[260px] flex-col border-r border-border bg-card/50 backdrop-blur-md z-40">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-base leading-tight">PromptHub</div>
            <div className="text-[10px] text-muted-foreground">提示词库 v{APP_VERSION}</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto pc-sidebar-scroll p-3 space-y-1">
          {/* 导航项 */}
          <PcNavItem icon={Home} label="全部提示词" active={activeTab === 'home' && !hasActiveFilter} onClick={() => {
            setActiveCategoryId(null); setActiveCollectionId(null); setActiveTag(null); setShowFavoritesOnly(false); setActiveTab('home')
          }} />
          <PcNavItem icon={Star} label="我的收藏" active={showFavoritesOnly} onClick={() => {
            setShowFavoritesOnly(!showFavoritesOnly); setActiveTab('home')
          }} />
          <PcNavItem icon={BarChart3} label="统计" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
          <PcNavItem icon={Settings} label="设置" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />

          {/* 分类列表 */}
          <div className="pt-3 mt-3 border-t border-border">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">分类</span>
              <button className="text-[10px] text-violet-500 hover:underline" onClick={() => setActiveTab('categories')}>
                全部
              </button>
            </div>
            <PcCategoryItem
              name="全部"
              icon={Home}
              active={!activeCategoryId}
              onClick={() => { setActiveCategoryId(null); setActiveTab('home') }}
            />
            {categories.slice(0, 8).map(c => (
              <PcCategoryItem
                key={c.id}
                name={c.name}
                icon={Library}
                color={c.color}
                count={c.promptCount}
                active={activeCategoryId === c.id}
                onClick={() => { setActiveCategoryId(c.id); setActiveTab('home') }}
              />
            ))}
          </div>

          {/* 收藏夹列表 */}
          {collections.length > 0 && (
            <div className="pt-3 mt-3 border-t border-border">
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">收藏夹</span>
                <button className="text-[10px] text-violet-500 hover:underline" onClick={() => setActiveTab('collections')}>
                  管理
                </button>
              </div>
              {collections.map(c => (
                <PcCategoryItem
                  key={c.id}
                  name={c.name}
                  icon={FolderOpen}
                  color={c.color}
                  count={c.promptCount}
                  active={activeCollectionId === c.id}
                  onClick={() => { setActiveCollectionId(c.id); setActiveTab('home') }}
                />
              ))}
            </div>
          )}

          {/* 标签云 */}
          {tags.length > 0 && (
            <div className="pt-3 mt-3 border-t border-border">
              <div className="px-2 mb-2">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">标签</span>
              </div>
              <div className="flex flex-wrap gap-1 px-1">
                {tags.slice(0, 12).map(t => (
                  <button
                    key={t.name}
                    onClick={() => { setActiveTag(t.name); setActiveTab('home') }}
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] touch-feedback',
                      activeTag === t.name ? 'bg-violet-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70',
                    )}
                  >
                    #{t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* 底部操作 */}
        <div className="p-3 border-t border-border space-y-1">
          <PcNavItem icon={Flame} label="AI 热门搜索" onClick={handleFetchHot} />
          <PcNavItem icon={Wand2} label="AI 生成提示词" onClick={() => setAiGenerateOpen(true)} />
          <PcNavItem icon={Cloud} label="跨设备同步" onClick={() => setSyncOpen(true)} />
          <PcNavItem icon={Download} label="导入 / 导出" onClick={() => setImportExportOpen(true)} />
          <PcNavItem icon={Palette} label="切换主题" onClick={() => setThemeOpen(true)} />
          <PcNavItem
            icon={authed ? UserIcon : LogIn}
            label={authed ? (getCurrentUser()?.email || '账号') : '登录 / 注册'}
            onClick={() => setAuthOpen(true)}
          />
          <div className="flex items-center justify-between px-2 pt-2 mt-1 border-t border-border/50">
            <ThemeToggle />
            <button
              onClick={handleCheckUpdate}
              disabled={manualChecking}
              className="text-[10px] text-muted-foreground hover:text-violet-500 flex items-center gap-1 touch-feedback"
            >
              <RefreshCw className={cn('w-3 h-3', manualChecking && 'animate-spin')} />
              {manualChecking ? '检查中...' : `v${APP_VERSION}`}
            </button>
          </div>
        </div>
      </aside>

      {/* ===== 移动端顶部栏 ===== */}
      <header className="mobile-only safe-top sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold truncate">PromptHub 提示词库</h1>
              <p className="text-[10px] text-muted-foreground truncate">
                {activeCategoryName || activeCollectionName || (activeTag ? `#${activeTag}` : showFavoritesOnly ? '我的收藏' : '全部提示词')}
              </p>
            </div>
          </div>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setFilterOpen(true)}
            aria-label="筛选"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* 搜索栏（仅 home tab 显示） */}
        {activeTab === 'home' && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索提示词标题、内容、作者..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-10 rounded-full bg-muted/50 border-0"
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground touch-feedback"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ===== PC 端顶部栏（搜索 + 操作） ===== */}
      <header className="pc-only safe-top sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border h-16 items-center px-6 gap-4">
        <div className="flex-1 max-w-2xl relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索提示词标题、内容、作者..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-10 rounded-full bg-muted/50 border-0"
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAiGenerateOpen(true)} className="hidden lg:flex">
            <Wand2 className="w-4 h-4 mr-1" />AI 生成
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)} className="hidden lg:flex">
            <Check className="w-4 h-4 mr-1" />批量
          </Button>
          <Button size="sm" onClick={handleNewPrompt} className="bg-violet-500 hover:bg-violet-600">
            <Plus className="w-4 h-4 mr-1" />新建
          </Button>
        </div>
      </header>

      {/* ===== 主内容 ===== */}
      <main className="flex-1 overflow-y-auto pb-24 lg:pb-6 pc-main-with-sidebar">
        <div className="lg:max-w-6xl lg:mx-auto lg:px-6 lg:py-6">
          {activeTab === 'home' && (
            <HomeTab
              prompts={prompts}
              loading={loading}
              error={error}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={(id) => usePromptStore.getState().toggleSelected(id)}
              onCardClick={(p) => {
                if (selectionMode) {
                  usePromptStore.getState().toggleSelected(p.id)
                } else {
                  selectPrompt(p)
                  setDetailOpen(true)
                }
              }}
              onCopy={handleCopyPrompt}
              onEdit={handleEdit}
              onShare={handleShare}
              sortBy={sortBy}
              onSortChange={setSortBy}
              hasFilter={!!hasActiveFilter}
              onClearFilter={() => {
                setActiveCategoryId(null)
                setActiveCollectionId(null)
                setActiveTag(null)
                setShowFavoritesOnly(false)
              }}
              onBatchEdit={() => setBatchOpen(true)}
              onExitSelectionMode={() => {
                setSelectionMode(false)
                clearSelection()
              }}
              onSelectAll={selectAll}
              activeCategoryName={activeCategoryName}
              activeCollectionName={activeCollectionName}
              activeTag={activeTag}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesTab
              categories={categories}
              tags={tags}
              activeCategoryId={activeCategoryId}
              activeTag={activeTag}
              onSelectCategory={(id) => {
                setActiveCategoryId(id)
                setActiveTab('home')
              }}
              onSelectTag={(t) => {
                setActiveTag(t)
                setActiveTab('home')
              }}
            />
          )}

          {activeTab === 'collections' && (
            <CollectionsTab
              collections={collections}
              onSelectCollection={(id) => {
                setActiveCollectionId(id)
                setActiveTab('home')
              }}
              onManage={() => setCollectionOpen(true)}
            />
          )}

          {activeTab === 'stats' && <StatsTab />}

          {activeTab === 'settings' && (
            <SettingsTab
              onImportExport={() => setImportExportOpen(true)}
              onSync={() => setSyncOpen(true)}
              onManageCollections={() => setCollectionOpen(true)}
              onCheckUpdate={handleCheckUpdate}
              manualChecking={manualChecking}
              onThemeOpen={() => setThemeOpen(true)}
              onAuthOpen={() => setAuthOpen(true)}
              onFetchHot={handleFetchHot}
              fetchingHot={fetchingHot}
            />
          )}
        </div>
      </main>

      {/* ===== 悬浮新建按钮（移动端） ===== */}
      {activeTab === 'home' && !selectionMode && (
        <button
          onClick={handleNewPrompt}
          className="mobile-only fixed right-4 bottom-24 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center touch-feedback"
          aria-label="新建提示词"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* ===== 底部 Tab Bar（仅移动端） ===== */}
      <nav className="mobile-only safe-bottom fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around px-2 py-1">
          <TabButton
            icon={Home}
            label="提示词"
            active={activeTab === 'home'}
            onClick={() => setActiveTab('home')}
          />
          <TabButton
            icon={Library}
            label="分类"
            active={activeTab === 'categories'}
            onClick={() => setActiveTab('categories')}
          />
          <TabButton
            icon={FolderOpen}
            label="收藏夹"
            active={activeTab === 'collections'}
            onClick={() => setActiveTab('collections')}
          />
          <TabButton
            icon={BarChart3}
            label="统计"
            active={activeTab === 'stats'}
            onClick={() => setActiveTab('stats')}
          />
          <TabButton
            icon={Settings}
            label="设置"
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          />
        </div>
      </nav>

      {/* ===== 侧边筛选抽屉（仅移动端） ===== */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" className="w-[85vw] max-w-sm p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>筛选与操作</SheetTitle>
          </SheetHeader>
          <FilterDrawerContent
            onClose={() => setFilterOpen(false)}
            onAIGenerate={() => {
              setFilterOpen(false)
              setAiGenerateOpen(true)
            }}
            onImportExport={() => {
              setFilterOpen(false)
              setImportExportOpen(true)
            }}
            onSync={() => {
              setFilterOpen(false)
              setSyncOpen(true)
            }}
            onBatchMode={() => {
              setFilterOpen(false)
              setSelectionMode(true)
            }}
            onManageCollections={() => {
              setFilterOpen(false)
              setCollectionOpen(true)
            }}
            onShowFavorites={() => {
              setShowFavoritesOnly(!showFavoritesOnly)
              setFilterOpen(false)
              setActiveTab('home')
            }}
            showFavoritesOnly={showFavoritesOnly}
          />
        </SheetContent>
      </Sheet>

      {/* ===== 对话框 ===== */}
      <PromptFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
      />
      <PromptDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={handleEdit}
        onShare={handleShare}
      />
      <ImportExportDialog open={importExportOpen} onOpenChange={setImportExportOpen} />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} prompt={sharingPrompt} />
      <BatchEditDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        selectedIds={Array.from(selectedIds)}
      />
      <CollectionManagerDialog open={collectionOpen} onOpenChange={setCollectionOpen} />
      <CloudSyncDialog open={syncOpen} onOpenChange={setSyncOpen} />
      <AIGenerateDialog
        open={aiGenerateOpen}
        onOpenChange={setAiGenerateOpen}
        onApply={(data) => {
          setEditing(null)
          setFormOpen(true)
          sessionStorage.setItem('prompthub_prefill', JSON.stringify(data))
        }}
      />
      <UpdateDialog
        open={updateCheck.open}
        onOpenChange={updateCheck.setOpen}
        updateInfo={updateCheck.updateInfo}
      />
      <ThemeSwitcher open={themeOpen} onOpenChange={setThemeOpen} />
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onUserChange={() => setAuthed(isLoggedIn())}
      />
    </div>
  )
}

// ============================================
// PC 端 Sidebar 导航项
// ============================================
function PcNavItem({
  icon: Icon, label, active, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm touch-feedback text-left',
        active
          ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 font-medium'
          : 'text-foreground hover:bg-muted/50',
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
    </button>
  )
}

function PcCategoryItem({
  name, icon: Icon, color, count, active, onClick,
}: {
  name: string
  icon: React.ComponentType<{ className?: string }>
  color?: string | null
  count?: number
  active?: boolean
  onClick?: () => void
}) {
  const colorClass = getColorClass(color)
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] touch-feedback text-left',
        active ? 'bg-violet-50 dark:bg-violet-950/30 font-medium' : 'hover:bg-muted/50',
      )}
    >
      <div className={cn('w-5 h-5 rounded flex items-center justify-center shrink-0', colorClass.soft)}>
        <Icon className={cn('w-3 h-3', colorClass.text)} />
      </div>
      <span className="flex-1 truncate">{name}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] text-muted-foreground">{count}</span>
      )}
    </button>
  )
}

// ============================================
// 底部 Tab 按钮
// ============================================
function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg touch-feedback min-w-[60px]',
        active ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground',
      )}
    >
      <Icon className={cn('w-5 h-5', active && 'scale-110')} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}

// ============================================
// 首页 Tab：提示词卡片网格
// ============================================
function HomeTab({
  prompts, loading, error, selectionMode, selectedIds,
  onToggleSelect, onCardClick, onCopy, onEdit, onShare,
  sortBy, onSortChange, hasFilter, onClearFilter,
  onBatchEdit, onExitSelectionMode, onSelectAll,
  activeCategoryName, activeCollectionName, activeTag,
}: {
  prompts: Prompt[]
  loading: boolean
  error: string | null
  selectionMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onCardClick: (p: Prompt) => void
  onCopy: (p: Prompt) => void
  onEdit: (p: Prompt) => void
  onShare: (p: Prompt) => void
  sortBy: string
  onSortChange: (s: any) => void
  hasFilter: boolean
  onClearFilter: () => void
  onBatchEdit: () => void
  onExitSelectionMode: () => void
  onSelectAll: () => void
  activeCategoryName?: string | null
  activeCollectionName?: string | null
  activeTag?: string | null
}) {
  const sortOptions: Array<{ value: any; label: string; icon: any }> = [
    { value: 'pinned', label: '置顶优先', icon: Pin },
    { value: 'recent', label: '最近更新', icon: Clock },
    { value: 'usage', label: '使用最多', icon: TrendingUp },
    { value: 'rating', label: '评分最高', icon: Star },
  ]

  const currentTitle = activeCategoryName || activeCollectionName || (activeTag ? `#${activeTag}` : '全部提示词')

  if (selectionMode) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 bg-violet-50 dark:bg-violet-950/30 border-b">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onExitSelectionMode}>
              <X className="w-4 h-4 mr-1" />退出
            </Button>
            <span className="text-sm font-medium">已选 {selectedIds.size} 项</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onSelectAll}>
              全选
            </Button>
            <Button
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={onBatchEdit}
            >
              批量操作
            </Button>
          </div>
        </div>
        <PromptGrid
          prompts={prompts}
          loading={loading}
          error={error}
          selectionMode
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          onCardClick={onCardClick}
          onCopy={onCopy}
          onEdit={onEdit}
          onShare={onShare}
        />
      </div>
    )
  }

  return (
    <div className="px-4 py-3 lg:px-0 lg:py-0">
      {/* PC 端标题 */}
      <div className="hidden lg:flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">{currentTitle}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{prompts.length} 条提示词</p>
        </div>
      </div>

      {/* 排序与筛选 */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar lg:mb-4">
        {sortOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => onSortChange(opt.value)}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap touch-feedback',
              sortBy === opt.value
                ? 'bg-violet-500 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/70',
            )}
          >
            <opt.icon className="w-3 h-3" />
            {opt.label}
          </button>
        ))}
      </div>

      {hasFilter && (
        <div className="flex items-center gap-2 mb-3 text-xs">
          <span className="text-muted-foreground">已筛选</span>
          <button
            onClick={onClearFilter}
            className="px-2 py-0.5 rounded-full bg-muted text-foreground hover:bg-muted/70 touch-feedback flex items-center gap-1"
          >
            <X className="w-3 h-3" />清除
          </button>
        </div>
      )}

      <PromptGrid
        prompts={prompts}
        loading={loading}
        error={error}
        selectionMode={false}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onCardClick={onCardClick}
        onCopy={onCopy}
        onEdit={onEdit}
        onShare={onShare}
      />
    </div>
  )
}

function PromptGrid({
  prompts, loading, error, selectionMode, selectedIds,
  onToggleSelect, onCardClick, onCopy, onEdit, onShare,
}: {
  prompts: Prompt[]
  loading: boolean
  error: string | null
  selectionMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onCardClick: (p: Prompt) => void
  onCopy: (p: Prompt) => void
  onEdit: (p: Prompt) => void
  onShare: (p: Prompt) => void
}) {
  if (loading && prompts.length === 0) {
    return (
      <div className="grid pc-grid-2 lg:pc-grid-3 gap-3">
        {[1,2,3,4,5,6].map(i => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    )
  }
  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">{error}</p>
      </div>
    )
  }
  if (prompts.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-base font-medium mb-1">还没有提示词</p>
        <p className="text-xs text-muted-foreground">点击右下角 + 新建第一条</p>
      </div>
    )
  }

  return (
    <div className="grid pc-grid-2 lg:pc-grid-3 gap-3">
      {prompts.map(p => (
        <PromptCardMobile
          key={p.id}
          prompt={p}
          selectionMode={selectionMode}
          selected={selectedIds.has(p.id)}
          onToggleSelect={() => onToggleSelect(p.id)}
          onClick={() => onCardClick(p)}
          onCopy={() => onCopy(p)}
          onEdit={() => onEdit(p)}
          onShare={() => onShare(p)}
        />
      ))}
    </div>
  )
}

// ============================================
// 移动端提示词卡片
// ============================================
function PromptCardMobile({
  prompt, selectionMode, selected, onToggleSelect, onClick, onCopy, onEdit, onShare,
}: {
  prompt: Prompt
  selectionMode: boolean
  selected: boolean
  onToggleSelect: () => void
  onClick: () => void
  onCopy: () => void
  onEdit: () => void
  onShare: () => void
}) {
  const [expanded, setExpanded] = React.useState(false)
  // 找到分类（直接从 prompt.categoryId 在 store 中查找）
  const categories = usePromptStore(s => s.categories)
  const category = React.useMemo(() => {
    const find = (cats: typeof categories): any => {
      for (const c of cats) {
        if (c.id === prompt.categoryId) return c
        if (c.children) {
          const sub = find(c.children)
          if (sub) return sub
        }
      }
      return null
    }
    return find(categories)
  }, [categories, prompt.categoryId])

  const color = getColorClass(category?.color)

  const handleCardClick = () => {
    if (selectionMode) {
      onToggleSelect()
    } else if (expanded) {
      // 已展开时点击标题区折叠
      setExpanded(false)
    } else {
      // 折叠时点击展开（不打开详情抽屉）
      setExpanded(true)
    }
  }

  return (
    <div
      className={cn(
        'relative rounded-xl border bg-card p-4 touch-feedback prompt-card-pc transition-all',
        selected ? 'border-violet-500 ring-2 ring-violet-500/30' : 'border-border hover:border-primary/30',
        prompt.isPinned && 'ring-1 ring-amber-400/40',
        expanded && 'shadow-md',
      )}
    >
      {/* 背景色（如有） */}
      {prompt.background && prompt.background.type === 'color' && (
        <div
          className="absolute inset-0 rounded-xl opacity-10 pointer-events-none"
          style={{ background: prompt.background.value }}
        />
      )}

      <div className="relative">
        {/* 标题行（点击折叠/展开） */}
        <div
          className="flex items-start gap-2 mb-1.5 cursor-pointer"
          onClick={handleCardClick}
        >
          {selectionMode && (
            <div className={cn(
              'mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0',
              selected ? 'bg-violet-500 border-violet-500' : 'border-muted-foreground/30',
            )}>
              {selected && <Check className="w-3 h-3 text-white" />}
            </div>
          )}
          {/* 分类色条 */}
          {category && (
            <div className={cn('mt-1.5 w-1 h-4 rounded-full shrink-0', color.dot)} />
          )}
          <h3 className={cn(
            'flex-1 font-bold leading-tight transition-colors',
            'text-[15px] lg:text-base',
            'text-foreground hover:text-primary',
          )}>
            {prompt.title}
          </h3>
          {prompt.isPinned && (
            <Pin className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
          )}
          {prompt.isFavorite && (
            <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
          )}
          {!selectionMode && (
            <ChevronRight className={cn(
              'w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform',
              expanded && 'rotate-90',
            )} />
          )}
        </div>

        {/* 描述（醒目柔和） */}
        {prompt.description && (
          <p
            className="text-[13px] text-muted-foreground mb-2 leading-relaxed cursor-pointer"
            onClick={handleCardClick}
          >
            {prompt.description}
          </p>
        )}

        {/* 内容（默认折叠，点击展开后显示） */}
        {expanded && !selectionMode && (
          <div className="mb-3 mt-2 p-3 rounded-lg bg-muted/40 border border-border/50">
            <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed max-h-80 overflow-y-auto">
              {prompt.content}
            </pre>
            {/* 变量提示 */}
            {prompt.content.includes('{{') && (
              <div className="mt-2 text-[10px] text-muted-foreground">
                {'💡 含 {{变量}} 占位符，点击详情可填充'}
              </div>
            )}
          </div>
        )}

        {/* 标签 + 元数据 */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {category && (
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5', color.text, color.border)}>
              {category.name}
            </Badge>
          )}
          {(prompt.tags || []).slice(0, 3).map(t => (
            <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
              #{t}
            </Badge>
          ))}
          {(prompt.tags || []).length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{(prompt.tags || []).length - 3}</span>
          )}
        </div>

        {/* 底部操作行 */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            {prompt.rating > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                {prompt.rating}
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              {prompt.usageCount}
            </span>
            {prompt.author && (
              <span className="text-fade-1 max-w-[80px]">@{prompt.author}</span>
            )}
          </div>
          {!selectionMode && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onCopy() }}
                className="p-1.5 rounded-md hover:bg-muted touch-feedback"
                aria-label="复制"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit() }}
                className="p-1.5 rounded-md hover:bg-muted touch-feedback"
                aria-label="编辑"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onShare() }}
                className="p-1.5 rounded-md hover:bg-muted touch-feedback"
                aria-label="分享"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>
                </svg>
              </button>
              {/* 展开后显示详情按钮 */}
              {expanded && (
                <button
                  onClick={(e) => { e.stopPropagation(); onClick() }}
                  className="p-1.5 rounded-md hover:bg-muted touch-feedback text-primary"
                  aria-label="查看详情"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// 分类 Tab
// ============================================
function CategoriesTab({
  categories, tags, activeCategoryId, activeTag,
  onSelectCategory, onSelectTag,
}: {
  categories: any[]
  tags: Array<{ name: string; count: number }>
  activeCategoryId: string | null
  activeTag: string | null
  onSelectCategory: (id: string | null) => void
  onSelectTag: (t: string) => void
}) {
  return (
    <div className="px-4 py-3 space-y-4 lg:px-0 lg:py-0 lg:max-w-3xl">
      <div>
        <h2 className="text-sm font-bold mb-2 text-muted-foreground lg:text-xl lg:font-bold lg:text-foreground">分类</h2>
        <div className="space-y-1.5">
          <CategoryRow
            name="全部提示词"
            icon={Home}
            color="violet"
            active={!activeCategoryId}
            onClick={() => onSelectCategory(null)}
          />
          {categories.map(cat => (
            <div key={cat.id}>
              <CategoryRow
                name={cat.name}
                description={cat.description}
                icon={Library}
                color={cat.color}
                count={cat.promptCount}
                active={activeCategoryId === cat.id}
                onClick={() => onSelectCategory(cat.id)}
              />
              {cat.children && cat.children.length > 0 && (
                <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                  {cat.children.map((sub: any) => (
                    <CategoryRow
                      key={sub.id}
                      name={sub.name}
                      icon={ChevronRight}
                      color={sub.color}
                      count={sub.promptCount}
                      active={activeCategoryId === sub.id}
                      onClick={() => onSelectCategory(sub.id)}
                      small
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {tags.length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-2 text-muted-foreground">标签云</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map(t => (
              <button
                key={t.name}
                onClick={() => onSelectTag(t.name)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs touch-feedback',
                  activeTag === t.name
                    ? 'bg-violet-500 text-white'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                #{t.name} <span className="opacity-60">{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CategoryRow({
  name, description, icon: Icon, color, count, active, onClick, small,
}: {
  name: string
  description?: string | null
  icon: React.ComponentType<{ className?: string }>
  color?: string | null
  count?: number
  active: boolean
  onClick: () => void
  small?: boolean
}) {
  const colorClass = getColorClass(color)
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 rounded-lg touch-feedback text-left',
        small ? 'py-1.5 px-2' : 'p-2.5',
        active ? 'bg-violet-50 dark:bg-violet-950/30' : 'hover:bg-muted/50',
      )}
    >
      <div className={cn(
        'rounded-md flex items-center justify-center shrink-0',
        small ? 'w-6 h-6' : 'w-8 h-8',
        colorClass.soft,
      )}>
        <Icon className={cn(small ? 'w-3.5 h-3.5' : 'w-4 h-4', colorClass.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn('font-medium truncate', small ? 'text-xs' : 'text-sm')}>{name}</div>
        {description && !small && (
          <div className="text-[10px] text-muted-foreground truncate">{description}</div>
        )}
      </div>
      {count !== undefined && (
        <Badge variant="secondary" className="text-[10px] h-5">{count}</Badge>
      )}
    </button>
  )
}

// ============================================
// 收藏夹 Tab
// ============================================
function CollectionsTab({
  collections, onSelectCollection, onManage,
}: {
  collections: any[]
  onSelectCollection: (id: string) => void
  onManage: () => void
}) {
  return (
    <div className="px-4 py-3 lg:px-0 lg:py-0 lg:max-w-3xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold lg:text-xl">收藏夹</h2>
        <Button variant="ghost" size="sm" onClick={onManage}>
          <Settings className="w-4 h-4 mr-1" />管理
        </Button>
      </div>
      {collections.length === 0 ? (
        <div className="text-center py-12">
          <Folder className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground mb-3">还没有收藏夹</p>
          <Button size="sm" onClick={onManage}>创建收藏夹</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {collections.map(c => {
            const color = getColorClass(c.color)
            return (
              <button
                key={c.id}
                onClick={() => onSelectCollection(c.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card touch-feedback text-left"
              >
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', color.soft)}>
                  <Folder className={cn('w-5 h-5', colorClass(c))} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{c.name}</div>
                  {c.description && (
                    <div className="text-xs text-muted-foreground truncate">{c.description}</div>
                  )}
                </div>
                <Badge variant="secondary" className="h-5">{c.promptCount}</Badge>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function colorClass(c: any) {
  return getColorClass(c.color).text
}

// ============================================
// 统计 Tab
// ============================================
function StatsTab() {
  const fetchStats = usePromptStore(s => s.fetchStats)
  const [stats, setStats] = React.useState<any>(null)

  React.useEffect(() => {
    fetchStats().then(setStats)
  }, [fetchStats])

  if (!stats) {
    return <div className="p-4"><Skeleton className="h-32 w-full" /></div>
  }

  return (
    <div className="px-4 py-3 space-y-4 lg:px-0 lg:py-0 lg:max-w-3xl">
      <h2 className="text-sm font-bold lg:text-2xl">数据统计</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="提示词总数" value={stats.total} icon={Package} color="violet" />
        <StatCard label="收藏" value={stats.favorites} icon={Star} color="amber" />
        <StatCard label="置顶" value={stats.pinned} icon={Pin} color="rose" />
        <StatCard label="总使用次数" value={stats.totalUsage} icon={TrendingUp} color="emerald" />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">平均评分</span>
          <span className="text-2xl font-bold text-amber-500">{stats.avgRating}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5].map(i => (
            <Star
              key={i}
              className={cn(
                'w-4 h-4',
                i <= Math.round(stats.avgRating) ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30',
              )}
            />
          ))}
        </div>
      </div>

      {stats.topTags && stats.topTags.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">热门标签 Top 10</h3>
          <div className="flex flex-wrap gap-2">
            {stats.topTags.map((t: any) => (
              <Badge key={t.name} variant="secondary" className="text-xs">
                #{t.name} <span className="ml-1 opacity-60">{t.count}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label, value, icon: Icon, color,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  const colorClass = getColorClass(color)
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', colorClass.soft)}>
        <Icon className={cn('w-4 h-4', colorClass.text)} />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  )
}

// ============================================
// 设置 Tab
// ============================================
function SettingsTab({
  onImportExport, onSync, onManageCollections, onCheckUpdate, manualChecking,
  onThemeOpen, onAuthOpen, onFetchHot, fetchingHot,
}: {
  onImportExport: () => void
  onSync: () => void
  onManageCollections: () => void
  onCheckUpdate?: () => void
  manualChecking?: boolean
  onThemeOpen?: () => void
  onAuthOpen?: () => void
  onFetchHot?: () => void
  fetchingHot?: boolean
}) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  return (
    <div className="px-4 py-3 space-y-4 lg:px-0 lg:py-0 lg:max-w-2xl">
      <h2 className="text-sm font-bold lg:text-2xl">设置</h2>

      {/* 主题 */}
      <SettingsSection title="外观">
        <SettingsRow
          icon={mounted && theme === 'dark' ? Moon : Sun}
          title="深色模式"
          right={
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={cn(
                'w-12 h-7 rounded-full p-0.5 transition-colors',
                theme === 'dark' ? 'bg-violet-500' : 'bg-muted',
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-full bg-white transition-transform',
                theme === 'dark' ? 'translate-x-5' : '',
              )} />
            </button>
          }
        />
        {onThemeOpen && (
          <SettingsRow
            icon={Palette}
            title="切换主题（10 套）"
            subtitle="墨黑/樱花/薄荷/夕阳/深海/薰衣草/咖啡/雪白/丛林/玫瑰"
            onClick={onThemeOpen}
          />
        )}
      </SettingsSection>

      {/* 账号 */}
      {onAuthOpen && (
        <SettingsSection title="账号">
          <SettingsRow
            icon={UserIcon}
            title={isLoggedIn() ? (getCurrentUser()?.email || '已登录') : '登录 / 注册'}
            subtitle={isLoggedIn() ? '点击查看账号信息或登出' : '邮箱+密码，可跨设备同步数据'}
            onClick={onAuthOpen}
          />
        </SettingsSection>
      )}

      {/* AI 热门 */}
      {onFetchHot && (
        <SettingsSection title="AI 热门">
          <SettingsRow
            icon={Flame}
            title="AI 自动搜索热门提示词"
            subtitle={fetchingHot ? '正在搜索...' : '生成 10 条当月热门，存入"热门推荐"分类'}
            onClick={onFetchHot}
          />
        </SettingsSection>
      )}

      {/* AI 配置 */}
      <AIConfigSection />

      {/* 数据管理 */}
      <SettingsSection title="数据">
        <SettingsRow
          icon={Download}
          title="导入 / 导出"
          subtitle="备份或恢复提示词库"
          onClick={onImportExport}
        />
        <SettingsRow
          icon={Cloud}
          title="跨设备云同步"
          subtitle="用同步码在多设备间同步"
          onClick={onSync}
        />
        <SettingsRow
          icon={FolderOpen}
          title="收藏夹管理"
          onClick={onManageCollections}
        />
      </SettingsSection>

      {/* 关于 / 更新 */}
      <SettingsSection title="关于">
        {onCheckUpdate && (
          <SettingsRow
            icon={RefreshCw}
            title="检查更新"
            subtitle={manualChecking ? '正在检查...' : `当前版本 v${APP_VERSION}`}
            onClick={onCheckUpdate}
          />
        )}
        <SettingsRow
          icon={ExternalLink}
          title="GitHub 仓库"
          subtitle={GITHUB_REPO}
          onClick={() => window.open(`https://github.com/${GITHUB_REPO}`, '_blank', 'noopener,noreferrer')}
        />
        <SettingsRow
          icon={Monitor}
          title="PC 在线版"
          subtitle={`访问 https://wolf28014.github.io/${GITHUB_REPO.split('/')[1]}/`}
          onClick={() => window.open(`https://wolf28014.github.io/${GITHUB_REPO.split('/')[1]}/`, '_blank', 'noopener,noreferrer')}
        />
      </SettingsSection>

      <div className="text-center text-[10px] text-muted-foreground/60 pt-4">
        PromptHub v{APP_VERSION} · 安卓 + Web 通用版
      </div>
    </div>
  )
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground mb-2 px-1">{title}</h3>
      <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  )
}

function SettingsRow({
  icon: Icon, title, subtitle, right, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  right?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick && !right}
      className={cn(
        'w-full flex items-center gap-3 p-3 text-left',
        onClick && 'touch-feedback hover:bg-muted/50',
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
      </div>
      {right ?? (onClick && <ChevronRight className="w-4 h-4 text-muted-foreground" />)}
    </button>
  )
}

// ============================================
// AI 配置区
// ============================================
function AIConfigSection() {
  const [config, setConfig] = React.useState<AIConfig>(getAIConfig())
  const [open, setOpen] = React.useState(false)

  return (
    <SettingsSection title="AI 配置">
      <SettingsRow
        icon={Wand2}
        title="AI API 配置"
        subtitle={config.apiKey ? `已配置 (${config.model})` : '未配置（AI 功能不可用）'}
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>AI API 配置</DialogTitle>
            <DialogDescription>
              配置 Z.ai 或兼容 OpenAI 协议的 API，用于 AI 生成提示词、相似推荐等功能。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">API Key</label>
              <Input
                type="password"
                value={config.apiKey}
                onChange={e => setConfig(c => ({ ...c, apiKey: e.target.value }))}
                placeholder="sk-..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Base URL</label>
              <Input
                value={config.baseUrl}
                onChange={e => setConfig(c => ({ ...c, baseUrl: e.target.value }))}
                placeholder="https://api.z.ai/api/paas/v4"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">模型</label>
              <Input
                value={config.model}
                onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}
                placeholder="glm-4.6"
                className="mt-1"
              />
            </div>
            <div className="text-[11px] text-muted-foreground bg-muted/50 p-2 rounded-md">
              💡 推荐使用 <strong>Z.ai GLM-4.6</strong>：申请 Key 见
              <a href="https://z.ai" target="_blank" rel="noopener noreferrer" className="text-violet-500 ml-1">z.ai</a>
              。也兼容 OpenAI、DeepSeek、Moonshot 等协议。
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={() => {
              setAIConfig(config)
              setOpen(false)
            }}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  )
}

// ============================================
// 筛选抽屉内容
// ============================================
function FilterDrawerContent({
  onClose, onAIGenerate, onImportExport, onSync, onBatchMode, onManageCollections, onShowFavorites, showFavoritesOnly,
}: {
  onClose: () => void
  onAIGenerate: () => void
  onImportExport: () => void
  onSync: () => void
  onBatchMode: () => void
  onManageCollections: () => void
  onShowFavorites: () => void
  showFavoritesOnly: boolean
}) {
  const aiConfigured = isAIConfigured()
  return (
    <div className="p-2">
      <DrawerItem icon={Wand2} label="AI 生成提示词" subtitle={aiConfigured ? '用 AI 帮你写提示词' : '需先配置 AI API'} onClick={onAIGenerate} />
      <DrawerItem icon={Star} label="我的收藏" subtitle={showFavoritesOnly ? '正在显示' : '查看收藏的提示词'} onClick={onShowFavorites} />
      <DrawerItem icon={Check} label="批量编辑模式" subtitle="多选后批量加标签/删除" onClick={onBatchMode} />
      <DrawerItem icon={FolderOpen} label="收藏夹管理" subtitle="创建或删除收藏夹" onClick={onManageCollections} />
      <DrawerItem icon={Cloud} label="跨设备同步" subtitle="同步码导入导出" onClick={onSync} />
      <DrawerItem icon={Download} label="导入 / 导出" subtitle="JSON 备份恢复" onClick={onImportExport} />
    </div>
  )
}

function DrawerItem({
  icon: Icon, label, subtitle, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  subtitle?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg touch-feedback hover:bg-muted/50 text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  )
}
