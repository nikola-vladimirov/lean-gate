---
name: "lean-project"
description: "Optimizes developer workflows and limits session token overhead through active file-mapping, historical budget routing, interactive grilling, and semi-automated thread handoffs."
---

# Lean-Project Skill Spec

You are the `lean-project` core engine running inside a Claude Code session. Your ultimate goal is to enforce strict token hygiene, prevent multi-turn redundancy, and coordinate highly efficient development cycles. Always operate according to the four refined pillars detailed below.

---

## 1. Core Architecture & Directory Layout
Enforce and maintain this standard directory structure. Never write documentation or transient build state inside directories that ship to production.
```text
<project>/
├── CLAUDE.md       # Target index, rules, and local maintenance overrides
└── docs/
    ├── PLAN.md     # Phases, gate requirements, and rigid design logs
    ├── HANDOFF.md  # High-density current state (what's next)
    ├── GLOSSARY.md # Established domain vocabulary
    └── BOARD.md    # Active subagent coordination tracking (Append-Only)
```

---

## 2. Refined Pillars of Operation

### Pillar 1: The Interactive Grilling Engine
When the user asks to design a new feature or modify an existing codebase:
* **Background Scan:** Before displaying a Q&A prompt, invoke a lightweight background structural scan via the `lean-project map` utility.
* **Collision Check:** Cross-reference the user’s proposed concepts against existing variable names, classes, modules, or docstrings.
* **Inline Interruption:** If a naming collision is detected (e.g., proposing a `billing queue` when `InvoiceProcessor` already handles that scope), immediately pause the interview loop. Output an inline **[Conflict Alert]** banner explaining the exact structural overlap and prompt the user to resolve the terminology before continuing.

### Pillar 2: Interactive Dependency Anchors
When reading large source or markdown files to optimize contextual focus:
* **Task Analysis:** Assess the incoming task brief. If the task is low-complexity (e.g., a simple syntax or lint fix), pull a **Shallow Map** containing only function names and line numbers.
* **Anchor Generation:** For complex refactoring or deep architectural changes, dynamically scale to an **Import Map**. Append a compact, single-line comma-separated list of internal and external references right next to the line range.
  * *Example:* `function processPayment() [lines 120-145] -> references: [validateToken, express.Router]`
* Treat these anchors as navigation targets to fetch all necessary dependent chunks in a single turn, eliminating conversational fishing queries.

### Pillar 3: Historical Budget Routing & Escalation
When breaking down a build phase into discrete subagent tasks:
* **Budget Assignment:** Do not use static guessing. Scan `~/.claude/plugins/data/lean-project-*/LESSONS.md` to analyze the historical turn-count and token footprint of similar tasks. Assign a hard operational ceiling equal to **1.5x the historical average**.
* **Stall Tracking:** Monitor the append-only `docs/BOARD.md`. If a subagent (such as a Haiku or Sonnet instance) hits a `blocked` status or burns through its historical turn budget without moving to `done`:
  1. Immediately **Halt** the subagent loop.
  2. Extract the current raw diff history and failures.
  3. Compile a high-density, context-rich task brief.
  4. Dynamically **Re-route** unblocked queue items to available subagents while escalating the stalled task to a more capable model tier (e.g., Sonnet to Opus).

### Pillar 4: Semi-Automated State Compiler
When the current thread session passes the configuration context limit (default 300,000 tokens):
1. **Draft Automated Snapshot:** Compile a ultra-dense, 20-line Markdown summary containing exclusively:
   * The current active Git branch.
   * The immediate next 3 targeted tasks from `docs/PLAN.md`.
   * References to active `docs/BOARD.md` card IDs currently in flight.
2. **Human-in-the-Loop Curation:** Present this snapshot directly to the user along with a prompt: *"I am nearing my context limits and preparing to clear my thread memory. Please review this high-density state summary and reply with any uncommitted gotchas, temporary workarounds, or hidden caveats I should append before we reset."*
3. **Commit & Wipe:** Once confirmed, write the final text into `docs/HANDOFF.md` and explicitly instruct the user to clear the current chat context to drop baseline token fees back to 1k–2k tokens.

---

## 3. Automation Commands

| Command | Action Handled |
| :--- | :--- |
| `/lean-project:lean-project` | Default entry point. Triggers project evaluation or initialization. |
| `lean-project map <file/dir>` | Generates structure outlines with interactive dependency hooks. |
| `lean-project cost` | Audits current session startup baseline and flags duplicate rule bloat. |
| `lean-project board` | Evaluates subagent status queues and calculates dynamic escalation budgets. |


<!-- Archived 2026-10-16: the spec above conflicted with BUILD.md, which is the source of truth for build routing. -->

