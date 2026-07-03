// 本地账号系统：邮箱+密码注册登录
// 密码用 SHA-256 哈希存储，不存明文
// 账号信息存 localStorage，数据通过现有同步码机制跨设备同步

export type User = {
  email: string
  passwordHash: string
  createdAt: string
  // 用户绑定的同步码（注册时自动生成一个）
  syncCode?: string
  // 最后登录时间
  lastLoginAt?: string
}

const USERS_KEY = 'prompthub_users'
const CURRENT_USER_KEY = 'prompthub_current_user'

// SHA-256 哈希（用 Web Crypto API）
async function hashPassword(password: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback: 简单哈希（不安全，但 WebView 都支持 Web Crypto）
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

function getAllUsers(): User[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAllUsers(users: User[]) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
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

export type AuthResult = {
  success: boolean
  message: string
  user?: User
}

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

  const users = getAllUsers()
  if (users.find(u => u.email === email)) {
    return { success: false, message: '该邮箱已注册' }
  }

  const passwordHash = await hashPassword(password)
  const user: User = {
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  }
  users.push(user)
  saveAllUsers(users)
  setCurrentUser(user)
  return { success: true, message: '注册成功', user }
}

// 登录
export async function login(email: string, password: string): Promise<AuthResult> {
  email = email.trim().toLowerCase()
  if (!email || !password) {
    return { success: false, message: '请填写邮箱和密码' }
  }
  const users = getAllUsers()
  const user = users.find(u => u.email === email)
  if (!user) {
    return { success: false, message: '邮箱未注册' }
  }
  const passwordHash = await hashPassword(password)
  if (passwordHash !== user.passwordHash) {
    return { success: false, message: '密码错误' }
  }
  user.lastLoginAt = new Date().toISOString()
  saveAllUsers(users)
  setCurrentUser(user)
  return { success: true, message: '登录成功', user }
}

// 登出
export function logout(): void {
  setCurrentUser(null)
}

// 更新当前用户的同步码
export function updateCurrentUserSyncCode(syncCode: string): void {
  const user = getCurrentUser()
  if (!user) return
  user.syncCode = syncCode
  setCurrentUser(user)
  const users = getAllUsers()
  const idx = users.findIndex(u => u.email === user.email)
  if (idx >= 0) {
    users[idx] = user
    saveAllUsers(users)
  }
}

// 检查是否已登录
export function isLoggedIn(): boolean {
  return !!getCurrentUser()
}

// 邮箱脱敏（用于显示）
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!domain) return email
  if (name.length <= 2) return name[0] + '***@' + domain
  return name[0] + '***' + name[name.length - 1] + '@' + domain
}
