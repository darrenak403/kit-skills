# Error Handling & Fallback Strategies

## Error Codes

**404 Not Found**
- Topic-specific URL not available
- Library not on context7.com
- llms.txt doesn't exist

**Timeout**
- Network issues
- Large repository clone
- Slow API response

**Invalid Response**
- Malformed llms.txt
- Empty content
- Invalid URLs

## Fallback Chain

### For Topic-Specific Queries

```
1. Try topic-specific URL
   https://context7.com/{library}/llms.txt?topic={keyword}
   ↓ 404
2. Try general library URL
   https://context7.com/{library}/llms.txt
   ↓ 404
3. web_search capability for llms.txt
   "[library] llms.txt site:[official domain]"
   ↓ Not found
4. Repository analysis
   Use Repomix on GitHub repo
```

### For General Library Queries

```
1. Try context7.com
   https://context7.com/{library}/llms.txt
   ↓ 404
2. web_search capability for llms.txt
   "[library] llms.txt"
   ↓ Not found
3. Repository analysis
   Clone + Repomix
   ↓ No repo
4. Research agents
   Deploy multiple Researcher agents
```

## Timeout Handling

**Set limits:**
- web_search capability: 60s
- Repository clone: 5min
- Repomix: 10min

**Fail fast:** Don't retry failed methods

## Empty Results

**If llms.txt has 0 URLs:**
→ Note in report
→ Try repository analysis
→ Check official website manually

## context7.com Unreachable (Native WebFetch/WebSearch Fallback)

If `context7.com` itself is down, unreachable, or times out (not just a 404 for
one library) — as opposed to the topic/library-specific 404s covered above —
skip straight to Claude's native tools instead of retrying context7:

1. **`WebFetch`** the library's own documentation site or GitHub `README`/`docs/`
   directory directly (most libraries publish docs outside context7 too).
2. **`WebSearch`** for `"[library] official documentation"` or
   `"[library] llms.txt"` to locate an alternate source, then `WebFetch` the
   result.
3. If the library has a GitHub repo, fall back to Repomix repository analysis
   (`references/advanced.md`) rather than waiting on context7 to recover.

Do not block the task on context7.com availability — treat it as one source
among several, not a hard dependency.
