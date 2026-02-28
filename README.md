# Bun It

![GitHub](https://img.shields.io/github/license/DemoMacro/BunIt)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)

> A collection of high-performance tools and utilities exclusively built for the [Bun](https://bun.sh) ecosystem.

## Packages

- **[@bunit/build](./packages/build)** - Zero-config TypeScript package builder powered by Bun with dual bundle/transform modes

## Quick Start

### Build Tool

```bash
# Install
bun add @bunit/build

# Build using build.config.ts
built

# Stub mode (development)
built --stub
```

```typescript
import { defineBuildConfig } from "@bunit/build/config";

export default defineBuildConfig({
  entries: [
    {
      type: "bundle",
      input: ["./src/index.ts", "./src/cli.ts"],
      minify: true,
    },
    {
      type: "transform",
      input: "./src/lib",
      outDir: "./dist/lib",
    },
  ],
});
```

## Development

### Prerequisites

- **Bun** latest version
- **Git** for version control

### Getting Started

1. **Clone the repository**:

   ```bash
   git clone https://github.com/DemoMacro/BunIt.git
   cd bunit
   ```

2. **Install dependencies**:

   ```bash
   bun install
   ```

3. **Development mode**:

   ```bash
   bun run dev
   ```

4. **Build all packages**:

   ```bash
   bun run build
   ```

5. **Test locally**:

   ```bash
   # Link the package globally for testing
   cd packages/build
   bun link --global

   # Test in your project
   import { build } from '@bunit/build';
   ```

### Development Commands

```bash
bun run dev      # Development mode with watch
bun run build    # Build all packages
bun run lint     # Run code formatting and linting
```

## Contributing

We welcome contributions! Here's how to get started:

### Quick Setup

1. **Fork the repository** on GitHub
2. **Clone your fork**:

   ```bash
   git clone https://github.com/YOUR_USERNAME/bunit.git
   cd bunit
   ```

3. **Add upstream remote**:

   ```bash
   git remote add upstream https://github.com/DemoMacro/BunIt.git
   ```

4. **Install dependencies**:

   ```bash
   bun install
   ```

5. **Development mode**:

   ```bash
   bun run dev
   ```

6. **Test locally**:

   ```bash
   # Link the package globally for testing
   cd packages/build
   bun link --global

   # Test your changes
   import { build } from '@bunit/build';
   ```

### Development Workflow

1. **Code**: Follow our project standards
2. **Test**: `bun run build && <test your changes>`
3. **Commit**: Use conventional commits (`feat:`, `fix:`, etc.)
4. **Push**: Push to your fork
5. **Submit**: Create a Pull Request to upstream repository

## Support & Community

- 📫 [Report Issues](https://github.com/DemoMacro/BunIt/issues)
- 📚 [Build Package Documentation](./packages/build/README.md)

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

Built with ❤️ by [Demo Macro](https://www.demomacro.com/)
