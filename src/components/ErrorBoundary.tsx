import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='flex h-screen items-center justify-center bg-gray-100 dark:bg-zinc-900'>
          <div className='max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-800'>
            <h1 className='mb-4 text-2xl font-bold text-red-600'>出错了！</h1>
            <p className='mb-4 text-gray-700 dark:text-gray-300'>应用遇到了一个错误：</p>
            <pre className='overflow-auto rounded bg-gray-100 p-4 text-sm dark:bg-zinc-900'>
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className='mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
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
