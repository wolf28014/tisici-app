'use client'

import { create } from 'zustand'
import {
  queryPrompts,
  queryCategories,
  queryCollections,
  queryTags,
  createPrompt as dbCreate,
  updatePrompt as dbUpdate,
  deletePrompt as dbDelete,
  toggleFavorite as dbToggleFav,
  togglePin as dbTogglePin,
  incrementUsage as dbIncUsage,
  setRating as dbSetRating,
  reorderPrompts as dbReorder,
  batchAddTags as dbBatchAddTags,
  batchRemoveTags as dbBatchRemoveTags,
  batchSetCollection as dbBatchSetCollection,
  batchDelete as dbBatchDelete,
  createCollection as dbCreateCollection,
  deleteCollection as dbDeleteCollection,
  queryVersions as dbQueryVersions,
  restoreVersion as dbRestoreVersion,
  exportAll,
  importData,
  getStats,
  type Prompt,
  type CategoryWithCount,
  type CollectionWithCount,
  type TagWithCount,
  type Version,
  type Background,
  type SortKey,
  type PromptInput,
} from '@/lib/client/db'
import { aiGeneratePrompt, aiFindSimilar, aiRecommendBackground, type GeneratedPrompt, type SimilarPrompt, type AIBackgroundRecommend } from '@/lib/client/ai'
import { generateSyncCode, applySyncCode } from '@/lib/client/sync'
import { seedIfEmpty } from '@/lib/client/seed'

type PromptStore = {
  // data
  prompts: Prompt[]
  categories: CategoryWithCount[]
  collections: CollectionWithCount[]
  tags: TagWithCount[]
  loading: boolean
  error: string | null
  initialized: boolean

  // filters
  searchQuery: string
  activeCategoryId: string | null
  activeCollectionId: string | null
  activeTag: string | null
  showFavoritesOnly: boolean
  sortBy: SortKey

  expandedCategoryIds: Set<string>

  selectedPromptId: string | null
  selectedPrompt: Prompt | null

  selectionMode: boolean
  selectedIds: Set<string>

  // setters
  setSearchQuery: (q: string) => void
  setActiveCategoryId: (id: string | null) => void
  setActiveCollectionId: (id: string | null) => void
  setActiveTag: (tag: string | null) => void
  setShowFavoritesOnly: (b: boolean) => void
  setSortBy: (s: SortKey) => void
  toggleCategoryExpanded: (id: string) => void

  selectPrompt: (p: Prompt | null) => void

  setSelectionMode: (b: boolean) => void
  toggleSelected: (id: string) => void
  selectAll: () => void
  clearSelection: () => void

  // init
  initialize: () => Promise<void>
  refreshAll: () => Promise<void>
  fetchPrompts: () => Promise<void>
  fetchCategories: () => Promise<void>
  fetchCollections: () => Promise<void>
  fetchTags: () => Promise<void>

  // CRUD
  createPrompt: (input: PromptInput) => Promise<boolean>
  updatePrompt: (id: string, input: Partial<PromptInput>) => Promise<boolean>
  deletePrompt: (id: string) => Promise<boolean>
  toggleFavorite: (id: string) => Promise<void>
  togglePin: (id: string) => Promise<void>
  incrementUsage: (id: string) => Promise<void>
  setRating: (id: string, rating: number) => Promise<void>

  reorderPrompts: (orderedIds: string[]) => Promise<void>

  batchAddTags: (ids: string[], tags: string[]) => Promise<boolean>
  batchRemoveTags: (ids: string[], tags: string[]) => Promise<boolean>
  batchSetCollection: (ids: string[], collectionId: string | null) => Promise<boolean>
  batchDelete: (ids: string[]) => Promise<boolean>

  createCollection: (input: { name: string; description?: string; icon?: string; color?: string }) => Promise<boolean>
  deleteCollection: (id: string) => Promise<boolean>

  // AI
  recommendBackground: (title: string, content: string, description?: string) => Promise<AIBackgroundRecommend | null>
  generatePrompt: (description: string, style: 'detailed' | 'concise' | 'creative') => Promise<GeneratedPrompt | null>
  findSimilar: (promptId: string) => Promise<SimilarPrompt[] | null>

  // Versions
  fetchVersions: (promptId: string) => Promise<{ versions: Version[]; current: { title: string; content: string; description: string | null; tags: string[] } } | null>
  restoreVersion: (promptId: string, versionId: string) => Promise<boolean>

  // Sync
  generateSyncCode: () => Promise<string | null>
  applySyncCode: (code: string, mode?: 'merge' | 'replace') => Promise<{ imported: number; skipped: number } | null>

  // import/export
  exportData: () => Promise<void>
  importData: (data: unknown, mode: 'merge' | 'replace') => Promise<{ imported: number; skipped: number } | null>

  // Stats
  fetchStats: () => Promise<ReturnType<typeof getStats>>
}

