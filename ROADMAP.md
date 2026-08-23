# Roadmap

For whoever picks this up next, including a future session of me.

- `README.md` — what the citation rules are and where each comes from.
- `VERIFY.md` — what the user has to check by hand, because it can't be checked
  from this machine.
- This file — how to work on it, what has already been decided, and what to do
  next.

---

## Where things stand

| Phase | State |
| --- | --- |
| 1. Manual entry → correct footnote and bibliography entry | **Done**, ten source types, two schemes |
| 2. Repeat citations: ibid, cross-references, renumbering | **Engine done**, hosted by a preview panel; no rich-text editor |
| 3. Word output | **Partial** — rich-text copy and a `.docx` with real Word footnotes; no Office add-in |
| 4. Library management | **Done** — add, edit, remove, persist, export/import, search and filter |

393 tests. `npm test` runs everything; `npx vitest run src/oscola src/harvard
src/document` runs just the engines in about two seconds.

---

## How to work on this

This matters more than the backlog. The project's whole value is that its
output is correct, and the failure mode is a citation that looks right and is
not. Three rules have earned their place:

### 1. Read the primary source. Never cite from memory.

Twice this project asserted "official examples" that do not exist in OSCOLA —
`Cane P and Conaghan J (eds), The New Oxford Companion to Law`, and a
`Goff and Jones` citation with the wrong year and no supplement. Both were
confident, plausible, and wrong. A third, `Barrett v Enfield LBC (1965) 109 SJ
175`, was a garbled memory of a real example.

**Always extract and read the actual text.** There is no `pdftotext`, poppler or
`pypdf` on this machine, so WebFetch and the Read tool both fail on these PDFs.
The working method is recorded in the user's memory file, and in short:

- WebFetch the PDF URL — it fails to parse but *saves the file* and names the path.
- Extract with a short Python script that inflates every FlateDecode stream with
  `zlib` and pulls string literals out of the `Tj`/`TJ` operators.
- The output carries Windows-1252 escapes: `\222`=apostrophe, `\221`=open quote,
  `\227`=em dash, `\226`=en dash, `\036`=fi, `\035`=fl, `\037`=Th, `\033`=ff.
- To settle whether something is *italic*, track the `Tf` font operator and
  compare against a known-italic run in the same content stream. That is how the
  website name in §3.4.8 was confirmed — it renders in the same font as
  `Financial Times`, which §3.4.9 states is italic.

