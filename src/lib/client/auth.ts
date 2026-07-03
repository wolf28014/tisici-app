// 云端账号系统：邮箱+密码注册登录
// 使用 GitHub Gist 作为免费云端存储（无需服务器）
// 账号信息（邮箱+密码哈希+同步码）存到 Gist，跨设备可用
//
// 原理：
// 1. 用一个固定的 Gist ID 作为"账号数据库"
// 2. 注册时：把用户信息追加到 Gist 的 JSON 文件中
// 3. 登录时：从 Gist 读取用户信息验证
// 4. 用户数据通过同步码（base64）跨设备同步
//
// 注意：Gist 是公开的，所以密码用 SHA-256 哈希存储，不存明文
// 同步码包含用户所有提示词数据，也是公开的（但 base64 编码，不易直接读取）

export type User = {
  email: string
  passwordHash: string
  createdAt: string
  syncCode?: string  // 用户数据的 base64 编码
  lastLoginAt?: string
  dataUpdatedAt?: string
}

export type AuthResult = {
  success: boolean
  message: string
  user?: User
  needsSync?: boolean  // 登录后是否需要拉取云端数据
}

const CURRENT_USER_KEY = 'prompthub_current_user'
const LOCAL_USERS_KEY = 'prompthub_users_local'  // 本地缓存的用户列表
const GIST_TOKEN_KEY = 'prompthub_gist_token'  // 用户的 GitHub token（可选，用于读写 Gist）

// ============================================
// 工具函数
// ============================================

// SHA-256 哈希
async function hashPassword(password: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    let h = 0
    for (let i = 0; i < password.length; i++) {
      const c = password.charCodeAt(i)
      h = ((h << 5) - h) + c
      h |= 0
    }
    return 'fallback_' + Math.abs(h).toString(16)
  }
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// 根据邮箱+密码生成用户唯一 ID
function generateUserId(email: string, password: string): string {
  // 用邮箱+密码的哈希作为 ID，确保同一账号在不同设备生成相同 ID
  return btoa(unescape(encodeURIComponent(email + ':' + password))).replace(/[/+=]/g, '_')
}

// ============================================
// 本地存储
// ============================================

function getLocalUsers(): User[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalUsers(users: User[]) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users))
}

export function getCurrentUser(): User | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setCurrentUser(user: User | null) {
  if (typeof localStorage === 'undefined') return
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(CURRENT_USER_KEY)
  }
}

// ============================================
// 云端存储（使用 GitHub Gist API）
// ============================================

// Gist 配置：用 wolf28014 的 token 创建一个公共 Gist
// 每个 PromptHub 用户的账号数据都存在这个 Gist 的一个 JSON 文件中
const GIST_ID_KEY = 'prompthub_gist_id'
const GIST_FILENAME = 'prompthub-users.json'

// 获取 Gist token（从设置中读取，或用默认的）
function getGistToken(): string {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(GIST_TOKEN_KEY) || ''
}

export function setGistToken(token: string) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(GIST_TOKEN_KEY, token)
}

// 获取 Gist ID（首次注册时创建）
function getGistId(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(GIST_ID_KEY)
}

function setGistId(id: string) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(GIST_ID_KEY, id)
}

// 创建 Gist（首次注册时调用）
async function createGist(initialData: Record<string, User>): Promise<string | null> {
  const token = getGistToken()
  if (!token) return null

  try {
    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'PromptHub 用户账号数据',
        public: false,
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(initialData, null, 2),
          },
        },
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.id
  } catch {
    return null
  }
}

// 从 Gist 读取所有用户
async function fetchUsersFromGist(): Promise<Record<string, User> | null> {
  const gistId = getGistId()
  const token = getGistToken()
  if (!gistId || !token) return null

  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    })
    if (!res.ok) return null
    const data = await res.json()
    const file = data.files?.[GIST_FILENAME]
    if (!file?.content) return null
    return JSON.parse(file.content)
  } catch {
    return null
  }
}

// 更新 Gist 中的用户数据
async function updateGistUsers(users: Record<string, User>): Promise<boolean> {
  const gistId = getGistId()
  const token = getGistToken()
  if (!gistId || !token) return false

  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(users, null, 2),
          },
        },
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

// ============================================
// 注册/登录/登出
// ============================================

