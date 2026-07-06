// 客户端 SQLite 数据库层（基于 sql.js WASM）
// 替代原 Prisma + 服务端 SQLite 架构
//
// 注意：sql.js 默认 export 在 browser 环境下指向 sql-wasm-browser.js，
// 但该入口会查找 sql-wasm-browser.wasm，cdnjs 上没这个文件（只有 sql-wasm.wasm）。
// 所以我们显式 import sql-wasm.js 入口，它对应 cdnjs 上存在的 sql-wasm.wasm。

// @ts-expect-error - 显式指定入口
import initSqlJsBrowser from 'sql.js/dist/sql-wasm.js'
import { v4 as uuidv4 } from 'uuid'

const initSqlJs = initSqlJsBrowser as unknown as (config?: {
  locateFile?: (file: string) => string
}) => Promise<SqlJsStatic>

// ============================================
// 类型定义（与原 prompt-types.ts 兼容）
// ============================================
export type Category = {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  sortOrder: number
  parentId: string | null
  createdAt: string
  updatedAt: string
}

export type CategoryWithCount = Category & {
  promptCount: number
  children?: CategoryWithCount[]
}

export type Collection = {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type CollectionWithCount = Collection & {
  promptCount: number
}

export type Background = {
  type: 'color' | 'image'
  value: string
  name?: string
}

export type Prompt = {
  id: string
  title: string
  content: string
  description: string | null
  categoryId: string | null
  tags: string[]
  background: Background | null
  isFavorite: boolean
  isPinned: boolean
  usageCount: number
  rating: number
  author: string | null
  source: string | null
  sortOrder: number
  collectionId: string | null
  createdAt: string
  updatedAt: string
}

export type Version = {
  id: string
  promptId: string
  title: string
  content: string
  description: string | null
  tags: string[]
  versionNum: number
  changeNote: string | null
  createdAt: string
}

export type TagWithCount = {
  name: string
  count: number
}

// ============================================
// sql.js 单例
// ============================================
let SQL: SqlJsStatic | null = null
let db: Database | null = null
let initPromise: Promise<Database> | null = null

const DB_STORAGE_KEY = 'prompthub_db_v1'

// sql.js wasm 文件加载路径：Next.js 静态导出后从相对路径加载
async function loadSQL(): Promise<SqlJsStatic> {
  if (SQL) return SQL
  // 尝试从 CDN 加载 wasm（开发/预览环境）
  // 在 Android WebView 中，CDN 也能访问
  SQL = await initSqlJs({
    locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/${file}`,
  })
  return SQL
}

// 从 localStorage 加载已有数据库，或新建
async function loadDatabase(): Promise<Database> {
  const sql = await loadSQL()
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(DB_STORAGE_KEY) : null
  if (saved) {
    try {
      const binary = Uint8Array.from(atob(saved), c => c.charCodeAt(0))
      db = new sql.Database(binary)
    } catch (e) {
      console.error('Failed to load DB, creating new one:', e)
      db = new sql.Database()
    }
  } else {
    db = new sql.Database()
  }
  initSchema(db)
  return db
}

export async function getDB(): Promise<Database> {
  if (db) return db
  if (!initPromise) {
    initPromise = loadDatabase()
  }
  return initPromise
}

// 持久化到 localStorage
// 防抖 persist：避免频繁写入 localStorage 导致卡顿
let persistTimer: ReturnType<typeof setTimeout> | null = null
let pendingPersist = false

export async function persist(): Promise<void> {
  if (!db) return
  // 标记有待写入
  pendingPersist = true
  // 如果已有定时器，等待合并
  if (persistTimer) return
  // 立即执行一次（保证数据不丢），后续写入合并到 500ms 后
  await doPersist()
  // 设置防抖：500ms 内的多次 persist 合并为一次
  persistTimer = setTimeout(() => {
    persistTimer = null
    if (pendingPersist) {
      pendingPersist = false
      doPersist()
    }
  }, 500)
}

async function doPersist(): Promise<void> {
  if (!db) return
  pendingPersist = false
  const data = db.export()
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < data.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, data.subarray(i, i + chunkSize) as unknown as number[])
  }
  const encoded = btoa(binary)
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(DB_STORAGE_KEY, encoded)
    } catch (e) {
      console.warn('persist failed (localStorage full?):', e)
    }
  }
}

// ============================================
// 建表
// ============================================
function initSchema(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS category (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT,
      color TEXT,
      sortOrder INTEGER DEFAULT 0,
      parentId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_category_parent ON category(parentId);

    CREATE TABLE IF NOT EXISTS collection (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT 'Folder',
      color TEXT DEFAULT 'violet',
      sortOrder INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prompt (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      description TEXT,
      categoryId TEXT,
      tags TEXT DEFAULT '[]',
      background TEXT,
      isFavorite INTEGER DEFAULT 0,
      isPinned INTEGER DEFAULT 0,
      usageCount INTEGER DEFAULT 0,
      rating INTEGER DEFAULT 0,
      author TEXT,
      source TEXT,
      sortOrder INTEGER DEFAULT 0,
      collectionId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_prompt_category ON prompt(categoryId);
    CREATE INDEX IF NOT EXISTS idx_prompt_favorite ON prompt(isFavorite);
    CREATE INDEX IF NOT EXISTS idx_prompt_pinned ON prompt(isPinned);
    CREATE INDEX IF NOT EXISTS idx_prompt_collection ON prompt(collectionId);
    CREATE INDEX IF NOT EXISTS idx_prompt_sort ON prompt(sortOrder);
    CREATE INDEX IF NOT EXISTS idx_prompt_rating ON prompt(rating);

    CREATE TABLE IF NOT EXISTS version (
      id TEXT PRIMARY KEY,
      promptId TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      description TEXT,
      tags TEXT DEFAULT '[]',
      versionNum INTEGER DEFAULT 1,
      changeNote TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_version_prompt ON version(promptId);
  `)
}

// ============================================
// 工具函数
// ============================================
function nowISO(): string {
  return new Date().toISOString()
}

function parseTags(tagsStr: string | null | undefined): string[] {
  if (!tagsStr) return []
  try {
    const arr = JSON.parse(tagsStr)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function stringifyTags(tags: string[] | null | undefined): string {
  return JSON.stringify(tags || [])
}

function parseBackgroundStr(bgStr: string | null | undefined): Background | null {
  if (!bgStr) return null
  try {
    const parsed = JSON.parse(bgStr)
    if (parsed && typeof parsed === 'object' && (parsed.type === 'color' || parsed.type === 'image') && typeof parsed.value === 'string') {
      return parsed as Background
    }
  } catch {}
  return null
}

function stringifyBackground(bg: Background | null | undefined): string | null {
  if (!bg) return null
  return JSON.stringify(bg)
}

function rowToPrompt(row: Record<string, unknown>): Prompt {
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    description: (row.description as string) ?? null,
    categoryId: (row.categoryId as string) ?? null,
    tags: parseTags(row.tags as string),
    background: parseBackgroundStr(row.background as string),
    isFavorite: Boolean(row.isFavorite),
    isPinned: Boolean(row.isPinned),
    usageCount: row.usageCount as number,
    rating: row.rating as number,
    author: (row.author as string) ?? null,
    source: (row.source as string) ?? null,
    sortOrder: row.sortOrder as number,
    collectionId: (row.collectionId as string) ?? null,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  }
}

function rowToCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    icon: (row.icon as string) ?? null,
    color: (row.color as string) ?? null,
    sortOrder: row.sortOrder as number,
    parentId: (row.parentId as string) ?? null,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  }
}

function rowToCollection(row: Record<string, unknown>): Collection {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    icon: (row.icon as string) ?? null,
    color: (row.color as string) ?? null,
    sortOrder: row.sortOrder as number,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  }
}