Sources:
- [OSCOLA 4th edn](https://www.law.ox.ac.uk/sites/default/files/migrated/oscola_4th_edn_hart_2012.pdf)
- [OSCOLA quick reference guide](https://www.law.ox.ac.uk/sites/default/files/migrated/oscola_4th_edn_hart_2012quickreferenceguide.pdf)
- [OU law modules guide](https://university.open.ac.uk/library/help-and-support/quick-guide-to-cite-them-right-referencing-for-law-modules)
- [OU Harvard quick guide](https://university.open.ac.uk/library/referencing-and-plagiarism/quick-guide-to-harvard-referencing-cite-them-right)

Cite Them Right itself is paywalled. The OU's public guides are the authority
used here, and are arguably the better one for OU students.

### 2. Every asserted citation string is verbatim, and names its section

A test that asserts an invented citation proves nothing. Each test comment gives
the section it comes from (`(2.1.6)`, `(1.7)`, `(3.3.1)`). If a rule has to be
exercised with a synthetic example, say so in the test.

### 3. Where the guide is silent, flag — do not invent

Precedents already set: the same-author-same-year suffix raises a warning rather
than guessing `2014a`; EU case numbers pass through as typed rather than
converting hyphen to en dash; §1.1.1's shortening is not extended to EU cases.
Each is documented in the README's gaps list so the decision is visible.

### 4. Testing has two layers

- **Engine tests** run in plain Node — pure functions, no DOM, fast.
- **Component tests** run in jsdom with React Testing Library, querying by
  **accessible name**. This doubles as an accessibility check: it is what
  surfaced the duplicate `Year` labels on the case form and the hints buried
  inside `<label>`.

jsdom lags browsers. `Blob.text()` and `Blob.arrayBuffer()` are feature-detected
polyfills in `src/test/setup.ts` — app code targets browsers, not jsdom.
jsdom is pinned to v25 because v26 needs Node 22 and this builds on Node 20.

---

## Decisions already made

Do not relitigate these without a reason. Each was settled deliberately.

| Decision | Why |
| --- | --- |
| OSCOLA 4th edn is the authority; CTR reached through the OU's public guides | CTR is paywalled; the OU pages are what its students are marked against |
| Cite Them Right **12th edn** — no place of publication | Matches the OU's current law page; their 2019 PDF still shows the 11th |
| **Two modes**, not a pivot to OU-only | Cases and legislation are identical in both; only the three academic types diverge, so the second scheme was cheap |
| Legal sources are **footnote-only** in OU Dual | Confirmed by the user against their modules; still listed in `VERIFY.md` |
| **Every** author inverts in an OSCOLA bibliography | §1.7's own worked example: `—— and Honoré AM` under `Hart HLA` |
| OSCOLA sources **never** get an in-text citation | §1.1 rules them out explicitly. Harvard in-text is a different scheme, not an OSCOLA variant |
| **localStorage only**, no backend | No auth, no hosting, no GDPR exposure. Durability solved by export/import instead of sync |
| The store API is **synchronous** | Making it async today would push a loading state through the UI to serve a backend that does not exist |
| A dependency for `.docx`, none for the mark | OOXML must open cleanly in Word and cannot be checked here; the mark is one copied SVG path — Material Symbols' `balance`, Apache 2.0, attributed in the README — not an icon font or library |

---

## What to do next

Roughly in the order I would take them.

### 1. The remaining citation gaps — small each, listed in the README

Every one is a wall a student can hit: "I cannot cite this source."

**Done so far:** SR & O numbers and rules of court (§2.5.1–2.5.2), a `numbering`
field on the statutory instrument; case notes, forthcoming articles and online
journals (§3.3.2–3.3.4), five fields on the journal article; book volumes and
paragraph pinpoints (§3.2.1).

**Cheapest of what is left:** `sub nom` and subsequent history (§2.1.2, §2.1.8),
multiple neutral citations (§2.1.3). On the Harvard side: forum messages,
newspaper articles, secondary referencing, book volumes, and the `doi:` the OU's
journal template allows — each templated in the OU guide but printed without a
worked example, so each needs the form settled before it is coded.

Each needs a field, a formatter branch, a verbatim test, and a README row.

### 2. Abbreviation lookup — medium, high value against silent errors

A table of law report and journal abbreviations, so the tool can warn on `A.C.`
for `AC`, on an unknown report series, or on a court code that is not a real
neutral-citation court. The Cardiff Index to Legal Abbreviations is the standard
reference. This is the main remaining defence against a citation that looks
right and is not — but it is a data-gathering job before it is a coding one.

### 3. The Office.js add-in — large, highest ceiling

Insert citations as real Word footnotes at the cursor in the student's own
document. The user's own brief calls this the key adoption feature, and OU
students get Microsoft 365 free.

**The citation logic is already done and host-agnostic.** `renderFootnotes`
takes an ordered list and returns rendered footnotes; an add-in reads Word's
footnote collection, maps it to that list, and writes the results back. The work
is infrastructure, not citations: a manifest, HTTPS hosting, sideloading for
development, and the Office.js API.

Before starting, check `VERIFY.md` item 1. If copying footnote markers out of the
exported `.docx` turns out to work well in practice, the add-in is less urgent
than it looks. If it does not, it is the only real answer.

### Probably not: an in-browser rich-text editor

Phase 2 originally called for one. Students draft in Word. Building an editor
means building a host nobody uses, and the sequencing engine — the hard part —
already exists and works for either host. Revisit only if the add-in proves
impossible.

---

## Where things live

```
src/model/           style-neutral: types, segments, pinpoints, dates, ordinals
src/oscola/          OSCOLA engine — authors, format/ per type, validate
src/harvard/         Cite Them Right Harvard
src/document/        footnote sequencing: ibid, cross-citations, short forms
src/bibliography.ts  end-of-work lists, ordered per scheme
src/export/docx.ts   Word output, with real Word footnotes
src/clipboard.ts     rich-text copy, so italics survive a paste
src/store/           localStorage persistence and JSON export/import
src/search.ts        search and filter over the saved library
src/citations.ts     mode-aware dispatcher; the module the UI imports
src/fields.ts        form field specs, draft → source, and its lossless inverse
src/components/      form, author rows, preview, footnote sequence, lists
```

Two invariants worth keeping:

- **`buildSource` and `toDraft` must stay exact inverses.** Editing a saved
  source round-trips through them, so a field that only one of them knows about
  is silently erased on edit. There is a test per source type; add to it when
  adding a field.
- **`formatSource(source, mode)` is the only entry point the UI should need.**
  Reaching past it into a specific formatter is how the two schemes drift apart.
