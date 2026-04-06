# Diagrams

- **`data-stores-overview.pdf`** — Content vs. runtime persistence vs. PostgreSQL vs. optional Spacetime (GLB links). Source: `data-stores-overview.mmd`.

Regenerate after editing the `.mmd` file:

```bash
npx -y @mermaid-js/mermaid-cli@11 -- mmdc -i docs/diagrams/data-stores-overview.mmd -o docs/diagrams/data-stores-overview.pdf -w 1600 -H 1100 -e pdf -f
```

(If `npx` passes extra args incorrectly, run `mmdc` from the package’s `node_modules/.bin`.)