function rowToVersion(row: Record<string, unknown>): Version {
  return {
    id: row.id as string,
    promptId: row.promptId as string,
    title: row.title as string,
    content: row.content as string,
    description: (row.description as string) ?? null,
    tags: parseTags(row.tags as string),
    versionNum: row.versionNum as number,
    changeNote: (row.changeNote as string) ?? null,
    createdAt: row.createdAt as string,
  }
}

function exec<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  if (!db) throw new Error('DB not initialized')
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows: T[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return rows
}

function run(sql: string, params: unknown[] = []): void {
  if (!db) throw new Error('DB not initialized')
  db.run(sql, params)
}

// ============================================
// Prompts CRUD
// ============================================
export type SortKey = 'pinned' | 'recent' | 'usage' | 'favorite' | 'custom' | 'rating'

export type PromptQuery = {
  sort?: SortKey
  categoryId?: string | null
  collectionId?: string | null
  favorite?: boolean
  q?: string
  tag?: string | null
}

export async function queryPrompts(q: PromptQuery): Promise<Prompt[]> {
  await getDB()
  let sql = 'SELECT * FROM prompt WHERE 1=1'
  const params: unknown[] = []
  if (q.categoryId) {
    sql += ' AND categoryId = ?'
    params.push(q.categoryId)
  }
  if (q.collectionId) {
    sql += ' AND collectionId = ?'
    params.push(q.collectionId)
  }
  if (q.favorite) {
    sql += ' AND isFavorite = 1'
  }
  if (q.tag) {
    sql += " AND tags LIKE ?"
    params.push(`%"${q.tag.replace(/"/g, '\\"')}"%`)
  }
  if (q.q && q.q.trim()) {
    sql += ' AND (title LIKE ? OR content LIKE ? OR description LIKE ? OR author LIKE ?)'
    const kw = `%${q.q.trim()}%`
    params.push(kw, kw, kw, kw)
  }
  switch (q.sort) {
    case 'recent':
      sql += ' ORDER BY updatedAt DESC'
      break
    case 'usage':
      sql += ' ORDER BY usageCount DESC, updatedAt DESC'
      break
    case 'favorite':
      sql += ' ORDER BY isFavorite DESC, rating DESC, updatedAt DESC'
      break
    case 'rating':
      sql += ' ORDER BY rating DESC, updatedAt DESC'
      break
    case 'custom':
      sql += ' ORDER BY sortOrder ASC, updatedAt DESC'
      break
    case 'pinned':
    default:
      sql += ' ORDER BY isPinned DESC, updatedAt DESC'
      break
  }
  return exec<Prompt>(sql, params).map(rowToPrompt)
}

