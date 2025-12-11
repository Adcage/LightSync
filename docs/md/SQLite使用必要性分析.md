# SQLite 使用必要性分析

## 📊 数据规模分析

### 项目数据需求

根据需求文档，项目需要存储以下数据：

| 数据类型         | 预估规模                             | 查询需求                           | 更新频率     |
| ---------------- | ------------------------------------ | ---------------------------------- | ------------ |
| **文件元数据**   | 最多 1000万条 (100文件夹 × 10万文件) | 高频查询：按路径查找、按文件夹查询 | 每次同步更新 |
| **同步操作历史** | 持续增长，需定期清理                 | 按时间范围、文件夹查询             | 每次同步写入 |
| **错误日志**     | 持续增长，需定期清理                 | 按时间、类型、文件夹查询           | 错误时写入   |

### 容量需求

- **同步文件夹**: 最多 100个
- **单个文件夹文件数**: 最多 10万个
- **理论上限**: 1000万条文件元数据记录

---

## ✅ 使用 SQLite 的理由

### 1. **性能优势** ⭐⭐⭐⭐⭐

**文件元数据查询场景**：

```rust
// 变更检测时需要快速查找
let local_meta = find_file_metadata(folder_id, relative_path)?;
let remote_meta = find_file_metadata(folder_id, remote_path)?;

// 对比快照时需要批量查询
let all_files = get_all_files_in_folder(folder_id)?;
```

**性能对比**：

| 方案              | 10万文件查询时间 | 1000万文件查询时间 | 内存占用 |
| ----------------- | ---------------- | ------------------ | -------- |
| **SQLite + 索引** | < 10ms           | < 100ms            | 低       |
| **JSON 文件加载** | 500ms - 2s       | 无法承受           | 高       |
| **内存 HashMap**  | < 1ms            | 内存不足           | 极高     |

**结论**: SQLite 的索引查询比 JSON 文件快 **50-200倍**

---

### 2. **查询复杂度** ⭐⭐⭐⭐⭐

**实际查询需求**：

```sql
-- 场景1: 查找特定文件的元数据（高频操作）
SELECT * FROM file_metadata
WHERE folder_id = ? AND relative_path = ?;

-- 场景2: 查找所有变更的文件（变更检测）
SELECT * FROM file_metadata
WHERE folder_id = ?
  AND (modified_time > ? OR content_hash != ?);

-- 场景3: 查询同步历史（日志界面）
SELECT * FROM sync_operations
WHERE folder_id = ?
  AND started_at BETWEEN ? AND ?
ORDER BY started_at DESC
LIMIT 100;

-- 场景4: 统计同步信息
SELECT
    COUNT(*) as total_files,
    SUM(size) as total_size,
    MAX(modified_time) as last_modified
FROM file_metadata
WHERE folder_id = ?;
```

**如果用 JSON 文件**：

- ❌ 需要加载整个文件到内存
- ❌ 需要手动实现索引逻辑
- ❌ 复杂的查询性能极差
- ❌ 并发写入需要文件锁

**SQLite 优势**：

- ✅ 索引自动优化查询
- ✅ SQL 语法简洁强大
- ✅ 支持事务，保证一致性
- ✅ 内置并发控制

---

### 3. **内存占用** ⭐⭐⭐⭐

**内存占用对比**：

| 方案                | 10万文件内存占用 | 1000万文件内存占用 |
| ------------------- | ---------------- | ------------------ |
| **SQLite (查询时)** | ~5MB             | ~50MB              |
| **JSON 加载到内存** | ~50MB            | ~5GB (不可行)      |
| **Rust HashMap**    | ~100MB           | ~10GB (不可行)     |

**SQLite 优势**：

- ✅ 按需加载，不需要全部加载到内存
- ✅ 可以设置 WAL 模式，优化写入性能
- ✅ 支持分页查询，控制内存使用

---

### 4. **数据一致性** ⭐⭐⭐⭐⭐

**同步过程中的数据一致性需求**：

```rust
// 需要事务保证原子性
BEGIN TRANSACTION;
  UPDATE file_metadata SET ... WHERE ...;
  INSERT INTO sync_operations ...;
  UPDATE sync_stats ...;
COMMIT;
```

**如果用 JSON 文件**：

- ❌ 同步失败时数据可能不一致
- ❌ 需要手动实现回滚逻辑
- ❌ 并发写入容易损坏文件

**SQLite 优势**：

- ✅ ACID 事务保证
- ✅ 自动回滚机制
- ✅ 崩溃恢复机制

---

### 5. **数据迁移和版本管理** ⭐⭐⭐⭐

**需求文档要求**：

- 配置迁移功能
- 版本兼容性
- 数据备份

**SQLite 优势**：

```sql
-- 版本迁移可以通过 ALTER TABLE 实现
ALTER TABLE file_metadata ADD COLUMN new_field TEXT;

-- 数据备份简单
-- 直接复制 .db 文件即可
```

---

## ❌ 不使用 SQLite 的理由

### 1. **轻量级目标** ⚠️

**考虑**：

- SQLite 增加依赖（~500KB）
- 增加代码复杂度
- 需要数据库迁移逻辑

**评估**：

- SQLite 本身非常轻量，适合嵌入式场景
- 对于这个项目的规模，SQLite 是最轻量的数据库选择
- **结论**: 不构成问题 ✅

---

### 2. **学习成本** ⚠️

**考虑**：

- 需要学习 SQL
- 需要学习 SQLite 的 Rust 绑定

**评估**：

