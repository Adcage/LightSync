# Technology Stack

## Frontend

- **React**: 19.1.0 with TypeScript 5.8.3
- **UI Framework**: NextUI 2.4.8 (component library)
- **Styling**: TailwindCSS 3.4.18
- **Theme Management**: next-themes 0.4.6
- **Animation**: framer-motion 12.23.24
- **Routing**: react-router-dom 7.9.5
- **i18n**: react-i18next 16.2.4
- **Icons**: lucide-react 0.553.0, react-icons 5.0.1
- **Build Tool**: Vite 7.0.4

## Backend

- **Language**: Rust (Edition 2021)
- **Framework**: Tauri 2.0
- **Async Runtime**: tokio 1.x (full features)
- **File Watching**: notify 6.x
- **Serialization**: serde 1.x, serde_json 1.x
- **Error Handling**: thiserror 1.0
- **Date/Time**: chrono 0.4
- **HTTP**: url 2.4
- **Database**: rusqlite 0.32 (bundled)
- **UUID**: uuid 1.0 (v4, serde)

## Tauri Plugins

- **tauri-plugin-store**: 2.x (configuration storage)
- **tauri-plugin-sql**: 2.x (SQLite database with migrations)
- **tauri-plugin-fs**: 2.4.4 (file system access)
- **tauri-plugin-opener**: 2.x (open files/URLs)

## Development Tools

- **Package Manager**: pnpm
- **Code Formatter**: Prettier 3.6.2 with prettier-plugin-tailwindcss
- **TypeScript Config**: Strict mode enabled with noUnusedLocals and noUnusedParameters
- **PostCSS**: 8.5.6 with autoprefixer

## Common Commands

### Development

```bash
# Start development server (frontend + backend with hot reload)
pnpm tauri:dev

# Start frontend only (port 1420)
pnpm dev

# Build production version
pnpm build

# Build Tauri application (executable)
pnpm tauri build

# Preview production build
pnpm preview
```

### Code Quality

```bash
# Format code
pnpm format

# Check formatting
pnpm format:check

# TypeScript type checking
pnpm tsc --noEmit

# Rust code checking
cd src-tauri
cargo clippy

# Rust formatting
cargo fmt

# Check Rust formatting
cargo fmt --check

# Run Rust tests
cargo test

# Rust build check
cargo check
```

## Build Configuration

- **Dev Server**: Port 1420 (strict port)
- **HMR**: Port 1421
- **Vite**: Clear screen disabled for Rust error visibility
- **Watch**: src-tauri directory ignored by Vite
