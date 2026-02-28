# @bunit/storage

![npm version](https://img.shields.io/npm/v/@bunit/storage)
![npm downloads](https://img.shields.io/npm/dw/@bunit/storage)
![npm license](https://img.shields.io/npm/l/@bunit/storage)

> 🔌 Native Bun drivers for [**unstorage**](https://unstorage.unjs.io) - Filesystem, Redis, and S3.

## Features

- ⚡️ **Native Bun APIs** - Zero abstraction overhead using Bun's built-in clients
- 🔌 **Unstorage Compatible** - Drop-in drivers for any unstorage setup
- 🎯 **Type-Safe** - Full TypeScript support with proper types
- 📦 **Zero Runtime Dependencies** - Uses only Bun's native capabilities

## Installation

```bash
bun add @bunit/storage unstorage
```

## Usage

### Filesystem Driver

```typescript
import { createStorage } from "unstorage";
import fsDriver from "@bunit/storage/drivers/fs";

const storage = createStorage({
  driver: fsDriver({
    base: "./data",
    ignore: ["node_modules", ".git"],
  }),
});

await storage.setItem("config:user", JSON.stringify({ name: "Alice" }));
const data = await storage.getItem("config:user");
```

### Redis Driver

```typescript
import { createStorage } from "unstorage";
import redisDriver from "@bunit/storage/drivers/redis";

const storage = createStorage({
  driver: redisDriver({
    url: "redis://localhost:6379",
    base: "app:cache",
    ttl: 3600, // 1 hour default TTL
  }),
});

await storage.setItem("session:123", "data");
```

### S3 Driver

```typescript
import { createStorage } from "unstorage";
import s3Driver from "@bunit/storage/drivers/s3";

const storage = createStorage({
  driver: s3Driver({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucket: "my-bucket",
    region: "us-east-1",
    endpoint: "https://s3.us-east-1.amazonaws.com",
    base: "prefix/",
  }),
});

await storage.setItem("uploads/image.png", buffer);
```

## License

[MIT](../../LICENSE) &copy; [Demo Macro](https://www.demomacro.com/)
