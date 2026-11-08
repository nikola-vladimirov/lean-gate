# Stage contract: <stage name>

Use one per stage of a multi-stage workflow. The first three sections are required. Checkpoints and Audit are for creative or build stages; delete them for linear stages (extract, convert, render).

## Inputs

| Source | File and section | Why |
|---|---|---|
| <previous stage output or reference> | <path, then the heading or line range to read> | <one line> |

Load only these rows. Anything else is out of scope for this stage.

## Process

1. <step>
2. <step>

## Checkpoints

Pause here for the user to steer before the next unit of work.

| After step | Agent presents | User decides |
|---|---|---|
| <step number> | <options or draft> | <direction to choose> |

## Audit

Run these before writing to output/. If a check fails, revise first.

| Check | Pass condition |
|---|---|
| <check name> | <what passing looks like> |

## Outputs

| Artifact | Location | Format |
|---|---|---|
| <name> | <path under this stage's output/> | <markdown, code, etc.> |

Rule: references point outward only. A stage may read earlier stages and shared references. No earlier file may point back at this stage.
