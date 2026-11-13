# Reading File Content (Chunking)

Shared by `internal-scouting.md` and `external-scouting.md` — when needing to read file content, use chunking to stay within context limits (<150K tokens safe zone).

## Step 1: Get Line Counts

```bash
wc -l path/to/file1.ts path/to/file2.ts path/to/file3.ts
```

## Step 2: Calculate Chunks

- **Target:** ~500 lines per chunk (safe for most files)
- **Max files per agent:** 3-5 small files OR 1 large file chunked

**Chunking formula:**
```
chunks = ceil(total_lines / 500)
lines_per_chunk = ceil(total_lines / chunks)
```

## Step 3: Read Chunks

**Small files (<500 lines each):**
Use `read_file` directly or `run_shell` with `sed`/`cat` for test-controlled paths.

**Large file (>500 lines) - use sed for ranges:**
Use `run_shell` with `sed -n` ranges in the main agent. Delegate chunk reading only when the user explicitly requested parallel delegation and the runtime has an appropriate worker role.

## Chunking Decision Tree

```
File < 500 lines     → Read entire file
File 500-1500 lines  → Split into 2-3 chunks
File > 1500 lines    → Split into ceil(lines/500) chunks
```

Spawn all in a single assistant turn only when delegation is permitted.
