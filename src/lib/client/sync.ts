// 跨设备同步：用 base64 编码整个数据库导出数据
// 用户在 A 设备生成同步码 → B 设备粘贴同步码即可导入

import { exportAll, importData, type ExportData } from './db'

// 字符串 ↔ Uint8Array
function strToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}
function bytesToStr(b: Uint8Array): string {
  return new TextDecoder().decode(b)
}

// Uint8Array ↔ base64（支持 Unicode）
function bytesToB64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i])
  }
  return btoa(bin)
}
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i)
  }
  return bytes
}

// 用同步码导出
export async function generateSyncCode(): Promise<string> {
  const data = await exportAll()
  const json = JSON.stringify(data)
  const bytes = strToBytes(json)
  const b64 = bytesToB64(bytes)
  // 加上前缀方便识别
  return `PH${b64}`
}

// 用同步码导入
export async function applySyncCode(
  code: string,
  mode: 'merge' | 'replace' = 'merge',
): Promise<{ imported: number; skipped: number }> {
  const trimmed = code.trim()
  if (!trimmed.startsWith('PH')) {
    throw new Error('同步码格式错误：应以 PH 开头')
  }
  const b64 = trimmed.slice(2)
  let data: ExportData
  try {
    const bytes = b64ToBytes(b64)
    const json = bytesToStr(bytes)
    data = JSON.parse(json) as ExportData
  } catch (e) {
    throw new Error('同步码解析失败：' + (e as Error).message)
  }
  if (!data || !Array.isArray(data.prompts)) {
    throw new Error('同步码内容无效')
  }
  return importData(data, mode)
}