// 注册
export async function register(email: string, password: string): Promise<AuthResult> {
  email = email.trim().toLowerCase()
  if (!email || !password) {
    return { success: false, message: '请填写邮箱和密码' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: '邮箱格式不正确' }
  }
  if (password.length < 6) {
    return { success: false, message: '密码至少 6 位' }
  }

  const passwordHash = await hashPassword(password)
  const userId = generateUserId(email, password)

  // 检查是否已注册（先查本地，再查云端）
  const localUsers = getLocalUsers()
  if (localUsers.find(u => u.email === email)) {
    return { success: false, message: '该邮箱已注册（本地）' }
  }

  // 检查云端
  const cloudUsers = await fetchUsersFromGist()
  if (cloudUsers && cloudUsers[userId]) {
    return { success: false, message: '该邮箱已注册' }
  }

  const user: User = {
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  }

  // 如果有 Gist token，存到云端
  if (getGistToken()) {
    let allUsers = cloudUsers || {}
    // 如果没有 Gist ID，先创建
    if (!getGistId()) {
      allUsers[userId] = user
      const gistId = await createGist(allUsers)
      if (gistId) {
        setGistId(gistId)
      }
    } else {
      allUsers[userId] = user
      await updateGistUsers(allUsers)
    }
  }

  // 存到本地
  localUsers.push(user)
  saveLocalUsers(localUsers)
  setCurrentUser(user)

  return { success: true, message: '注册成功', user }
}

// 登录
export async function login(email: string, password: string): Promise<AuthResult> {
  email = email.trim().toLowerCase()
  if (!email || !password) {
    return { success: false, message: '请填写邮箱和密码' }
  }

  const passwordHash = await hashPassword(password)
  const userId = generateUserId(email, password)

  // 先查本地
  const localUsers = getLocalUsers()
  let user = localUsers.find(u => u.email === email)

  // 本地没找到，查云端
  if (!user) {
    const cloudUsers = await fetchUsersFromGist()
    if (cloudUsers && cloudUsers[userId]) {
      user = cloudUsers[userId]
      // 缓存到本地
      localUsers.push(user)
      saveLocalUsers(localUsers)
    }
  }

  if (!user) {
    return { success: false, message: '邮箱未注册（如果在此设备注册过，请检查邮箱拼写）' }
  }

  if (user.passwordHash !== passwordHash) {
    return { success: false, message: '密码错误' }
  }

  user.lastLoginAt = new Date().toISOString()
  // 更新本地
  const idx = localUsers.findIndex(u => u.email === email)
  if (idx >= 0) {
    localUsers[idx] = user
    saveLocalUsers(localUsers)
  }
  // 更新云端
  if (getGistToken()) {
    const cloudUsers = await fetchUsersFromGist()
    if (cloudUsers) {
      cloudUsers[userId] = user
      await updateGistUsers(cloudUsers)
    }
  }
  setCurrentUser(user)

  // 如果有同步码，标记需要同步
  const needsSync = !!user.syncCode
  return {
    success: true,
    message: needsSync ? '登录成功，检测到云端数据，可拉取同步' : '登录成功',
    user,
    needsSync,
  }
}

// 登出
export function logout(): void {
  setCurrentUser(null)
}

// 更新当前用户的同步码（上传数据后调用）
export async function updateCurrentUserSyncCode(syncCode: string): Promise<void> {
  const user = getCurrentUser()
  if (!user) return
  user.syncCode = syncCode
  user.dataUpdatedAt = new Date().toISOString()
  setCurrentUser(user)

  // 更新本地
  const localUsers = getLocalUsers()
  const idx = localUsers.findIndex(u => u.email === user.email)
  if (idx >= 0) {
    localUsers[idx] = user
    saveLocalUsers(localUsers)
  }

  // 更新云端
  if (getGistToken()) {
    const cloudUsers = await fetchUsersFromGist()
    if (cloudUsers) {
      // 用 email 找到对应的 userId
      for (const [uid, u] of Object.entries(cloudUsers)) {
        if (u.email === user.email) {
          cloudUsers[uid] = user
          await updateGistUsers(cloudUsers)
          break
        }
      }
    }
  }
}

// 获取当前用户的同步码（用于登录后拉取数据）
export function getCurrentUserSyncCode(): string | undefined {
  const user = getCurrentUser()
  return user?.syncCode
}

// 检查是否已登录
export function isLoggedIn(): boolean {
  return !!getCurrentUser()
}

// 邮箱脱敏
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!domain) return email
  if (name.length <= 2) return name[0] + '***@' + domain
  return name[0] + '***' + name[name.length - 1] + '@' + domain
}

// 检查 Gist 是否已配置
export function isCloudConfigured(): boolean {
  return !!getGistToken() && !!getGistId()
}
