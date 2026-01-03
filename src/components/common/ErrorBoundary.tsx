import React, { Component, ReactNode } from 'react'
import { Card, CardHeader, CardBody, Button, Code } from '@nextui-org/react'
import { AlertCircle } from 'lucide-react'

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
        <div className='flex h-screen items-center justify-center bg-content1'>
          <Card className='max-w-md'>
            <CardHeader className='flex gap-3'>
              <AlertCircle className='h-8 w-8 text-danger' />
              <div className='flex flex-col'>
                <h1 className='text-xl font-bold text-danger'>出错了！</h1>
                <p className='text-sm text-default-500'>应用遇到了一个错误</p>
              </div>
            </CardHeader>
            <CardBody className='gap-4'>
              <Code className='w-full overflow-auto whitespace-pre-wrap'>{this.state.error?.toString()}</Code>
              <Button color='primary' onPress={() => window.location.reload()}>
                重新加载
              </Button>
            </CardBody>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
