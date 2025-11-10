import { NextUIProvider } from "@nextui-org/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ErrorBoundary } from "./components/ErrorBoundary";
import {AppRouter} from "./router";

function App() {
  return (
    <ErrorBoundary>
      <NextUIProvider>
        <NextThemesProvider attribute="class" defaultTheme="light">
          <AppRouter />
        </NextThemesProvider>
      </NextUIProvider>
    </ErrorBoundary>
  );
}

export default App;
