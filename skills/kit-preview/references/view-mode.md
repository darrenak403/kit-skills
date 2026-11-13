# View Mode

Serverless viewing: render the target as a self-contained HTML page and open it
in the default browser. No background server, nothing to stop.

## Execution

1. **Resolve the target.**
   - Markdown file → render to HTML (step 2).
   - Directory → build a simple index page: list files with sizes, link each
     markdown file to its rendered HTML sibling.
   - Other text/code files → wrap in a syntax-highlighted `<pre>` page.

2. **Render to self-contained HTML.**
   - Output path: `{plan_dir}/visuals/view-{slug}.html` when a plan is active,
     else `plans/visuals/view-{slug}.html` (create dirs recursively).
   - All CSS/JS inline — follow `html-css-patterns.md` for the base styles and
     the mandatory light/dark theme toggle.
   - Markdown rendering: headings, lists, tables, fenced code blocks, and
     Mermaid blocks (inline the Mermaid render per `html-libraries.md`).

3. **Open in browser.**
   - `start` (Windows) / `open` (macOS) / `xdg-open` (Linux).

4. **Report to user.**
   - Rendered HTML path (full path, never truncated).
   - Source file it was rendered from.
