# WASD Documentation Best Practices

## Overview

This skill defines standards and guidelines for creating and maintaining documentation in the Areloria/WASD repository. Following these practices ensures AI agents produce consistent, useful, and maintainable documentation.

## Documentation Hierarchy

The repository uses this structure:

```
docs/
├── *.md                    # Feature/system documentation
├── ai-skills/              # AI agent skills (this directory)
├── diagrams/               # Visual diagrams
├── archive/               # Deprecated documentation
├── wiki/                  # Community wiki content
└── research/              # Investigation notes
```

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Feature Doc | `FEATURE_NAME.md` | `CRAFTING_SYSTEM.md` |
| AI Skill | `wasd-<topic>.md` | `wasd-manifest-system.md` |
| Runbook | `RUNBOOK_<name>.md` | `CI_VPS_RUNBOOK.md` |
| Decision | `DECISION_<date>.md` | `DECISION_2026-03-19.md` |
| Archive | Move to `archive/` | - |

## Markdown Standards

### Required Frontmatter

Every documentation file should include:

```markdown
# Title

<!--
type: feature | runbook | decision | reference | guide
created: 2026-06-02
updated: 2026-06-02
owner: team
-->

## Overview

[One paragraph summary]

## Details

[Content]
```

### Section Structure

1. **Overview** (required) - One paragraph describing the topic
2. **Quick Reference** (recommended) - Jump table for key info
3. **Details** (required) - Main content
4. **Examples** (optional) - Code snippets, use cases
5. **Troubleshooting** (optional) - Common issues and solutions
6. **Related** (optional) - Links to related docs

### Writing Style

| Do | Don't |
|----|-------|
| Use clear, concise sentences | Use jargon without definition |
| Include code examples | Leave complex concepts unexplained |
| Update docs when code changes | Leave outdated information |
| Use tables for structured data | Use walls of text |
| Link to related documentation | Duplicate content |

## Documentation Types

### Feature Documentation

For systems and features:

```markdown
# Feature Name

## Overview
[One paragraph]

## Quick Reference
| Key | Value |
|-----|-------|
| Path | /path/to/code |
| Type | feature |

## How It Works
[Detailed explanation]

## Usage Examples
```typescript
// Example code
```

## Edge Cases
- Case 1
- Case 2

## Related
- [Link to related doc](path)
```

### Runbook

For operational procedures:

```markdown
# Runbook: Procedure Name

## Prerequisites
- Requirement 1
- Requirement 2

## Steps
1. Step one
2. Step two

## Verification
[How to verify success]

## Rollback
[How to undo]
```

### AI Skill Documentation

For AI agent guidance (in `docs/ai-skills/`):

```markdown
# SKILL_NAME Skill

## Overview
[What this skill does]

## Quick Reference
[Key commands, paths]

## Common Tasks
[Task 1 with steps]
[Task 2 with steps]

## Troubleshooting
[Common issues]
```

## File Organization

### Updating Documentation

When updating code:

1. Check if documentation exists for the change
2. Update the relevant doc(s)
3. Update `DOCUMENTATION_INDEX.md` if adding new file
4. If significant change, update `PROJECT_STATUS_2026.md`

### Archiving Documentation

Move deprecated docs to `archive/`:

```bash
git mv docs/old-doc.md docs/archive/old-doc.md
```

Update any references to the archived file.

### Version Control

- Commit documentation changes separately from code when practical
- Use meaningful commit messages: "docs: update crafting system runbook"
- Review docs in PRs for accuracy

## Links and References

### Internal Links

Use relative paths:
```markdown
See [Building System](../BUILDING_SYSTEM.md)
See [Manifest System](./ai-skills/wasd-manifest-system.md)
```

### External Links

Verify external links still work periodically. Use:
- Official documentation
- Project-specific resources
- Avoid linking to temporary content

## Quality Checklist

Before committing documentation:

- [ ] Frontmatter complete (type, dates)
- [ ] Overview section exists and is accurate
- [ ] Code examples are correct and working
- [ ] Links are valid and relative
- [ ] No duplicate content from other docs
- [ ] README updated if adding new top-level doc

## Documentation Maintenance Rules

From `AGENTS.md`:

> For every non-trivial feature or architecture change:
> 1. Update `docs/PROJECT_STATUS_2026.md`
> 2. Update `docs/ROADMAP_TO_RELEASE.md` if release scope changed
> 3. If core workflow changed, also update `README.md` and relevant deploy docs

## Templates

### New Feature Doc

```markdown
# Feature Name

<!--
type: feature
created: YEAR-MM-DD
updated: YEAR-MM-DD
-->

## Overview

[One paragraph describing the feature]

## Quick Reference

| Item | Value |
|------|-------|
| Status | [planned|in-progress|complete] |
| Path | [code path if applicable] |

## Implementation

[How it works]

## Usage

[How to use it]

## Related
- [Related doc](link)
```

### New AI Skill

```markdown
# SKILL_NAME Skill

## Overview

[What this skill is for]

## Quick Reference

### Key Files
| Path | Purpose |
|------|---------|

### Commands
```bash
# Command example
```

## Common Tasks

### Task 1

Steps:
1. Step one
2. Step two

### Task 2

Steps...

## Troubleshooting

Q: Question?
A: Answer

Q: Another?
A: Another answer
```

## Tools and Scripts

| Script | Purpose |
|--------|---------|
| `scripts/validate-pixi-assets.mjs` | Validate asset documentation |
| `scripts/sync-wiki.mjs` | Sync wiki documentation |

## Resources

- [Markdown Guide](https://www.markdownguide.org/)
- [Fork Awesome Icons](https://forkaweso.me/Fork-Awesome/) (for icons in docs)
- Existing docs in `docs/` for style reference