export async function getPromptById(id: string): Promise<Prompt | null> {
  await getDB()
  const rows = exec<Prompt>('SELECT * FROM prompt WHERE id = ?', [id])
  return rows[0] ? rowToPrompt(rows[0]) : null
}

export type PromptInput = {
  title: string
  content: string
  description?: string | null
  categoryId?: string | null
  tags?: string[]
  background?: Background | null
  isPinned?: boolean
  isFavorite?: boolean
  author?: string | null
  source?: string | null
  collectionId?: string | null
}

export async function createPrompt(input: PromptInput): Promise<Prompt> {
  await getDB()
  const id = uuidv4()
  const now = nowISO()
  const prompt: Prompt = {
    id,
    title: input.title,
    content: input.content,
    description: input.description ?? null,
    categoryId: input.categoryId ?? null,
    tags: input.tags ?? [],
    background: input.background ?? null,
    isFavorite: input.isFavorite ?? false,
    isPinned: input.isPinned ?? false,
    usageCount: 0,
    rating: 0,
    author: input.author ?? null,
    source: input.source ?? null,
    sortOrder: 0,
    collectionId: input.collectionId ?? null,
    createdAt: now,
    updatedAt: now,
  }
  run(
    `INSERT INTO prompt (id, title, content, description, categoryId, tags, background, isFavorite, isPinned, usageCount, rating, author, source, sortOrder, collectionId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      prompt.id, prompt.title, prompt.content, prompt.description, prompt.categoryId,
      stringifyTags(prompt.tags), stringifyBackground(prompt.background),
      prompt.isFavorite ? 1 : 0, prompt.isPinned ? 1 : 0, prompt.usageCount, prompt.rating,
      prompt.author, prompt.source, prompt.sortOrder, prompt.collectionId,
      prompt.createdAt, prompt.updatedAt,
    ],
  )
  await persist()
  return prompt
}

export async function updatePrompt(id: string, input: Partial<PromptInput>): Promise<Prompt | null> {
  await getDB()
  const cur = await getPromptById(id)
  if (!cur) return null

  // 记录版本快照（标题/内容/描述/标签任一变更时）
  const willChangeContent =
    (input.title !== undefined && input.title !== cur.title) ||
    (input.content !== undefined && input.content !== cur.content) ||
    (input.description !== undefined && (input.description ?? null) !== cur.description) ||
    (input.tags !== undefined && JSON.stringify(input.tags) !== JSON.stringify(cur.tags))
  if (willChangeContent) {
    await createVersionSnapshot(cur)
  }

  const next: Prompt = {
    ...cur,
    ...input,
    tags: input.tags ?? cur.tags,
    background: input.background !== undefined ? input.background : cur.background,
    categoryId: input.categoryId !== undefined ? input.categoryId : cur.categoryId,
    collectionId: input.collectionId !== undefined ? input.collectionId : cur.collectionId,
    updatedAt: nowISO(),
  }
  run(
    `UPDATE prompt SET title=?, content=?, description=?, categoryId=?, tags=?, background=?, isFavorite=?, isPinned=?, usageCount=?, rating=?, author=?, source=?, sortOrder=?, collectionId=?, updatedAt=? WHERE id=?`,
    [
      next.title, next.content, next.description, next.categoryId,
      stringifyTags(next.tags), stringifyBackground(next.background),
      next.isFavorite ? 1 : 0, next.isPinned ? 1 : 0, next.usageCount, next.rating,
      next.author, next.source, next.sortOrder, next.collectionId, next.updatedAt, id,
    ],
  )
  await persist()
  return next
}

export async function deletePrompt(id: string): Promise<void> {
  await getDB()
  run('DELETE FROM version WHERE promptId = ?', [id])
  run('DELETE FROM prompt WHERE id = ?', [id])
  await persist()
}

export async function toggleFavorite(id: string): Promise<Prompt | null> {
  const cur = await getPromptById(id)
  if (!cur) return null
  return updatePrompt(id, { isFavorite: !cur.isFavorite })
}

export async function togglePin(id: string): Promise<Prompt | null> {
  const cur = await getPromptById(id)
  if (!cur) return null
  return updatePrompt(id, { isPinned: !cur.isPinned })
}

export async function incrementUsage(id: string): Promise<Prompt | null> {
  const cur = await getPromptById(id)
  if (!cur) return null
  return updatePrompt(id, { usageCount: cur.usageCount + 1 })
}

export async function setRating(id: string, rating: number): Promise<Prompt | null> {
  return updatePrompt(id, { rating: Math.max(0, Math.min(5, rating)) })
}

export async function reorderPrompts(items: Array<{ id: string; sortOrder: number }>): Promise<void> {
  await getDB()
  for (const it of items) {
    run('UPDATE prompt SET sortOrder = ? WHERE id = ?', [it.sortOrder, it.id])
  }
  await persist()
}

// ============================================
// 批量操作
// ============================================
export async function batchAddTags(ids: string[], tags: string[]): Promise<void> {
  await getDB()
  for (const id of ids) {
    const p = await getPromptById(id)
    if (!p) continue
    const set = new Set(p.tags)
    tags.forEach(t => set.add(t))
    run('UPDATE prompt SET tags = ?, updatedAt = ? WHERE id = ?', [stringifyTags(Array.from(set)), nowISO(), id])
  }
  await persist()
}

export async function batchRemoveTags(ids: string[], tags: string[]): Promise<void> {
  await getDB()
  const removeSet = new Set(tags)
  for (const id of ids) {
    const p = await getPromptById(id)
    if (!p) continue
    const next = p.tags.filter(t => !removeSet.has(t))
    run('UPDATE prompt SET tags = ?, updatedAt = ? WHERE id = ?', [stringifyTags(next), nowISO(), id])
  }
  await persist()
}

export async function batchSetCollection(ids: string[], collectionId: string | null): Promise<void> {
  await getDB()
  run('UPDATE prompt SET collectionId = ?, updatedAt = ? WHERE id IN (' + ids.map(() => '?').join(',') + ')', [collectionId, nowISO(), ...ids])
  await persist()
}

export async function batchDelete(ids: string[]): Promise<void> {
  await getDB()
  for (const id of ids) {
    run('DELETE FROM version WHERE promptId = ?', [id])
  }
  run('DELETE FROM prompt WHERE id IN (' + ids.map(() => '?').join(',') + ')', ids)
  await persist()
}

// ============================================
// Categories
// ============================================
export async function queryCategories(): Promise<CategoryWithCount[]> {
  await getDB()
  const cats = exec<Category>('SELECT * FROM category ORDER BY sortOrder ASC, name ASC').map(rowToCategory)
  // 统计每个分类下提示词数
  const counts = exec<{ categoryId: string; cnt: number }>(
    'SELECT categoryId, COUNT(*) as cnt FROM prompt WHERE categoryId IS NOT NULL GROUP BY categoryId',
  )
  const countMap = new Map<string, number>()
  for (const c of counts) {
    countMap.set(c.categoryId, c.cnt)
  }
  // 构建树
  const map = new Map<string, CategoryWithCount>()
  for (const c of cats) {
    map.set(c.id, { ...c, promptCount: countMap.get(c.id) ?? 0, children: [] })
  }
  const roots: CategoryWithCount[] = []
  for (const c of map.values()) {
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children!.push(c)
    } else {
      roots.push(c)
    }
  }
  return roots
}

export async function createCategory(input: {
  name: string
  description?: string
  icon?: string
  color?: string
  parentId?: string | null
}): Promise<Category> {
  await getDB()
  const id = uuidv4()
  const now = nowISO()
  const cat: Category = {
    id,
    name: input.name,
    description: input.description ?? null,
    icon: input.icon ?? null,
    color: input.color ?? null,
    sortOrder: 0,
    parentId: input.parentId ?? null,
    createdAt: now,
    updatedAt: now,
  }
  run(
    `INSERT INTO category (id, name, description, icon, color, sortOrder, parentId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [cat.id, cat.name, cat.description, cat.icon, cat.color, cat.sortOrder, cat.parentId, cat.createdAt, cat.updatedAt],
  )
  await persist()
  return cat
}

export async function deleteCategory(id: string): Promise<void> {
  await getDB()
  // 把该分类下的提示词 categoryId 置空
  run('UPDATE prompt SET categoryId = NULL WHERE categoryId = ?', [id])
  // 子分类提升到根（或一并删除）。这里采取提升策略，避免误删
  run('UPDATE category SET parentId = NULL WHERE parentId = ?', [id])
  run('DELETE FROM category WHERE id = ?', [id])
  await persist()
}

// ============================================
// Collections
// ============================================
export async function queryCollections(): Promise<CollectionWithCount[]> {
  await getDB()
  const cols = exec<Collection>('SELECT * FROM collection ORDER BY sortOrder ASC, name ASC').map(rowToCollection)
  const counts = exec<{ collectionId: string; cnt: number }>(
    'SELECT collectionId, COUNT(*) as cnt FROM prompt WHERE collectionId IS NOT NULL GROUP BY collectionId',
  )
  const countMap = new Map<string, number>()
  for (const c of counts) countMap.set(c.collectionId, c.cnt)
  return cols.map(c => ({ ...c, promptCount: countMap.get(c.id) ?? 0 }))
}

export async function createCollection(input: {
  name: string
  description?: string
  icon?: string
  color?: string
}): Promise<Collection> {
  await getDB()
  const id = uuidv4()
  const now = nowISO()
  const col: Collection = {
    id,
    name: input.name,
    description: input.description ?? null,
    icon: input.icon ?? 'Folder',
    color: input.color ?? 'violet',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  }
  run(
    `INSERT INTO collection (id, name, description, icon, color, sortOrder, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [col.id, col.name, col.description, col.icon, col.color, col.sortOrder, col.createdAt, col.updatedAt],
  )
  await persist()
  return col
}

export async function deleteCollection(id: string): Promise<void> {
  await getDB()
  run('UPDATE prompt SET collectionId = NULL WHERE collectionId = ?', [id])
  run('DELETE FROM collection WHERE id = ?', [id])
  await persist()
}

// ============================================
// Tags
// ============================================
export async function queryTags(): Promise<TagWithCount[]> {
  await getDB()
  const rows = exec<{ tags: string }>('SELECT tags FROM prompt')
  const map = new Map<string, number>()
  for (const r of rows) {
    for (const t of parseTags(r.tags)) {
      map.set(t, (map.get(t) ?? 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

// ============================================
// Versions
// ============================================
async function createVersionSnapshot(prompt: Prompt, changeNote?: string): Promise<Version> {
  await getDB()
  // 获取当前最大版本号
  const rows = exec<{ maxVer: number | null }>(
    'SELECT MAX(versionNum) as maxVer FROM version WHERE promptId = ?',
    [prompt.id],
  )
  const nextNum = (rows[0]?.maxVer ?? 0) + 1
  const id = uuidv4()
  const now = nowISO()
  const v: Version = {
    id,
    promptId: prompt.id,
    title: prompt.title,
    content: prompt.content,
    description: prompt.description,
    tags: prompt.tags,
    versionNum: nextNum,
    changeNote: changeNote ?? null,
    createdAt: now,
  }
  run(
    `INSERT INTO version (id, promptId, title, content, description, tags, versionNum, changeNote, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [v.id, v.promptId, v.title, v.content, v.description, stringifyTags(v.tags), v.versionNum, v.changeNote, v.createdAt],
  )
  await persist()
  return v
}

export async function queryVersions(promptId: string): Promise<Version[]> {
  await getDB()
  return exec<Version>('SELECT * FROM version WHERE promptId = ? ORDER BY versionNum DESC', [promptId]).map(rowToVersion)
}

export async function restoreVersion(promptId: string, versionId: string): Promise<Prompt | null> {
  await getDB()
  const rows = exec<Version>('SELECT * FROM version WHERE id = ? AND promptId = ?', [versionId, promptId])
  if (!rows[0]) return null
  const v = rowToVersion(rows[0])
  return updatePrompt(promptId, {
    title: v.title,
    content: v.content,
    description: v.description,
    tags: v.tags,
  })
}

// ============================================
// 导入 / 导出
// ============================================
export type ExportData = {
  prompts: Prompt[]
  categories: Category[]
  collections: Collection[]
  exportedAt: string
  version: 1
}

export async function exportAll(): Promise<ExportData> {
  await getDB()
  const prompts = exec<Prompt>('SELECT * FROM prompt').map(rowToPrompt)
  const categories = exec<Category>('SELECT * FROM category').map(rowToCategory)
  const collections = exec<Collection>('SELECT * FROM collection').map(rowToCollection)
  return {
    prompts,
    categories,
    collections,
    exportedAt: nowISO(),
    version: 1,
  }
}

export async function importData(
  data: Partial<ExportData>,
  mode: 'merge' | 'replace' = 'merge',
): Promise<{ imported: number; skipped: number }> {
  await getDB()
  let imported = 0
  let skipped = 0

  if (mode === 'replace') {
    run('DELETE FROM version')
    run('DELETE FROM prompt')
    run('DELETE FROM category')
    run('DELETE FROM collection')
  }

  // 导入分类（按 id 去重）
  if (data.categories) {
    for (const c of data.categories) {
      const exists = exec('SELECT id FROM category WHERE id = ?', [c.id])
      if (exists.length) {
        if (mode === 'merge') {
          skipped++
          continue
        }
      }
      run(
        `INSERT OR REPLACE INTO category (id, name, description, icon, color, sortOrder, parentId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.name, c.description, c.icon, c.color, c.sortOrder, c.parentId, c.createdAt, c.updatedAt],
      )
      imported++
    }
  }

  // 导入收藏夹
  if (data.collections) {
    for (const c of data.collections) {
      const exists = exec('SELECT id FROM collection WHERE id = ?', [c.id])
      if (exists.length && mode === 'merge') {
        skipped++
        continue
      }
      run(
        `INSERT OR REPLACE INTO collection (id, name, description, icon, color, sortOrder, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.name, c.description, c.icon, c.color, c.sortOrder, c.createdAt, c.updatedAt],
      )
      imported++
    }
  }

  // 导入提示词
  if (data.prompts) {
    for (const p of data.prompts) {
      const exists = exec('SELECT id FROM prompt WHERE id = ?', [p.id])
      if (exists.length && mode === 'merge') {
        skipped++
        continue
      }
      run(
        `INSERT OR REPLACE INTO prompt (id, title, content, description, categoryId, tags, background, isFavorite, isPinned, usageCount, rating, author, source, sortOrder, collectionId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id, p.title, p.content, p.description, p.categoryId,
          stringifyTags(p.tags), stringifyBackground(p.background),
          p.isFavorite ? 1 : 0, p.isPinned ? 1 : 0, p.usageCount, p.rating,
          p.author, p.source, p.sortOrder, p.collectionId, p.createdAt, p.updatedAt,
        ],
      )
      imported++
    }
  }
  await persist()
  return { imported, skipped }
}

// ============================================
// 统计
// ============================================
export async function getStats(): Promise<{
  total: number
  favorites: number
  pinned: number
  totalUsage: number
  avgRating: number
  byCategory: Array<{ categoryId: string; count: number }>
  topTags: TagWithCount[]
}> {
  await getDB()
  const total = exec<{ cnt: number }>('SELECT COUNT(*) as cnt FROM prompt')[0]?.cnt ?? 0
  const favorites = exec<{ cnt: number }>('SELECT COUNT(*) as cnt FROM prompt WHERE isFavorite = 1')[0]?.cnt ?? 0
  const pinned = exec<{ cnt: number }>('SELECT COUNT(*) as cnt FROM prompt WHERE isPinned = 1')[0]?.cnt ?? 0
  const totalUsage = exec<{ s: number }>('SELECT COALESCE(SUM(usageCount), 0) as s FROM prompt')[0]?.s ?? 0
  const avgRow = exec<{ a: number }>('SELECT COALESCE(AVG(rating), 0) as a FROM prompt WHERE rating > 0')[0]
  const avgRating = avgRow ? Number((avgRow.a as number).toFixed(2)) : 0
  const byCategory = exec<{ categoryId: string; count: number }>(
    "SELECT categoryId, COUNT(*) as count FROM prompt WHERE categoryId IS NOT NULL GROUP BY categoryId",
  ).map(r => ({ categoryId: r.categoryId as string, count: r.count as number }))
  const topTags = (await queryTags()).slice(0, 10)
  return { total, favorites, pinned, totalUsage, avgRating, byCategory, topTags }
}

// ============================================
// 重置数据库
// ============================================
export async function resetDB(): Promise<void> {
  await getDB()
  run('DELETE FROM version')
  run('DELETE FROM prompt')
  run('DELETE FROM category')
  run('DELETE FROM collection')
  await persist()
}
