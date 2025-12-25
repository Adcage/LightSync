import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/titlebar.css'
import './i18n'
import { initEnv } from './utils/env'

// 初始化环境变量后再渲染应用
initEnv().then(() => {
  const rootElement = document.getElementById('root') as HTMLElement
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
