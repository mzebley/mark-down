# mark↓
*(published as `@mzebley/mark-down`)*

`mark-down` is the CLI for scanning Markdown snippets, parsing YAML front-matter, and emitting a sorted `snippets-index.json`.

## Install
```
npm install -g @mzebley/mark-down-cli
```

## Commands
### `mark-down build <sourceDir>`
- Discovers `*.md` files under `sourceDir` (default `content/snippets`).
- Parses YAML with the `yaml` package, normalizes slugs, flags duplicates, and removes drafts.
- Writes `snippets-index.json` to the source directory by default.
- Exit codes: `0` success, `1` failure, `2` duplicate slugs.

### `mark-down watch <sourceDir>`
- Uses `chokidar` to watch for file changes.
- Debounces rebuilds to avoid thrashing during writes.
- Logs with the `mark↓` brand.

## Example
```
mark-down build content/snippets
# [mark↓] manifest written to content/snippets/snippets-index.json
```