- `tauri-plugin-sql` 已经封装好了
- SQL 是基础技能，值得学习
- **结论**: 可接受 ✅

---

### 3. **文件大小** ⚠️

**考虑**：

- SQLite 文件会比较大
- 需要定期清理

**评估**：

- 1000万条记录约 500MB - 1GB
- 可以通过定期清理历史数据控制大小
- JSON 文件同样会很大
- **结论**: 可管理 ✅

---

## 📋 替代方案对比

### 方案1: JSON 文件 + 内存缓存

```rust
// 读取整个 JSON 到内存
let mut cache: HashMap<String, FileMetadata> =
    serde_json::from_str(&fs::read_to_string("cache.json")?)?;

// 查询
let meta = cache.get(&key)?;
```

**缺点**：

- ❌ 启动时需要加载全部数据（慢）
- ❌ 内存占用高（10万文件约50MB，1000万文件不可行）
- ❌ 复杂查询性能差
- ❌ 没有事务支持

**适用场景**：小规模（< 1万文件）

---

### 方案2: 多个 JSON 文件（按文件夹分割）

```rust
// 每个文件夹一个 JSON 文件
let cache_file = format!("cache_{folder_id}.json");
```

**缺点**：

- ❌ 仍然需要加载整个文件夹的文件列表
- ❌ 跨文件夹查询困难
- ❌ 文件管理复杂

**适用场景**：中等规模（< 10万文件/文件夹）

---

### 方案3: SQLite（推荐）✅

**优点**：

- ✅ 性能优秀（索引查询）
- ✅ 内存占用低（按需加载）
- ✅ 查询灵活（SQL）
- ✅ 事务支持
- ✅ 成熟稳定

**缺点**：

- ⚠️ 增加依赖（但 SQLite 很轻量）
- ⚠️ 需要学习 SQL（基础技能）

**适用场景**：本项目（大规模文件元数据）

---

## 🎯 推荐方案

### **建议：使用 SQLite** ✅

### 理由总结

1. **性能要求**：10万+ 文件需要快速查询，SQLite 索引查询是唯一可行方案
2. **查询复杂度**：需要复杂查询（按时间、类型、文件夹筛选），SQL 比手动过滤高效
3. **内存限制**：目标 < 50MB，SQLite 按需加载比 JSON 全量加载省内存
4. **数据一致性**：同步过程需要事务保证，SQLite 内置支持
5. **轻量级**：SQLite 本身就是为嵌入式场景设计的，符合项目定位

### 实施方案

#### 最小化 SQLite 使用范围

只用于**必须结构化查询**的数据：

| 使用 SQLite       | 使用 JSON         |
| ----------------- | ----------------- |
| ✅ 文件元数据快照 | ✅ 服务器配置     |
| ✅ 同步操作历史   | ✅ 同步文件夹配置 |
| ✅ 错误日志       | ✅ 应用设置       |

#### 轻量化设计

```rust
// 1. 使用 tauri-plugin-sql（已集成，无需额外依赖）
use tauri_plugin_sql::{TauriSql, Migration, MigrationKind};

// 2. 简单的表结构（参考需求文档）
CREATE TABLE file_metadata (
    folder_id TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    modified_time INTEGER,
    content_hash TEXT,
    PRIMARY KEY (folder_id, relative_path)
);

// 3. 建立必要的索引
CREATE INDEX idx_folder_path ON file_metadata(folder_id, relative_path);
CREATE INDEX idx_modified ON file_metadata(folder_id, modified_time);

// 4. 定期清理历史数据（控制文件大小）
DELETE FROM sync_operations
WHERE completed_at < datetime('now', '-30 days');
```

#### 性能优化

```rust
// 1. 使用 WAL 模式（提升并发性能）
PRAGMA journal_mode = WAL;

// 2. 批量插入（提升写入性能）
BEGIN TRANSACTION;
  // 批量插入
COMMIT;

// 3. 分页查询（控制内存）
SELECT * FROM file_metadata
WHERE folder_id = ?
LIMIT 1000 OFFSET ?;
```

---

## 📊 最终建议

### ✅ **强烈建议使用 SQLite**

**原因**：

1. **必需性**：10万+ 文件规模下，SQLite 是唯一可行的结构化存储方案
2. **轻量级**：SQLite 本身很小，tauri-plugin-sql 已集成
3. **性能**：查询性能比 JSON 文件快 50-200倍
4. **内存**：按需加载，比 JSON 全量加载更省内存
5. **功能**：事务、索引、复杂查询，都是同步引擎必需的

### 🎯 实施建议

1. **MVP 阶段**：可以先使用 JSON 文件验证逻辑（< 1万文件）
2. **优化阶段**：迁移到 SQLite（支持大规模）
3. **渐进式**：保持配置文件用 JSON，只有文件元数据用 SQLite

### ⚠️ 注意事项

1. **定期清理**：历史数据需要定期清理，避免数据库过大
2. **备份策略**：SQLite 文件需要定期备份
3. **迁移脚本**：准备从 JSON 迁移到 SQLite 的脚本

---

## 📚 参考

- **需求文档**: `项目需求分析.md` 6.1.2 节
- **实现步骤**: `项目实现步骤.md` Phase 4, Phase 7
- **SQLite 官方**: https://www.sqlite.org/
- **tauri-plugin-sql**: https://github.com/tauri-apps/plugins-workspace/tree/dev/plugins/sql

---

**结论**: 对于 LightSync 项目的规模和需求，**SQLite 是必需且合适的选择** ✅
