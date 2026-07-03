'use client'

import * as React from 'react'

type Props = {
  children: React.ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

// 全局错误边界：捕获 React 渲染错误，避免 Capacitor 显示原生错误页
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
          background: '#fafafa',
          color: '#1f2937',
          textAlign: 'center',
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 32,
            marginBottom: 16,
          }}>✦</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>
            应用遇到错误
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px' }}>
            抱歉，PromptHub 启动时遇到了问题。
          </p>
          {this.state.error && (
            <details style={{
              maxWidth: '90vw',
              width: 480,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              fontSize: 12,
              textAlign: 'left',
              color: '#7f1d1d',
              fontFamily: 'ui-monospace, monospace',
              overflow: 'auto',
              maxHeight: 200,
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: 8 }}>
                错误详情（点击展开）
              </summary>
              <div>{this.state.error.message}</div>
              {this.state.error.stack && (
                <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, fontSize: 11 }}>
                  {this.state.error.stack}
                </pre>
              )}
            </details>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: 'white',
                color: '#374151',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              重试
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#7c3aed',
                color: 'white',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              重新加载
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
