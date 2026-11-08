# <Project name>

> <One sentence: what it is and for whom.> **Status:** <planning | phase N | released vX.Y>.

State: `docs/HANDOFF.md` (read it first). Plan: `docs/PLAN.md`. Code: `<folder>` (<what ships>).

```
CLAUDE.md          this index
docs/HANDOFF.md    now, in progress, next
docs/PLAN.md       goal, decisions D#, phases with gates, risks
<folder>/          <one line>
```

## Reading

- Session start: this file and `docs/HANDOFF.md` only.
- Files over ~300 lines: `lean-gate map <file>`, then read only the range. Docs with a contents table: read the table, then the range.
- Look up IDs (`D3`, `P2`, `R5`) with grep instead of reading whole docs.
- By task: <task> → <doc, section>; <task> → <doc, section>.
- Bulk reading (external docs, references, logs): a cheap subagent writes the answers into <doc> with the source.

## Upkeep

- `docs/HANDOFF.md`: now, in progress, next; update it at the end of each work session.
- Scope and decision changes: the PLAN decision log, with a date. Replaced text: verbatim to `docs/ARCHIVE.md`.
- After editing a doc that has a contents table: `lean-gate toc <file>`.

## Ground rules

- <Only rules that are not already in memory or a rules doc.>
