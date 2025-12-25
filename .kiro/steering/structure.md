# Project Structure

## Directory Organization

```
LightSync/
├── src/                          # React frontend source
│   ├── components/               # React components
│   ├── hooks/                    # Custom React hooks
│   ├── i18n/                     # Internationalization
│   ├── layouts/                  # Layout components
│   ├── pages/                    # Page components
│   ├── router/                   # Routing configuration
│   ├── styles/                   # CSS/styling files
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions
│   ├── App.tsx                   # Main app component
│   └── main.tsx                  # Application entry point
│
├── src-tauri/                    # Rust backend source
│   ├── src/
│   │   ├── webdav/               # WebDAV module
│   │   ├── main.rs               # Application entry
│   │   ├── lib.rs                # Library entry (command registration)
│   │   ├── error.rs              # Unified error handling
│   │   ├── config.rs             # Configuration management
│   │   ├── config_watcher.rs     # Config file watching
│   │   ├── constants.rs          # Constants definitions
│   │   ├── database.rs           # Database operations
│   │   └── system.rs             # System information
│   ├── migrations/               # Database migrations (SQL)
│   ├── capabilities/             # Tauri permissions config
│   ├── icons/                    # Application icons
│   ├── Cargo.toml                # Rust dependencies
│   ├── tauri.conf.json           # Tauri app configuration
│   └── build.rs                  # Build script
│
├── docs/                         # Project documentation
│   └── md/                       # Markdown documents
│
├── .kiro/                        # Kiro AI configuration
│   ├── steering/                 # AI steering rules
│   └── specs/                    # Feature specifications
│
├── public/                       # Static assets
├── dist/                         # Build output
└── node_modules/                 # Node dependencies
```

## Architecture Layers

### Frontend Layer (React)

- **Components**: Reusable UI components (TitleBar, ThemeSwitch, etc.)
- **Hooks**: Custom hooks for state management (useConfig, useTheme)
- **Utils**: Helper functions (database operations, store management)
- **Types**: TypeScript interfaces and type definitions

### Backend Layer (Rust)

- **Config Management**: Configuration CRUD and file watching
- **Database**: SQLite operations with migrations
- **File Monitoring**: File system change detection
- **WebDAV**: WebDAV protocol implementation
- **Sync Engine**: File synchronization logic
- **Error Handling**: Unified error types and serialization

### Storage Layer

- **Config File**: `.config.dat` (encrypted configuration)
- **SQLite DB**: `lightsync.db` (metadata, logs, sessions)
- **File System**: Local sync folders

## Key Modules

### Frontend Modules

- `components/`: UI components (TitleBar, WindowControl, Sidebar, etc.)
- `hooks/useConfig.ts`: Configuration management hook
- `utils/database.ts`: Database operation wrappers
- `utils/store.ts`: Configuration store utilities
- `types/config.ts`: Configuration type definitions

### Backend Modules

- `error.rs`: SyncError enum with serialization
- `config.rs`: AppConfig struct and Tauri commands
- `config_watcher.rs`: File system watcher for config changes
- `database.rs`: Database initialization and operations
- `system.rs`: System information commands
- `webdav/`: WebDAV client implementation

## Database Schema

### Tables

- **file_metadata**: File tracking (path, hash, size, status)
- **sync_logs**: Sync operation logs (action, status, errors)
- **sync_sessions**: Sync session tracking (statistics, duration)
- **webdav_servers**: WebDAV server configurations (added in migration 002)

## Configuration Files

- `package.json`: Node.js dependencies and scripts
- `Cargo.toml`: Rust dependencies
- `tsconfig.json`: TypeScript compiler options (strict mode)
- `vite.config.ts`: Vite build configuration
- `tailwind.config.js`: TailwindCSS theme customization
- `tauri.conf.json`: Tauri app settings (window, permissions)
- `.prettierrc`: Code formatting rules

## Naming Conventions

### TypeScript/React

- Components: PascalCase (e.g., `TitleBar`, `ThemeSwitch`)
- Functions/Variables: camelCase (e.g., `useConfig`, `getConfig`)
- Types/Interfaces: PascalCase (e.g., `AppConfig`, `SyncFolder`)
- Files: PascalCase for components, camelCase for utilities

### Rust

- Functions/Variables: snake_case (e.g., `init_config`, `get_config`)
- Types/Structs: PascalCase (e.g., `AppConfig`, `SyncError`)
- Modules: snake_case (e.g., `config_watcher`, `webdav`)
- Files: snake_case (e.g., `config.rs`, `error.rs`)
