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
  Package, Trash2, Eye,
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
import { getColorClass, copyToClipboard, type Prompt } from '@/lib/prompt-types'
import { getAIConfig, setAIConfig, isAIConfigured, type AIConfig } from '@/lib/client/ai'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

// ============================================
// 主页：移动端布局
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

  // 初始化数据库
  React.useEffect(() => {
    initialize()
  }, [initialize])

  // 切换筛选条件时重新拉取（必须在条件 return 之前）
  React.useEffect(() => {
    if (activeTab === 'home') {
      fetchPrompts()
    }
  }, [activeTab, searchQuery, sortBy, showFavoritesOnly, activeCategoryId, activeCollectionId, activeTag, fetchPrompts])

  // 所有 useMemo 必须在条件 return 之前
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ===== 顶部栏 ===== */}
      <header className="safe-top sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
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

      {/* ===== 主内容 ===== */}
      <main className="flex-1 overflow-y-auto pb-24">
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
          />
        )}
      </main>

      {/* ===== 悬浮新建按钮 ===== */}
      {activeTab === 'home' && !selectionMode && (
        <button
          onClick={handleNewPrompt}
          className="fixed right-4 bottom-24 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center touch-feedback"
          aria-label="新建提示词"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* ===== 底部 Tab Bar ===== */}
      <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t border-border">
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

      {/* ===== 侧边筛选抽屉 ===== */}
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
      <BatchEditDialog open={batchOpen} onOpenChange={setBatchOpen} />
      <CollectionManagerDialog open={collectionOpen} onOpenChange={setCollectionOpen} />
      <CloudSyncDialog open={syncOpen} onOpenChange={setSyncOpen} />
      <AIGenerateDialog
        open={aiGenerateOpen}
        onOpenChange={setAiGenerateOpen}
        onApply={(data) => {
          setEditing(null)
          setFormOpen(true)
          // 通过 sessionStorage 把数据传给表单
          sessionStorage.setItem('prompthub_prefill', JSON.stringify(data))
        }}
      />
    </div>
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
}) {
  const sortOptions: Array<{ value: any; label: string; icon: any }> = [
    { value: 'pinned', label: '置顶优先', icon: Pin },
    { value: 'recent', label: '最近更新', icon: Clock },
    { value: 'usage', label: '使用最多', icon: TrendingUp },
    { value: 'rating', label: '评分最高', icon: Star },
  ]

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
    <div className="px-4 py-3">
      {/* 排序与筛选 */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar">
        {sortOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => onSortChange(opt.value)}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap touch-feedback',
              sortBy === opt.value
                ? 'bg-violet-500 text-white'
                : 'bg-muted text-muted-foreground',
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
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
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
    <div className="space-y-3">
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

  return (
    <div
      className={cn(
        'relative rounded-xl border bg-card p-4 touch-feedback',
        selected ? 'border-violet-500 ring-2 ring-violet-500/30' : 'border-border',
        prompt.isPinned && 'ring-1 ring-amber-400/40',
      )}
      onClick={selectionMode ? onToggleSelect : onClick}
    >
      {/* 背景色（如有） */}
      {prompt.background && prompt.background.type === 'color' && (
        <div
          className="absolute inset-0 rounded-xl opacity-10 pointer-events-none"
          style={{ background: prompt.background.value }}
        />
      )}

      <div className="relative">
        {/* 标题行 */}
        <div className="flex items-start gap-2 mb-1.5">
          {selectionMode && (
            <div className={cn(
              'mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0',
              selected ? 'bg-violet-500 border-violet-500' : 'border-muted-foreground/30',
            )}>
              {selected && <Check className="w-3 h-3 text-white" />}
            </div>
          )}
          <h3 className="flex-1 font-semibold text-sm leading-snug text-fade-2">
            {prompt.title}
          </h3>
          {prompt.isPinned && (
            <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
          )}
          {prompt.isFavorite && (
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
          )}
        </div>

        {/* 描述 */}
        {prompt.description && (
          <p className="text-xs text-muted-foreground mb-2 text-fade-2">{prompt.description}</p>
        )}

        {/* 内容预览 */}
        <p className="text-xs text-muted-foreground/80 mb-3 text-fade-3 font-mono leading-relaxed">
          {prompt.content}
        </p>

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
    <div className="px-4 py-3 space-y-4">
      <div>
        <h2 className="text-sm font-bold mb-2 text-muted-foreground">分类</h2>
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
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold">收藏夹</h2>
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
    <div className="px-4 py-3 space-y-4">
      <h2 className="text-sm font-bold">数据统计</h2>

      <div className="grid grid-cols-2 gap-3">
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
  onImportExport, onSync, onManageCollections,
}: {
  onImportExport: () => void
  onSync: () => void
  onManageCollections: () => void
}) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  return (
    <div className="px-4 py-3 space-y-4">
      <h2 className="text-sm font-bold">设置</h2>

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
      </SettingsSection>

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

      <div className="text-center text-[10px] text-muted-foreground/60 pt-4">
        PromptHub Android v1.0.0
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
