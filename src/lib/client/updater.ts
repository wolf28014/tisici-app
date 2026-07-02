// 应用更新检查 + APK 下载
// 通过 GitHub Releases API 检查新版本

export const APP_VERSION = '1.1.0' // 当前应用版本
export const GITHUB_REPO = 'wolf28014/tisici-app'
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`

export type UpdateInfo = {
  hasUpdate: boolean
  latestVersion: string
  currentVersion: string
  releaseNotes: string
  apkUrl: string | null
  apkSize: number | null
  publishedAt: string | null
  htmlUrl: string
}

// 比较版本号：v1.2.3 vs 1.2.4 → -1 / 0 / 1
function compareVersions(a: string, b: string): number {
  const norm = (v: string) => v.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0)
  const arrA = norm(a)
  const arrB = norm(b)
  const maxLen = Math.max(arrA.length, arrB.length)
  for (let i = 0; i < maxLen; i++) {
    const va = arrA[i] ?? 0
    const vb = arrB[i] ?? 0
    if (va < vb) return -1
    if (va > vb) return 1
  }
  return 0
}

const LAST_CHECK_KEY = 'prompthub_last_update_check'
const SKIP_VERSION_KEY = 'prompthub_skip_version'

export async function checkForUpdate(force = false): Promise<UpdateInfo | null> {
  // 节流：非强制检查时，24 小时内只查一次
  if (!force && typeof localStorage !== 'undefined') {
    const last = localStorage.getItem(LAST_CHECK_KEY)
    if (last) {
      const lastTime = parseInt(last, 10)
      if (Date.now() - lastTime < 24 * 60 * 60 * 1000) {
        return null // 24小时内已检查过
      }
    }
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()))
  }

  try {
    const res = await fetch(GITHUB_API, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    })
    if (!res.ok) {
      console.warn('checkForUpdate: GitHub API failed', res.status)
      return null
    }
    const data = await res.json()
    const latestVersion = (data.tag_name || '').replace(/^v/i, '')
    if (!latestVersion) return null

    // 找 APK 资源
    const assets = (data.assets || []) as Array<{ name: string; browser_download_url: string; size: number }>
    const apkAsset = assets.find(a => /\.apk$/i.test(a.name))
    const skipVersion = typeof localStorage !== 'undefined' ? localStorage.getItem(SKIP_VERSION_KEY) : null

    const hasUpdate = compareVersions(APP_VERSION, latestVersion) < 0
    const skipped = skipVersion === latestVersion

    return {
      hasUpdate: hasUpdate && !skipped,
      latestVersion,
      currentVersion: APP_VERSION,
      releaseNotes: data.body || '',
      apkUrl: apkAsset?.browser_download_url || null,
      apkSize: apkAsset?.size || null,
      publishedAt: data.published_at || null,
      htmlUrl: data.html_url,
    }
  } catch (e) {
    console.warn('checkForUpdate failed:', e)
    return null
  }
}

export function skipVersion(version: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SKIP_VERSION_KEY, version)
}

export function clearSkipVersion(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(SKIP_VERSION_KEY)
}

// 下载 APK（在浏览器中触发下载）
export async function downloadApk(url: string, filename?: string): Promise<boolean> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('下载失败')
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename || 'PromptHub-update.apk'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    return true
  } catch (e) {
    // 如果 fetch 失败（CORS 等），用浏览器直接跳转下载
    console.warn('downloadApk fetch failed, fallback to direct link:', e)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'PromptHub-update.apk'
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return true
  }
}

// 格式化 APK 大小
export function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// 格式化发布时间
export function formatDate(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
  } catch {
    return ''
  }
}
