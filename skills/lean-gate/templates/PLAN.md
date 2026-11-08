# <Project name>: plan

## 1. Goal

- <What done looks like, 2 to 4 bullets.>
- Out of scope: <...>.

## 2. Assumptions

| # | Assumption | If wrong |
|---|---|---|
| A1 | <...> | <...> |

## 3. Decisions

Every decision has a default so work can start; the user can change it any time (log it in section 8). Status is `open` or `decided`. Write `needs D<n>` in the decision text when it waits on another decision; `lean-gate frontier docs/PLAN.md` reads this.

| # | Decision | Default | Status |
|---|---|---|---|
| D1 | <...> | <...> | open |

## 4. Architecture

<Components, one line each: what it does and what it must never do. A diagram only if it saves words.>

## 5. Sources of truth

| Topic | Source | Verified |
|---|---|---|
| <API, spec, standard> | <URL or doc> | <date, or "lead only"> |

## 6. Phases

Each phase is a gate: the next one starts only when every check below it is ticked.

### Phase 0: Verify unknowns

Scope: <the external facts the plan depends on>.

- [ ] <Each unknown answered from an official source, with link and date.>

### Phase 1: <name>

Scope: <what is built, with IDs>.

- [ ] <Acceptance check: a command that passes, or something a person can observe.>

## 7. Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | <...> | <high/medium/low> | <...> |

## 8. Decision log

| Date | Decision | Why |
|---|---|---|
| <YYYY-MM-DD> | Plan written with defaults D1 to D<n> | <...> |
