import { NextUIProvider } from "@nextui-org/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeSwitch } from "./components/ThemeSwitch";
import ConfigTest from "./components/ConfigTest";

function App() {
  return (
    <NextUIProvider>
      <NextThemesProvider attribute="class" defaultTheme="system">
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
          {/* 主题切换按钮 - 固定在右上角 */}
          <div className="fixed top-4 right-4 z-50">
            <ThemeSwitch />
          </div>

          <div className="p-8">
            <ConfigTest />
          </div>
        </div>
      </NextThemesProvider>
    </NextUIProvider>
  );
}

export default App;
