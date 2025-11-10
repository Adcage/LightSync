import { NextUIProvider } from "@nextui-org/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeSwitch } from "./components/ThemeSwitch";
import { TitleBar } from "./components/TitleBar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import ConfigTest from "./components/ConfigTest";
import DatabaseTest from "./components/DatabaseTest";
import LanguageSwitch from "./components/LanguageSwitch";
import LanguageTest from "./components/LanguageTest";

function App() {
  return (
    <ErrorBoundary>
      <NextUIProvider>
        <NextThemesProvider attribute="class" defaultTheme="light">
          <div className="h-screen flex flex-col bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-gray-100 overflow-hidden">
            {/* 自定义标题栏 */}
            <TitleBar />

            {/* 主内容区域 */}
            <div className="flex-1 overflow-auto bg-gray-50 dark:bg-zinc-950">
              {/* 主题切换按钮 - 固定在右上角 */}
              <div className="fixed top-14 right-4 z-50">
                <ThemeSwitch />
              </div>

              <div className="fixed top-14 right-20 z-50">
                <LanguageSwitch />
              </div>

              <div className="p-8 space-y-8">
                <LanguageTest />
                <DatabaseTest />
                <ConfigTest />
              </div>
            </div>
          </div>
        </NextThemesProvider>
      </NextUIProvider>
    </ErrorBoundary>
  );
}

export default App;
