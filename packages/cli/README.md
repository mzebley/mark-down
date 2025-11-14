# mark↓ CLI
*(published as `@mzebley/mark-down-cli`)*

`mark-down` is the command-line companion to the mark↓ runtime. It scans Markdown snippets, parses YAML front matter, and emits a sorted `snippets-index.json` manifest consumed by [the core client](../core/README.md). For a full project overview, see the [monorepo README](../../README.md).

## Table of contents

1. [Installation](#installation)
2. [Usage](#usage)
3. [Commands](#commands)
4. [Configuration options](#configuration-options)
5. [Watching for changes](#watching-for-changes)
6. [Exit codes](#exit-codes)
7. [Troubleshooting](#troubleshooting)
8. [Roadmap](#roadmap)
9. [Related packages](#related-packages)

## Installation

Install globally to expose the `mark-down` binary:

```bash
npm install -g @mzebley/mark-down-cli
```

or run it on demand via `npx` without a global install:

```bash
npx @mzebley/mark-down-cli build content/snippets
```

## Usage

```bash
mark-down build <sourceDir> [options]
```

The CLI walks the directory tree, gathers front matter, and writes `snippets-index.json` alongside your Markdown files by default.

## Commands

### `mark-down build <sourceDir>`

- Discovers `*.md` files under `sourceDir` (defaults to `content/snippets`).
- Parses YAML with the `yaml` package, normalizes slugs, flags duplicates, and removes drafts (`draft: true`).
- Writes `snippets-index.json` to the source directory by default (use `--outDir` to override).
- Supports relative or absolute paths.

### `mark-down watch <sourceDir>`

- Uses `chokidar` to watch for file changes.
- Debounces rebuilds to avoid thrashing during writes.
- Logs progress with the familiar `[mark↓]` prefix.
- Accepts the same options as `build`.

## Configuration options

The CLI stays intentionally small so it can be composed inside any toolchain. Currently supported flags:

- `-o, --output <path>` – write the manifest to a custom file instead of `<sourceDir>/snippets-index.json`.

Add flags directly after the command (`mark-down build content/snippets -o public/snippets-index.json`). Package scripts can capture these options as well.

## Watching for changes

Use watch mode when authoring content:

```bash
mark-down watch content/snippets --outDir public/snippets
```

The CLI will rebuild whenever files are created, changed, or removed.

## Exit codes

- `0` – success.
- `1` – generic failure (I/O issues, parse errors, etc.).
- `2` – duplicate slugs detected. Fix conflicts, then rerun.

CI pipelines can fail fast by treating non-zero exit codes as errors.

## Troubleshooting

- **No snippets found** – confirm the path is correct and that files end with `.md`. The CLI always uses the recursive `**/*.md` pattern.
- **Duplicate slugs** – check the log output; offending files are listed. Override slugs in front matter or reorganize filenames.
- **ESM/TypeScript projects** – invoke via `npx` or add an npm script: `"snippets:build": "mark-down build content/snippets"`.

## Roadmap

- **Additional flags** – support opt-in draft inclusion, custom glob patterns, and alternative output formats.
- **Manifest plugins** – allow teams to run transforms (MDX, remark, syntax highlighting) before JSON is written.
- **Watch dashboard** – provide a TUI/HTML preview server so content teams can inspect snippets while writing.
- **Parallel builds** – shard large repositories across worker pools for faster CI times.

Open an issue if one of these would unlock your workflow.

## Related packages

- [Core runtime](../core/README.md) – consume generated manifests at runtime.
- [Angular adapter](../angular/README.md) – use snippets inside Angular apps.
- [React adapter](../react/README.md) – integrate with React, Next.js, or Remix.
- [Example app](../../examples/basic/README.md) – see the CLI in action.
