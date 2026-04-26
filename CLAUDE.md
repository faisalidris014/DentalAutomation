@AGENTS.md

# Documentation

After completing any code changes, **always update the relevant documentation** in `docs/` to reflect the new state of the codebase. This includes:

- **`docs/architecture.md`** — Update if new directories, modules, adapters, or data flows were added/removed.
- **`docs/api-reference.md`** — Update if API routes were added, modified, or removed. Include endpoint, method, auth requirements, request/response shapes, and query parameters.
- **`docs/database.md`** — Update if schema tables, columns, or indexes were changed.
- **`docs/auth.md`** — Update if authentication or authorization logic changed.
- **`docs/jobs.md`** — Update if job types, queue behavior, or worker logic changed.
- **`docs/adapters.md`** — Update if PMS or payer adapters were added or modified.

If a change spans multiple docs, update all of them. Do not leave documentation stale — it is the primary reference for onboarding and debugging. If no existing doc covers the change, create a new one in `docs/`.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **DentalAutomation** (1992 symbols, 3331 relationships, 101 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/DentalAutomation/context` | Codebase overview, check index freshness |
| `gitnexus://repo/DentalAutomation/clusters` | All functional areas |
| `gitnexus://repo/DentalAutomation/processes` | All execution flows |
| `gitnexus://repo/DentalAutomation/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
