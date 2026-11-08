# Hub structure: how every project is laid out

One standard for starting and adopting projects. It merges the ICM method (Interpretable Context Methodology, `RinDig/icm-architect`, MIT: folder structure as agent architecture) with its own files. Read it for "start a project", "adopt this folder" and the walk test. The gate (the panel settings) outranks it where they differ.

## The layout

```
AGENTS.md            entry: what this is, the map, where to start (every agent reads it)
CLAUDE.md            one line: "See AGENTS.md" (Claude Code reads this name)
<INDEX>.md           the catalog: points down to stages and docs, holds no content
<STATE>.md           the handoff: where we are, what is next, updated at every stage end
01-<stage>/          numbered stages, in order; each stage's output feeds the next
  CONTEXT.md           inputs, outputs, the check that ends the stage (a page at most)
docs/                reference that is read on demand (BOARD.md, LESSONS, plans)
```

- Sequence is the numbered folders; scope is the hierarchy (read the stage you are in, not the whole tree); state is plain markdown. No orchestration code.
- Keep your own names for the index and state file (`Nashenski-INDEX.md`, `HANDOFF.md`, and so on). `AGENTS.md` links to them.
- `CLAUDE.md` stays one line, so two files cannot drift apart.

## Every stage ends at a check

A person, a script or a small model confirms the stage's output before the next stage starts. A failed check blocks "done". Write the check in the stage's `CONTEXT.md`, as a command or an observable result.

## Starting a project

1. Run the setup cards in `STARTUP.md`.
2. Ask what the project is for; loose ideas go through `GRILL.md`.
3. Scaffold the smallest layout that carries it: `AGENTS.md`, the one-line `CLAUDE.md`, the index, the state file, and one numbered folder per phase.
4. Register the folder (the panel's Register button) so detection finds it.
5. Run the walk test.

## Adopting a project that exists

1. Audit: list the files and classify each as catalog, contract, work in progress, product or dead; note what points at each.
2. Propose a migration map: what moves, what is added, what stays. Show it and wait for approval. Nothing is renamed, moved or deleted before that, and replaced text moves verbatim to an archive file.
3. Add `AGENTS.md` next to the existing `CLAUDE.md`. Keep the existing entry, index and state file; link to them.
4. After approval, migrate, then register and run the walk test.

## The walk test

An agent with no memory of the project must, from the files alone: orient (what this is), act (name the next step) and report status (where it stands). List anything it could not find and fix those files. Run it when adopting, and before a release.
