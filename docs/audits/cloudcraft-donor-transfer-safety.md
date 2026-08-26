# CloudCraft donor transfer safety audit

Issue: #2468

This document is the engineering transfer gate for material considered from the CloudCraft donor. It intentionally separates source-code licensing from media/asset licensing and fails closed whenever provenance is incomplete.

## Pinned donor revision

- Repository: `levy-street/world-of-claudecraft`
- Default branch: `main`
- Audited release tag: `v0.36.0`
- Audited commit: `0f7d09d59a36afba85f057e71a868f0c2de2f000`
- Root license at the audited tag: MIT, copyright Levy Street (2026)
- Media register at the audited tag: `CREDITS.md`

The donor's root `LICENSE` grants MIT rights for the software and associated documentation. The donor's own `CREDITS.md` expressly carves art, audio, fonts and other media out of that blanket and makes the per-asset record controlling. A media asset missing from that register is unrecorded, not implicitly MIT-licensed.

## Transfer classes

| Candidate | Donor basis | WASD decision | Required handling |
|---|---|---:|---|
| Source code | MIT | ALLOW | Preserve required MIT copyright/license notice for copied substantial portions. |
| Architecture/patterns | MIT source/docs; concepts reimplemented in WASD | ALLOW | Prefer independent adaptation to WASD contracts; do not import donor runtime authority or branding. |
| Tests | MIT source | ALLOW | Keep notice where copied/adapted substantially; tests must be rewritten where WASD truth contracts differ. |
| Text documentation | MIT associated documentation | ALLOW | Embedded screenshots/images are not covered by this row and must be audited as media. |
| Source-coded gameplay/config data | MIT only where it is genuinely source/data-as-code and not carved-out media/branding | ALLOW_WITH_REVIEW | Strip donor branding and verify the file is not a media/rights-reserved payload. |
| CC0 media with an exact `CREDITS.md` record | Per-asset CC0 | ALLOW | Record upstream author/source/license; prefer reacquiring from the primary source instead of bulk-copying donor binaries. |
| CC BY / MIT / Apache media with exact record | Per-asset attribution license | ALLOW_WITH_NOTICE | Carry attribution and the applicable license/notice. |
| Fonts explicitly marked SIL OFL 1.1 | Per-asset OFL | ALLOW_WITH_LICENSE | Preserve OFL terms and required notices; do not sell the font standalone. |
| `Non-commercial only, with attribution` | CC BY-NC 4.0 or equivalent | BLOCK | Not acceptable for WASD commercial-capable distribution without a new compatible grant. |
| `With the project only` | Donor/project-specific grant | BLOCK | Grant is tied to World of ClaudeCraft/forks and is not a transferable WASD asset license. |
| `No, permission required` | Rights reserved / donor-specific permission | BLOCK | Written permission for WASD would be required before reconsideration. |
| Unlisted/unrecorded media | No reliable recorded terms | BLOCK | Missing provenance is not permission. |
| Third-party brand marks/logos | Trademark/brand rights | BLOCK | No donor authority to relicense the marks to WASD. |

## Donor media classes observed at `v0.36.0`

The donor register defines these operational redistribution states:

- `Yes`: public-domain or MIT-equivalent material.
- `Yes, attribution required`: reusable only with the required credit/license notice.
- `Yes, under SIL OFL 1.1`: reusable only under the font license terms.
- `With the project only`: project-scoped; blocked for transfer into WASD.
- `Non-commercial only, with attribution`: blocked for WASD unless a separate commercial-compatible permission is obtained.
- `No, permission required`: blocked.
- Missing from the register: `unknown`; blocked.

Examples explicitly blocked by the donor register include purchased CraftPix ability icons, commissioned/prestige/store art, specified artwork/recordings used under donor-only permission, and trademarked third-party brand marks. The `@jamiecypher` audio set is non-commercial under CC BY-NC 4.0 for third parties and is therefore blocked for WASD's unrestricted/commercial-capable distribution path.

Examples of potentially admissible media classes include individually recorded CC0 assets from KayKit, Quaternius, Kenney, ambientCG and Poly Haven, plus specifically recorded attribution-licensed assets. Eligibility is per asset, not per directory or pack assumption.

## Deterministic safety matrix

The six issue-level classes map as follows:

| Safety class | Decision |
|---|---:|
| `permissive` | ALLOW |
| `attribution` | ALLOW_WITH_NOTICE |
| `non-commercial` | BLOCK |
| `project-only` | BLOCK |
| `permission-required` | BLOCK |
| `unknown` | BLOCK |

No bulk media transfer may infer permission from the root MIT file. `public/`, `docs/screenshots/`, audio, icons, models, textures, HDRIs and fonts remain item-level provenance surfaces.

## Candidate transfer policy for the CloudCraft integration

The preferred CloudCraft -> WASD integration path is therefore:

1. Transfer or independently adapt **architecture and source-code patterns** that help WASD's existing deterministic contracts.
2. Transfer **tests/documentation text** only where useful and compatible with WASD's architecture, retaining required MIT notices for substantial copied material.
3. Treat **media as deny-by-default**. Only an exact asset with an exact provenance record and an admissible redistribution state may enter the candidate set.
4. Prefer fetching admissible third-party media from its **primary upstream source** and recording that source directly in WASD, rather than copying the donor's transformed/bundled file blindly.
5. Do not transfer World of ClaudeCraft/Levy Street branding, logos, store/prestige art, donor-only generated media, donor-only permission grants, or unrecorded assets.

## Agent/operator consent gate

Automated transfer tools must not turn a previous approval into standing authority over future media.

Before any media copy, the action preview must expose the exact:

- donor path,
- upstream source,
- author/owner,
- license class,
- redistribution state,
- attribution/notice obligation,
- pinned donor commit.

The transfer action may proceed only for `ALLOW`, `ALLOW_WITH_NOTICE`, or `ALLOW_WITH_LICENSE`. All other states fail closed. Every completed transfer must leave a receipt tying the imported WASD path to the donor/upstream provenance and decision. A changed path, source, license, or revision requires a new decision rather than reusing an old approval.

## Relationship to release licensing

This audit closes the **donor transfer-safety** question only. It does not replace #2044, which must still prove the provenance/license state of the actual final published WASD content pack and runtime paths.

## Acceptance result for #2468

- Donor repository/tag/commit: pinned.
- Code vs media: explicitly separated.
- Candidate transfers: classified as code, architecture, data, tests, documentation, or media.
- Media safety classes: defined.
- `unknown`, `non-commercial`, `project-only`, and `permission-required`: explicitly blocked.
- Allowed candidates: limited to MIT source/docs/tests and individually proven permissive/attribution/OFL media with required notices.
- Bulk Art/Audio/Fonts/Models import under a root-MIT assumption: prohibited.
