# @bunit/qb

> Kysely dialects powered by [Bun.SQL](https://bun.net.cn/docs/api/sql) for PostgreSQL, MySQL, and SQLite.

## Features

- ⚡️ **Native Bun.SQL** - Zero abstraction overhead using Bun's built-in SQL client
- 🔌 **Kysely Compatible** - Drop-in dialects with full type safety
- 🎯 **Multi-Database** - PostgreSQL, MySQL, MariaDB, and SQLite support
- 📦 **Zero Runtime Dependencies** - Only requires Kysely as peer dependency

## Installation

```bash
bun add @bunit/qb kysely
```

## Usage

### PostgreSQL

```typescript
import { Kysely } from "kysely";
import { PostgresDialect } from "@bunit/qb/dialects/postgres";

const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    url: "postgres://user:pass@localhost:5432/mydb",
  }),
});
```

### MySQL

```typescript
import { Kysely } from "kysely";
import { MySQLDialect } from "@bunit/qb/dialects/mysql";

const db = new Kysely<Database>({
  dialect: new MySQLDialect({
    url: "mysql://user:pass@localhost:3306/mydb",
  }),
});
```

### SQLite

```typescript
import { Kysely } from "kysely";
import { SQLiteDialect } from "@bunit/qb/dialects/sqlite";

// File-based
const db = new Kysely<Database>({
  dialect: new SQLiteDialect({
    url: "sqlite://path/to/myapp.db",
  }),
});

// In-memory
const memoryDb = new Kysely<Database>({
  dialect: new SQLiteDialect({
    url: ":memory:",
  }),
});
```

### Advanced Configuration

```typescript
import { PostgresDialect } from "@bunit/qb/dialects/postgres";

const dialect = new PostgresDialect({
  options: {
    hostname: "localhost",
    port: 5432,
    database: "mydb",
    username: "user",
    password: "pass",
    max: 20, // connection pool size
    idleTimeout: 30,
    tls: true,
  },
});
```

## License

[MIT](../../LICENSE) &copy; [Demo Macro](https://www.demomacro.com/)