export const usePromptStore = create<PromptStore>((set, get) => ({
  prompts: [],
  categories: [],
  collections: [],
  tags: [],
  loading: false,
  error: null,
  initialized: false,

  searchQuery: '',
  activeCategoryId: null,
  activeCollectionId: null,
  activeTag: null,
  showFavoritesOnly: false,
  sortBy: 'pinned',

  expandedCategoryIds: new Set<string>(),
  selectedPromptId: null,
  selectedPrompt: null,
  selectionMode: false,
  selectedIds: new Set<string>(),

  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveCategoryId: (id) =>
    set({
      activeCategoryId: id,
      activeTag: id ? null : get().activeTag,
      activeCollectionId: id ? null : get().activeCollectionId,
    }),
  setActiveCollectionId: (id) =>
    set({
      activeCollectionId: id,
      activeCategoryId: id ? null : get().activeCategoryId,
      activeTag: id ? null : get().activeTag,
    }),
  setActiveTag: (tag) =>
    set({
      activeTag: tag,
      activeCategoryId: tag ? null : get().activeCategoryId,
      activeCollectionId: tag ? null : get().activeCollectionId,
    }),
  setShowFavoritesOnly: (b) => set({ showFavoritesOnly: b }),
  setSortBy: (s) => set({ sortBy: s }),
  toggleCategoryExpanded: (id) => {
    const cur = new Set(get().expandedCategoryIds)
    if (cur.has(id)) cur.delete(id)
    else cur.add(id)
    set({ expandedCategoryIds: cur })
  },

  selectPrompt: (p) => set({ selectedPrompt: p, selectedPromptId: p?.id ?? null }),

  setSelectionMode: (b) =>
    set({ selectionMode: b, selectedIds: b ? get().selectedIds : new Set() }),
  toggleSelected: (id) => {
    const cur = new Set(get().selectedIds)
    if (cur.has(id)) cur.delete(id)
    else cur.add(id)
    set({ selectedIds: cur })
  },
  selectAll: () => set({ selectedIds: new Set(get().prompts.map((p) => p.id)) }),
  clearSelection: () => set({ selectedIds: new Set() }),

  initialize: async () => {
    if (get().initialized) return
    set({ loading: true, error: null })
    try {
      await seedIfEmpty()
      await get().refreshAll()
      set({ initialized: true, loading: false })
    } catch (e) {
      set({ loading: false, error: (e as Error).message })
    }
  },

  refreshAll: async () => {
    await Promise.all([
      get().fetchPrompts(),
      get().fetchCategories(),
      get().fetchCollections(),
      get().fetchTags(),
    ])
  },

  fetchPrompts: async () => {
    set({ loading: true, error: null })
    try {
      const { sortBy, activeCategoryId, activeCollectionId, showFavoritesOnly, searchQuery, activeTag } = get()
      const prompts = await queryPrompts({
        sort: sortBy,
        categoryId: activeCategoryId,
        collectionId: activeCollectionId,
        favorite: showFavoritesOnly,
        q: searchQuery,
        tag: activeTag,
      })
      set({ prompts, loading: false })
    } catch (e) {
      set({ loading: false, error: (e as Error).message })
    }
  },

  fetchCategories: async () => {
    try {
      const categories = await queryCategories()
      set({ categories })
    } catch (e) {
      console.error(e)
    }
  },

  fetchTags: async () => {
    try {
      const tags = await queryTags()
      set({ tags })
    } catch (e) {
      console.error(e)
    }
  },

  fetchCollections: async () => {
    try {
      const collections = await queryCollections()
      set({ collections })
    } catch (e) {
      console.error(e)
    }
  },

  fetchStats: async () => {
    return await getStats()
  },

  createPrompt: async (input) => {
    try {
      const prompt = await dbCreate(input)
      set({ prompts: [prompt, ...get().prompts] })
      await Promise.all([get().fetchCategories(), get().fetchTags()])
      return true
    } catch (e) {
      set({ error: (e as Error).message })
      return false
    }
  },

  updatePrompt: async (id, input) => {
    try {
      const next = await dbUpdate(id, input)
      if (!next) return false
      set({
        prompts: get().prompts.map((p) => (p.id === id ? next : p)),
        selectedPrompt: get().selectedPromptId === id ? next : get().selectedPrompt,
      })
      await Promise.all([get().fetchCategories(), get().fetchTags()])
      return true
    } catch (e) {
      set({ error: (e as Error).message })
      return false
    }
  },

  deletePrompt: async (id) => {
    try {
      await dbDelete(id)
      set({
        prompts: get().prompts.filter((p) => p.id !== id),
        selectedPrompt: get().selectedPromptId === id ? null : get().selectedPrompt,
        selectedPromptId: get().selectedPromptId === id ? null : get().selectedPromptId,
      })
      await Promise.all([get().fetchCategories(), get().fetchTags()])
      return true
    } catch (e) {
      set({ error: (e as Error).message })
      return false
    }
  },

  toggleFavorite: async (id) => {
    const prev = get().prompts
    set({
      prompts: prev.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p)),
    })
    try {
      const next = await dbToggleFav(id)
      if (next) {
        set({
          prompts: get().prompts.map((p) => (p.id === id ? next : p)),
          selectedPrompt: get().selectedPromptId === id ? next : get().selectedPrompt,
        })
      }
    } catch {
      set({ prompts: prev })
    }
  },

  togglePin: async (id) => {
    const prev = get().prompts
    set({
      prompts: prev.map((p) => (p.id === id ? { ...p, isPinned: !p.isPinned } : p)),
    })
    try {
      const next = await dbTogglePin(id)
      if (next) {
        set({
          prompts: get().prompts.map((p) => (p.id === id ? next : p)),
          selectedPrompt: get().selectedPromptId === id ? next : get().selectedPrompt,
        })
      }
    } catch {
      set({ prompts: prev })
    }
  },

  incrementUsage: async (id) => {
    try {
      const next = await dbIncUsage(id)
      if (next) {
        set({
          prompts: get().prompts.map((p) => (p.id === id ? next : p)),
          selectedPrompt: get().selectedPromptId === id ? next : get().selectedPrompt,
        })
      }
    } catch (e) {
      console.error(e)
    }
  },

  setRating: async (id, rating) => {
    const prev = get().prompts
    set({ prompts: prev.map((p) => (p.id === id ? { ...p, rating } : p)) })
    try {
      const next = await dbSetRating(id, rating)
      if (next) {
        set({
          prompts: get().prompts.map((p) => (p.id === id ? next : p)),
          selectedPrompt: get().selectedPromptId === id ? next : get().selectedPrompt,
        })
      }
    } catch {
      set({ prompts: prev })
    }
  },

  reorderPrompts: async (orderedIds) => {
    const prevPrompts = get().prompts
    const map = new Map(prevPrompts.map((p) => [p.id, p]))
    const reordered = orderedIds
      .map((id, idx) => {
        const p = map.get(id)
        return p ? { ...p, sortOrder: idx } : null
      })
      .filter(Boolean) as Prompt[]
    set({ prompts: reordered })
    try {
      await dbReorder(orderedIds.map((id, idx) => ({ id, sortOrder: idx })))
    } catch (e) {
      set({ prompts: prevPrompts, error: (e as Error).message })
    }
  },

  batchAddTags: async (ids, tags) => {
    try {
      await dbBatchAddTags(ids, tags)
      await Promise.all([get().fetchTags(), get().fetchPrompts()])
      return true
    } catch (e) {
      set({ error: (e as Error).message })
      return false
    }
  },

  batchRemoveTags: async (ids, tags) => {
    try {
      await dbBatchRemoveTags(ids, tags)
      await Promise.all([get().fetchTags(), get().fetchPrompts()])
      return true
    } catch (e) {
      set({ error: (e as Error).message })
      return false
    }
  },

  batchSetCollection: async (ids, collectionId) => {
    try {
      await dbBatchSetCollection(ids, collectionId)
      await Promise.all([get().fetchCollections(), get().fetchPrompts()])
      return true
    } catch (e) {
      set({ error: (e as Error).message })
      return false
    }
  },

  batchDelete: async (ids) => {
    try {
      await dbBatchDelete(ids)
      set({
        prompts: get().prompts.filter((p) => !ids.includes(p.id)),
        selectedIds: new Set(),
        selectionMode: false,
      })
      await Promise.all([get().fetchCategories(), get().fetchTags(), get().fetchCollections()])
      return true
    } catch (e) {
      set({ error: (e as Error).message })
      return false
    }
  },

  createCollection: async (input) => {
    try {
      await dbCreateCollection(input)
      await get().fetchCollections()
      return true
    } catch (e) {
      set({ error: (e as Error).message })
      return false
    }
  },

  deleteCollection: async (id) => {
    try {
      await dbDeleteCollection(id)
      await Promise.all([get().fetchCollections(), get().fetchPrompts()])
      return true
    } catch (e) {
      set({ error: (e as Error).message })
      return false
    }
  },

  recommendBackground: async (title, content, description) => {
    try {
      return await aiRecommendBackground(title, content, description)
    } catch (e) {
      set({ error: (e as Error).message })
      return null
    }
  },

  generatePrompt: async (description, style) => {
    try {
      return await aiGeneratePrompt(description, style)
    } catch (e) {
      set({ error: (e as Error).message })
      return null
    }
  },

  findSimilar: async (promptId) => {
    try {
      const target = get().prompts.find((p) => p.id === promptId)
      if (!target) return null
      const candidates = get().prompts.filter((p) => p.id !== promptId).slice(0, 30)
      return await aiFindSimilar(
        { title: target.title, content: target.content, description: target.description, tags: target.tags },
        candidates.map((c) => ({ id: c.id, title: c.title, content: c.content, description: c.description, tags: c.tags })),
      )
    } catch (e) {
      set({ error: (e as Error).message })
      return null
    }
  },

  fetchVersions: async (promptId) => {
    try {
      const versions = await dbQueryVersions(promptId)
      const cur = get().prompts.find((p) => p.id === promptId)
      return {
        versions,
        current: {
          title: cur?.title ?? '',
          content: cur?.content ?? '',
          description: cur?.description ?? null,
          tags: cur?.tags ?? [],
        },
      }
    } catch (e) {
      set({ error: (e as Error).message })
      return null
    }
  },

  restoreVersion: async (promptId, versionId) => {
    try {
      const next = await dbRestoreVersion(promptId, versionId)
      if (!next) return false
      set({
        prompts: get().prompts.map((p) => (p.id === promptId ? next : p)),
        selectedPrompt: get().selectedPromptId === promptId ? next : get().selectedPrompt,
      })
      return true
    } catch (e) {
      set({ error: (e as Error).message })
      return false
    }
  },

  generateSyncCode: async () => {
    try {
      return await generateSyncCode()
    } catch (e) {
      set({ error: (e as Error).message })
      return null
    }
  },

  applySyncCode: async (code, mode = 'merge') => {
    try {
      const result = await applySyncCode(code, mode)
      await get().refreshAll()
      return result
    } catch (e) {
      set({ error: (e as Error).message })
      return null
    }
  },

  exportData: async () => {
    try {
      const data = await exportAll()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prompthub-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      set({ error: (e as Error).message })
    }
  },

  importData: async (data, mode) => {
    try {
      const result = await importData(data as Parameters<typeof importData>[0], mode)
      await Promise.all([get().fetchCategories(), get().fetchTags(), get().fetchPrompts(), get().fetchCollections()])
      return result
    } catch (e) {
      set({ error: (e as Error).message })
      return null
    }
  },
}))

export type { SortKey, Prompt, CategoryWithCount, CollectionWithCount, TagWithCount, Version, Background, PromptInput }
