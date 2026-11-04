# Grill: turn a loose idea into decisions

Adapted from Matt Pocock's `grilling` and `grill-with-docs` / `domain-modeling` skills (github.com/mattpocock/skills, MIT). Used for a loosely described new project, or a fuzzy change or feature in an existing one. The result is the plan's goal, assumptions and decisions, settled by the user instead of guessed, plus the project's own words in a glossary.

When there is code, a plan or a glossary already, also follow "With docs" below.

## The design tree

Every decision branches into the decisions that hang off it. The **frontier** is every open decision whose prerequisites are already settled: the questions you can ask now without guessing at answers you have not heard yet.

## Rounds

With a plan in the docs folder, `lean-project frontier docs/PLAN.md` prints the round's questions (open decisions whose prerequisites are settled) and what waits on them. Write `needs D<n>` into a decision's text when it cannot be asked until another decision is settled, so the frontier tracks it.

1. Ask the whole frontier with `AskUserQuestion`: one card per question, up to 4 cards per call (send several calls if the frontier is bigger). The user never has to type a long answer.
2. Each card gets 2 to 4 proposed answers. The first one is your recommendation, labelled "(Recommended)". The card's built-in "Other" field is the custom answer. Word each option so picking it settles the decision.
3. Keep the question itself short, and put the context in the option descriptions. Use a 12-character `header` tag per question.
4. Wait for the answers. They settle decisions and push the frontier outward; recompute it and ask the next round.
5. A question that depends on another question still open in this round belongs to a later round.

```
AskUserQuestion:
  question: "Who signs in to the admin?"
  header: "Admin login"
  options:
    - label: "WP users (Recommended)"   description: "Reuses WordPress accounts and roles; no new login."
    - label: "Separate login"           description: "Own table and password; more code to maintain."
```

If `AskUserQuestion` is not available (no interactive session), fall back to the numbered text list with a recommended answer for each question.

## Facts are yours, decisions are theirs

- Never ask the user what you can look up (files, tools, docs, APIs). Send a background subagent (haiku, low effort) for it and ask the rest of the frontier meanwhile; only the questions downstream of that fact wait.
- Facts no one can confirm yet (API behaviour, limits, data formats) become Phase 0 checks with a default, not questions.
- **Ungrillable** questions ("how should this feel", "one form or three pages") need something to react to. Stop asking: make it a prototype task in the first phase with a default, and move on.
- "I don't know" is a real answer: record a default as an open decision.

## Keep it lean

- Count rounds, not questions. Most projects settle in 3 to 5 rounds.
- If the frontier keeps growing after round 4, the scope is too big. Propose splitting it (phases, or separate projects), then grill only the first piece.
- Once the folder exists, write settled answers straight into the plan (Goal, Assumptions, Decisions with status "decided"), so nothing lives only in the conversation. If the session must end mid-grill, the state file's "Next" lists the open frontier.

## With docs: the project's own words

Applies when there is code or existing docs to align against, and to any project whose domain has words of its own. Read only what the questions need (graph tool, `lean-project map`, ranges), never the whole tree.

- **Check claims against the code.** When the user says how something works, look. On a contradiction, ask: "The code cancels whole orders, but you said partial cancellation is possible. Which is right?"
- **Challenge terms.** A word that clashes with the glossary gets called out at once: "The glossary defines cancellation as X, you seem to mean Y." A vague or overloaded word ("account": customer or user?) gets a precise term proposed.
- **Probe with scenarios.** Invent concrete edge cases that force the boundary between two concepts to be stated.
- **Glossary, the moment a term settles.** Write it to `GLOSSARY.md` in the docs folder (`TOOLS.md`, "Docs folder"; create it with the first term; use an existing `GLOSSARY.md` or `GLOSSARY-MAP.md` if the repo has one). Project-specific terms only, no general programming concepts, no implementation detail, never a spec or scratch pad:

  ```
  **Order**: a customer's request for one or more products, placed at checkout.
  _Avoid_: purchase, transaction
  ```

  One or two sentences saying what it is. Pick one word per concept; the rest go under `_Avoid_`. Group under `##` headings when clusters appear.
- **Decisions, all of them, in the plan.** Every settled answer becomes a D# row in the plan with status "decided"; nothing lives only in the conversation. A decision that is hard to reverse, surprising without context and a real trade-off also gets a decision-log row whose "Why" a future reader can act on, plus the rejected option when someone would otherwise propose it again. If the repo already keeps ADRs (`docs/adr/`), write those decisions there in its format instead and reference the file from the D# row.
- **The index points to the glossary** once it exists: one line under "Reading" ("Domain terms: `<docs folder>/GLOSSARY.md`, grep the term"). Never auto-load it.

## Done

The frontier is empty: every branch visited, nothing silently assumed. Summarize the decisions in a few lines and act only after the user confirms that is the shared understanding.
