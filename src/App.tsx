import { NextUIProvider } from "@nextui-org/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Button, Card, CardBody, CardHeader } from "@nextui-org/react";
import { ThemeSwitch } from "./components/ThemeSwitch";

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
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl font-bold mb-8 text-foreground">
                LightSync - 轻量级文件同步工具
              </h1>
            
            <Card className="mb-4">
              <CardHeader className="flex gap-3">
                <div className="flex flex-col">
                  <p className="text-md font-semibold">项目初始化完成</p>
                  <p className="text-small text-default-500">Task 1.1 配置验证</p>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  <p className="text-sm">✅ package.json 依赖配置完成</p>
                  <p className="text-sm">✅ Cargo.toml 依赖配置完成</p>
                  <p className="text-sm">✅ tauri.conf.json 配置完成</p>
                  <p className="text-sm">✅ TailwindCSS + NextUI 配置完成</p>
                </div>
              </CardBody>
            </Card>

              <div className="flex gap-4">
                <Button color="primary" variant="solid">
                  Primary Button
                </Button>
                <Button color="secondary" variant="bordered">
                  Secondary Button
                </Button>
                <Button color="success" variant="flat">
                  Success Button
                </Button>
              </div>
            </div>
          </div>
        </div>
      </NextThemesProvider>
    </NextUIProvider>
  );
}

export default App;
