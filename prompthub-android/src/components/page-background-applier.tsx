'use client'

import * as React from 'react'

const PAGE_BG_KEY = 'prompthub-page-bg'

export type PageBackground = {
  type: 'color' | 'image' | 'gradient'
  value: string
  name?: string
} | null

export function getPageBackground(): PageBackground {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(PAGE_BG_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setPageBackground(bg: PageBackground): void {
  if (typeof localStorage === 'undefined') return
  if (bg) {
    localStorage.setItem(PAGE_BG_KEY, JSON.stringify(bg))
  } else {
    localStorage.removeItem(PAGE_BG_KEY)
  }
  applyPageBackground(bg)
}

export function applyPageBackground(bg: PageBackground): void {
  if (typeof document === 'undefined') return
  const body = document.body
  if (!bg) {
    body.classList.remove('custom-page-bg')
    body.style.backgroundImage = ''
    body.style.backgroundColor = ''
    return
  }
  body.classList.add('custom-page-bg')
  if (bg.type === 'image') {
    body.style.backgroundImage = `url(${bg.value})`
    body.style.backgroundSize = 'cover'
    body.style.backgroundPosition = 'center'
    body.style.backgroundAttachment = 'fixed'
  } else {
    body.style.backgroundImage = bg.value.startsWith('linear-gradient') ? bg.value : 'none'
    body.style.backgroundColor = bg.value.startsWith('linear-gradient') ? '' : bg.value
  }
}

export function PageBackgroundApplier() {
  React.useEffect(() => {
    applyPageBackground(getPageBackground())
  }, [])
  return null
}
