# Issue #2370: Isolierter TypeScript-Toolchain-Gate

## Baseline

Der unveränderte Auditstand ist `dad57978d07cd2745db8cc7624dd9baea73dc2af` auf Basis von `origin/main`. Der Runner verwendet Node `v22.13.0`, pnpm `11.8.0` und TypeScript `5.9.3`. Der SHA-256 des Lockfiles lautet `56257745b335bad47c1b12ee94d2ca85ca7794b43a34f52c4ccd22ccc39e6307`.

Der geforderte unveränderte TS-5-Baseline-Check wurde ausgeführt:

```text
pnpm --filter @wasd/shared typecheck && pnpm --filter @wasd/server typecheck
```

Er endet nach 7,142 Sekunden mit Exitcode 2. Der Server-Check wurde deshalb nicht erreicht. Der konkrete Blocker sind zwei `TS2304`-Diagnosen in `packages/shared/src/world/RuntimeEvidenceChain.test.ts`: Der verwendete Typ `EvidenceLayer` wird nicht importiert.

## Klassifikation und Entscheidung

Dies ist keine TypeScript-6- oder TypeScript-7-Regressionsdiagnose. Der Fehler liegt bereits im aktuellen TypeScript-5-Baseline-Stand vor. Der vorhandene Commit `ca1c7623` in [PR #2484](https://github.com/OuroborosCollective/Wasd/pull/2484) ergänzt den fehlenden Typimport; er ist zum Auditzeitpunkt noch nicht Bestandteil von `origin/main`.

> Die korrekte Entscheidung ist **WEITER BELEGEN**. Ein TS-6-/TS-7-Lauf auf einer bereits roten TS-5-Baseline würde keine verwertbare Differenz liefern und darf nicht mit `any`, `@ts-ignore`, `skipLibCheck`, Workspace-Ausschlüssen oder Konfigurationslockerungen überdeckt werden.

Nach Merge von PR #2484 ist derselbe Baseline-Check erneut auszuführen. Erst bei grünem TS-5-Ergebnis darf die Toolchain isoliert und ohne Änderung der Runtime-Semantik gegen TypeScript 6 und TypeScript 7 verglichen werden. TypeScript 6 ist der Übergangsrelease; TypeScript 7 benötigt für programmgesteuerte Compiler-Nutzer weiterhin besondere Kompatibilitätsprüfung, da 7.0 keine TypeScript-API ausliefert.[1][2]

## Referenzen

[1]: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html "TypeScript 6.0 Release Notes"
[2]: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ "Announcing TypeScript 7.0"
