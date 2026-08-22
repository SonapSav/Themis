# Thetis

A citation manager for UK law students, in two schemes:

- **OSCOLA** — Oxford's 4th edn, every source in a footnote.
- **OU dual** — the Open University's undergraduate law scheme (W1xx–W3xx):
  legal sources in CTR OSCOLA footnotes, general academic sources in Cite Them
  Right Harvard, cited in the text with a reference list at the end.

Cases and legislation format identically in both. Only books, chapters,
articles and websites diverge.

The formatting engine, the repeat-citation engine, the end-of-work lists, Word
export and a saved library are all here. What is deliberately absent is a
rich-text editor — students draft in Word — and the Office add-in that would
put citations there directly. `ROADMAP.md` has the state of each phase.

Three documents sit alongside this one:

- `ROADMAP.md` — how to work on this, what has been decided, and what is next.
- `VERIFY.md` — what needs checking by hand, because it cannot be checked from
  the build machine.

```
npm install
npm run dev        # http://localhost:5173
npm test           # 338 tests
npm run typecheck
```

## Layout

```
src/model/           style-neutral — types, rich-text segments, dates, ordinals
src/oscola/          OSCOLA engine — authors, format/ per type, validate
src/harvard/         Cite Them Right Harvard — authors, pages, format
src/citations.ts     mode-aware dispatcher; the module the UI imports
src/bibliography.ts  assembles the end-of-work lists, ordered per scheme
src/store/library.ts browser-local persistence for the source library
src/search.ts        search and filter over the saved library
src/document/        footnote sequencing: ibid, cross-citations, short forms
src/export/docx.ts   Word output, with real Word footnotes
src/clipboard.ts     rich-text copy, so italics survive a paste
src/fields.ts        form field specs + flat draft → typed source
src/components/      form, author rows, preview panel
src/test/setup.ts    jest-dom matchers + unmount between tests
```

## Testing

```
npm test
```

Two layers, in one run:

- **Engine tests** (`src/oscola`, `src/harvard`, `src/citations.test.ts`) run in
  a plain Node environment — no DOM, so they stay fast. Every citation string
  they assert is verbatim from a published guide, and each test names the
  section it comes from.
- **Component tests** (`*.test.tsx`) run in jsdom with React Testing Library and
  `user-event`. They fill the real form and read the real preview, covering the
  wiring rather than the rules: mode switching, per-type draft retention,
  author and editor rows, validation blocking submission, the session list, and
  the copy buttons.

`environmentMatchGlobs` gives only the `.tsx` tests a DOM. jsdom is pinned to
v25 because v26 requires Node 22 and this project builds on Node 20.

Queries go through accessible names throughout, so the tests double as an
accessibility check — writing them is what surfaced the duplicate `Year` labels
on the case form, now separated into `Neutral citation` and `Law report`
fieldsets with hints moved out of the label and onto `aria-describedby`.

`formatSource(source, mode)` is the entry point. It returns either an
`OscolaOutput` (footnote, bibliography entry, name-in-text form) or a
`HarvardOutput` (in-text citation, narrative variant, reference entry). The
underlying `formatFootnote` / `formatBibliography` / `formatReference` /
`formatInTextCitation` remain available directly.

## Repeat citations

`renderFootnotes(footnotes, sources, options)` takes an ordered list of
footnotes and returns each one rendered under OSCOLA 1.2, with the footnote
number and which rule produced it. Pure functions with no DOM, so the same
engine serves a browser editor, a Word add-in, or the preview panel.

| Rule | Behaviour |
| --- | --- |
| **First citation** | In full (§1.2.1). |
| **ibid** | Where the source is cited again in the *immediately* following footnote. Alone it means "the very same place"; with a pinpoint, the same work at a new one. Never italicised or capitalised (§1.2.3). |
| **ibid across several citations** | §1.2.3: with more than one citation in the preceding footnote, `ibid` is available only when referring again to all of them. |
| **Cross-citation** | Otherwise, a short form plus `(n N)` pointing at the footnote with the full citation, with any pinpoint after it: `Stevens (n 1) 110`. |
| **Pinpoint kind** | §2.1.3: "All cases with neutral citations have numbered paragraphs", so a case with one is pinpointed by paragraph and everything else by page, unless told otherwise. |
| **Case short forms** | The party standing first (§2.1.2), so `Page v Smith` becomes `Page`. Judicial review takes the individual: `R (Roberts) v Parole Board` → `Roberts`, `R v Lord Chancellor, ex p Witham` → `Witham`. `R v Evans` keeps its full name, which §2.1.2 permits. Overridable per source for ships and popular names. |
| **Secondary short forms** | The author's surname alone — unless several works by that author are cited anywhere in the document, when the title joins it: `Ashworth, 'Testing Fidelity to Legal Values' (n 27) 635-37`. Detected across the whole sequence, not just locally. |
| **Legislation** | Never takes a cross-citation. §1.2.1: the short form is announced in brackets on the first citation and used bare thereafter, "with the result that cross-citation is never necessary". §2.4.1 puts the provision after the announced form without a comma: `Nuclear Installations Act 1965 (NIA 1965) s 7(1)`, later `NIA 1965, s 12`. The announcement appears only where the source is actually cited again. |
| **Consistency** | §1.2.3 warns "Do not switch back and forth", so `repeatStyle: 'cross-citation'` suppresses `ibid` throughout rather than mixing. |

§1.2's worked examples — Stevens, Ashworth, Raz, both Austin footnotes and the
Working Time Directive — are reproduced footnote for footnote as tests, at the
guide's own footnote numbers, as is §2.1.7's footnote 101.

The **Footnote sequence** panel is the smallest host for it: add citations in
order, set a pinpoint per footnote, reorder, and watch the forms and numbers
follow.

## Getting citations into Word

**Copying keeps its italics.** OSCOLA italicises case names (§2.1.1) and book
titles (§3.1.2), so a plain-text copy silently drops part of the citation on the
way into an essay. Copy writes both a `text/html` and a `text/plain` flavour, so
Word takes the formatted one and anything else takes the plain one. Where the
browser has no `ClipboardItem`, or refuses the richer form, it falls back to
plain text rather than failing.

"Copy Markdown" stays plain — it is for tools that read Markdown, not for Word.

**Export to Word** writes a `.docx` holding:

- the footnote sequence as **real Word footnotes**, one per line. Selecting a
  footnote marker in Word and copying it carries the footnote across to another
  document and renumbers it, so the file works as a skeleton to lift citations
  out of;
- the end-of-work lists as headed paragraphs with a hanging indent, italics
  intact.

`planDocx` builds the whole document as plain data, so what goes into the file
is tested without packing one; `buildDocx` then packs it. The `docx` package is
loaded on demand, keeping it out of the initial bundle — writing the OOXML
container by hand would be a lot of fragile code for something that must open
cleanly in Word.

## End-of-work lists

`assemble(sources, mode)` builds the lists that go at the end of the work, each
ordered by its own rule.

| Section | Mode | Ordering |
| --- | --- | --- |
| Table of cases | OSCOLA | Alphabetical by first significant word, so `Re Farquar's Estate` files as `Farquar's Estate, Re` and `The Starsin` as `Starsin, The`. Case names in roman (§1.6.2). |
| Table of legislation | OSCOLA | Alphabetical by first significant word, **not** chronological; statutory instruments listed after the statutes (§1.6.3). |
| Table of EU legislation | OSCOLA | Listed separately, per §1.6.3's advice on more than one jurisdiction. |
| Bibliography | OSCOLA | Unattributed works first by first major word of title, then by author surname. Within one author: sole-authored works chronologically, then co-authored ones grouped by co-author. After the first entry the author's name becomes `——` (§1.7). |
| Reference list | OU dual | Alphabetical by author surname (Cite Them Right). Legal sources appear only in footnotes and are excluded, with a note saying how many. |

§1.7's worked example — the five Hart and Honoré entries — is reproduced line for
line as a test, including the difference between `—— Punishment and
Responsibility` (the dash replaces the name *and* its comma) and `—— and Honoré
AM, Causation in the Law` (it replaces only the name).

## Editing the library

Each saved source has an **Edit** button, which loads it back into the form; the
submit button becomes **Save changes** and the source is replaced in place,
keeping its id so any footnote citing it still resolves. Changing the source
type, or removing the source being edited, abandons the edit.

`toDraft(source)` is the inverse of `buildSource`, and the round trip is
lossless — a test asserts it for all ten source types, which is why the short
forms the repeat-citation engine uses (`shortName`, `shortForm`, `shortTitle`)
are on the form rather than settable only in code.

## Finding a source again

A library is kept for a whole module, so the list needs searching rather than
scrolling. `src/search.ts` filters it three ways at once — free text, source
type, source category — and the panel says how much is hidden.

The text searched is the citation **as the current scheme renders it**, footnote
and end-of-work entry together, plus the type as the form names it. So the OSCOLA
footnote's `Andrew Ashworth` and the bibliography's inverted `Ashworth A` both
find the same book, and under the OU scheme that same book answers to
`Bell, J. (2014)`. Nothing here is a citation rule: it matches what the
formatters already print.

What is typed never matches what is printed exactly, so both sides are folded
first: case, accents, and the typography citations are full of and keyboards
lack — curly quotation marks around an article title, an en dash in a page
range. Terms are matched as substrings, all of them, in any order, so a
half-remembered `levia` still finds *Leviathan*.

The type filter offers only the types the library actually holds; filtering to
an empty result offers a way back rather than an empty panel.

## Persistence

The library is kept in `localStorage` under `thetis.library`, versioned, and
never leaves the browser — there is no backend. Every access is guarded: a
private window, blocked site data or a full quota degrades to an in-memory
session rather than an error, and a corrupted entry costs that one source
rather than the whole library.

**Browser storage is not durable**, which is why export exists. Safari's
tracking prevention deletes script-writable storage after seven days without
interaction with the site; clearing site data or changing browser loses it
outright. An OU module runs nine months. So:

- **Export** writes `thetis-sources-YYYY-MM-DD.json` — a dated, self-describing
  file the student keeps. It is also how a library moves between machines,
  with no server involved.
- **Import adds; it never replaces.** A mistaken import cannot destroy existing
  work. Sources already held are skipped by content fingerprint, so re-importing
  the same file is a no-op whatever the ids say, and incoming sources are
  re-keyed so ids cannot collide. Unreadable entries are reported and skipped
  rather than failing the whole file.
- A first import onto an empty library adopts the file's scheme; merging into a
  library that already has sources leaves the current choice alone.

`src/store/library.ts` and `src/store/transfer.ts` are the only modules that
touch storage, so a future backend is a contained change. The store API is
deliberately synchronous: making it async today would push a loading state
through the UI to serve a backend that does not exist.

## Source types

| Type | Category | OSCOLA mode | OU dual mode |
| --- | --- | --- | --- |
| Case | legal | OSCOLA | OSCOLA |
| UK Act | legal | OSCOLA | OSCOLA |
| Statutory instrument | legal | OSCOLA | OSCOLA |
| EU legislation | legal | OSCOLA | OSCOLA |
| EU case | legal | OSCOLA | OSCOLA |
| Book | academic | OSCOLA | Harvard |
| Chapter in an edited book | academic | OSCOLA | Harvard |
| Journal article | academic | OSCOLA | Harvard |
| Website | academic | OSCOLA | Harvard |
| OU module material | academic | *not offered* | Harvard |

OU module material has no OSCOLA equivalent, so it is hidden in OSCOLA mode and
the OSCOLA formatter throws rather than inventing a form for it.

## The OU dual scheme

Sourced from the OU Library's own public guidance, not from Cite Them Right
itself, which is paywalled:
[law modules quick guide](https://university.open.ac.uk/library/help-and-support/quick-guide-to-cite-them-right-referencing-for-law-modules)
and [Harvard quick guide](https://university.open.ac.uk/library/referencing-and-plagiarism/quick-guide-to-harvard-referencing-cite-them-right).

| Rule | Behaviour |
| --- | --- |
| **Where legal sources appear** | Footnotes only. In OU dual mode `formatSource` returns no bibliography entry for a legal source, and the preview says so. In OSCOLA mode they still get a table of cases / legislation entry. |
| **Harvard in-text** | `(Bell, 2014)` or narrative `Bell (2014)`; with pages, `(Harris, 2015, p. 5)` and `(Clarke, 2001, pp. 98–99)`. Up to three authors are named; four or more give the first plus italic *et al.* — where OSCOLA uses "and others" above three. |
| **Harvard initials** | `Bell, J.`, `Franklin, A.W.` — full stops, no spaces. OSCOLA writes the same author `Bell J`. |
| **Place of publication** | Omitted, following Cite Them Right 12th edn and the OU's current law page. Their 2019 Harvard PDF still shows the 11th edn form (`Maidenhead: Open University Press`); the two disagree and the newer one wins. |
| **Web page titles** | Italic in Harvard (`Castles of Spain`), quoted in roman in OSCOLA. The same source renders differently by mode. |
| **No author / no date** | An unattributed work is cited by its italicised title; a missing date gives `n.d.`. An unattributed OU module item is cited to `The Open University`. |
| **Word count** | In-text Harvard citations count towards an OU word limit; footnotes and the reference list do not. Noted on each preview panel. |

## No inline citations in OSCOLA — by design

§1.1 is explicit: *"OSCOLA is a footnote style: all citations appear in
footnotes. OSCOLA does not use endnotes or in-text citations, such as
'(Brown, 2007)'."* A Harvard-style inline form is therefore not a missing
feature but a prohibited one, and Thetis will never emit one for a source it is
formatting in OSCOLA. Harvard in-text citations appear only for academic
sources in OU dual mode, which is a different scheme, not an OSCOLA variant.

What OSCOLA *does* give is a rule for when your prose already names the source,
which `nameInTextForm(source)` returns and the preview shows as a third panel:

| Type | Rule | Effect |
| --- | --- | --- |
| Case | §1.1.1: "If the name of the case is given in the text, it is not necessary to repeat it in the footnote." | Footnote drops the case name — §1.2's worked example reduces a first citation of *Austin* to `[2009] UKHL 5, [2009] AC 564`. |
| UK Act | §1.1.2: no footnote is required where the text gives everything the reader needs. §2.4.2: full words in prose, abbreviations in footnotes. | No footnote at all, and a prose form: `section 5(1)(a) of the Race Relations Act 1976`. |
| Book, article, website | §1.1.3: a secondary source is always cited in a footnote. | Nothing changes; the panel says so. |

Deciding *which* form a given footnote needs depends on what the sentence says,
so Thetis shows both and leaves the choice to the writer. Shortened repeat
citations — `ibid`, `Austin (n 1)` — are Phase 2.

## Output is styled segments, not a markup string

A formatted citation is `{ text, style }[]`, rendered by `toPlainText`,
`toHtml`, or `toMarkdown`. Tests assert on plain text without markup noise, and
the Phase 3 .docx exporter can map segments onto Word run properties rather than
parsing HTML back out.

## OSCOLA decisions encoded here

These are the judgement calls the formatter makes. Each is covered by a test that
names the guide section it comes from, so they can be audited and changed
deliberately. Every citation string asserted in the tests appears verbatim in
[OSCOLA 4th edn](https://www.law.ox.ac.uk/sites/default/files/migrated/oscola_4th_edn_hart_2012.pdf)
or its [quick reference guide](https://www.law.ox.ac.uk/sites/default/files/migrated/oscola_4th_edn_hart_2012quickreferenceguide.pdf),
Nothing in the suite is invented.

| Rule | Behaviour |
| --- | --- |
| **Book place of publication** | Omitted. §3.2.1: "The place of publication need not be given." The `place` field is kept on the type so data round-trips, and entering one raises a warning explaining it will not appear. |
| **Book publication bracket** | §3.2.1's order is `(additional information, edition, publisher year)`, publisher and year separated by a space and no punctuation. "Additional information" is a general slot — an editor or translator of an *authored* work (`John Gardner ed`, `Tony Weir tr`), a series, or `first published 1651` — and always precedes the edition. |
| **Editions** | §3.2.1: `2nd edn`, or `rev edn` for a revised edition. A first edition is not cited, so `1` renders nothing. Non-numeric input passes through, so `rev` gives `rev edn`. |
| **Case year brackets** | An explicit `yearFormat` field, defaulting to square. §2.1.1: square where the year identifies the volume (`Barrett v Enfield LBC [2001] 2 AC 550 (HL)`), round for the year of *judgment* where the volumes are independently numbered (`Barrett v Enfield LBC (1999) 49 BMLR 1 (HL)`). Not inferable — `[2008] 1 AC 884` has both a volume and square brackets. |
| **Unreported cases** | §2.1.4: a case that is unreported and has no neutral citation is given by its court and date of judgment in place of a report — `Stubbs v Sayer (CA, 8 November 1990)` — with no need for the word "unreported". A neutral citation, where there is one, is given instead. EU cases follow §2.6.2 the same way: `Case T–277/08 Bayer Healthcare v OHMI—Uriach Aquilea OTC (CFI, 11 November 2009)`. |
| **Court in brackets** | §2.1.3 and §2.1.5: the court is **not** cited where there is a neutral citation, because the neutral citation identifies the court, nor for cases decided before 1865. A court entered alongside a neutral citation is dropped from the output and a warning says so. Where it is cited, it follows the first page and precedes any pinpoint. |
| **Table of cases** | §1.6.2: case names are **not** italicised in a table of cases, though they are in footnotes (§2.1.1). The two formatters differ accordingly. |
| **Neutral citations** | Modelled separately from the law report and cited first: `Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884`. The two carry independent years, because they differ (`[2004] EWCA Civ 1031, [2005] QB 410`). |
| **Journal year brackets** | Inferred, unlike cases. §3.3.1: square "if it identifies the volume", round "if there is a separate volume number". An issue number goes in brackets immediately after the volume, and only where pagination restarts each issue. |
| **What is italicised** | Book titles (§3.1.2) and case names in footnotes (§2.1.1). *Not* italicised: article titles and journal names, both roman (§3.3.1); Act short titles (§2.4.1); case names in a table of cases (§1.6.2). The website or blog name **is** italicised (§3.4.8) — the page's own title stays in roman inside quotation marks, as with newspapers (§3.4.9). |
| **Terminal punctuation** | Footnotes close with a full stop; bibliography and table entries do not. |
| **Acts** | §2.4.1: short title and year in roman, no comma before the year. §2.4.2: a provision follows a comma after the year, with a space and no full stop before the number (`Human Rights Act 1998, s 15(1)(b)`). Provisions are dropped from the table of legislation. |
| **Judge attribution** | §2.1.7: the judge's name goes in brackets after the pinpoint — `[27] (Laws LJ)`, `547 (Potter J)` — and "per" is never used. Passages can be attributed individually, so §1.2.1's `ibid [34] (Lord Hope), [39] (Lord Scott), [43]–[47] (Lord Walker), [58]–[60] (Lord Neuberger)` renders as printed. A single judge attributes the whole pinpoint and is named once: `[42], [45] (Lord Woolf CJ)`. |
| **Pinpoints** | Dropped from bibliography and table entries. In footnotes (§2.1.6): paragraphs are bracketed individually, with no preceding comma, whether single (`… 1 AC 1339 [14]`), a range (`[1]–[37]`) or a list (`[42], [45]`); pages take a comma after a report (`[1996] AC 155, 165`) but a space after a bracketed court (`[1990] QB 523 (QB) 530–31`) or a book's publication bracket (`(OUP 2009) 68`). Multiple pages are comma-separated (`(CA) 720, 723`). |
| **Author names** | Given names and surname stored separately — no free-text name parse is reliable. Footnotes give names in full; bibliographies invert **every** author and reduce given names to initials with no stops or spaces. Corporate authors are never inverted. Evidence: §1.7 lists `—— and Honoré AM, Causation in the Law (2nd edn, OUP 1985)` under `Hart HLA`, i.e. `Hart HLA and Honoré AM` — the co-author inverts too. |
| **Names already initialised** | A given name that is an initialism is kept whole: §1.7 and §3.2.2 give `HLA Hart` in a footnote and `Hart HLA` in the bibliography, so `HLA` must not reduce to `H`. |
| **Unattributed works** | §1.7 exception (3): a bibliography entry with no author is preceded by a double em-dash (`—— 'Title' …`). Footnotes simply begin with the title. |
| **URLs** | §3.1.4: `http://` is included only where the address does not begin with `www`. The guide's own example is `<www.nakedlaw.com/2009/05/index.html>`. Entering a redundant `http://www.` raises a warning; the URL is never rewritten silently. |
| **Four or more authors** | Reduced to the first plus "and others", in both footnote and bibliography. |
| **Editions** | First editions are not cited, so `1` renders nothing. Later editions render `7th edn`. |
| **Quotation marks** | Straight single quotes around article and web page titles. Titles are stored and emitted verbatim — §3.1.2 wants major words capitalised, but auto-capitalising would silently rewrite the student's source, so that is left to them. |

## Validation

`validate(source)` returns `error` issues (the citation cannot be correct as it
stands) and `warning` issues (it will render, but departs from OSCOLA's
preference — a post-2001 case with no neutral citation, a journal article with
no volume, a report-only case with no court). Errors are surfaced inline on the
field and block adding the source; the panel lists both.

The failure mode for a tool like this is a silent citation error a student does
not catch, so the checks are deliberately noisy about the ambiguous cases rather
than guessing.

## Known gaps

Turned up by the primary-source check and deliberately left for later, because
each needs a new field rather than a formatting fix. See `ROADMAP.md` for what
is planned next, and `VERIFY.md` for what needs checking by hand.

**Cite Them Right**

- **Same author, same year** — CTR distinguishes these with a letter after the
  date (`2014a`, `2014b`), but the OU's public guidance does not show the form,
  so Thetis flags the clash and leaves the fix to the student.

- **`(eds)` for several editors** — the OU guide prints only the singular
  `(ed.)`, so the plural is inferred. Worth checking against CTR itself.
- **The corporate-author full stop** — the OU template prints
  `The Open University. (Year)`, its own example prints
  `The Open University (2025)`. Thetis follows the example.
- **Harvard forum messages, newspaper articles and secondary referencing**
  (`Fernandez (2015, quoted in Nabokov, 2017)`) are templated in the OU guide
  but not yet modelled here.

**Secondary sources**

- **Book volume numbers** — §3.2.1: the volume follows the publication details
  (`(CH Beck 2000) vol 2`), unless the volumes' publication details vary, in
  which case it precedes them and follows the title.
- **Online journals** — §3.3.4 appends `<web address> accessed date` to an
  otherwise ordinary article citation. The journal type has no URL field.
- **Case notes** (§3.3.2, `… [2006] Crim LR 441 (note)`) and **forthcoming
  articles** (§3.3.3, `(forthcoming)`).
- **No publisher** — §3.2.1 requires one, but its own research-report example
  (`(Ministry of Justice Research Series 1/09, 2009)`) has none. Validation
  currently treats a missing publisher as an error; such reports belong to
  §3.4, outside these five types.

**Cases**

- **Multiple neutral citations** for one report (§2.1.3, `Masterman-Lister`).
- **`sub nom`, subsequent history (`affd`, `revd`)** (§2.1.2, §2.1.8).
- **EU case numbers** are passed through as typed. OSCOLA prints them with an
  en dash (`C–176/03`); Thetis does not silently convert a hyphen, because the
  official EU form uses a hyphen and guessing either way would be wrong.
- **Shortened footnotes for EU cases** — §1.1.1's "name given in the text" rule
  is stated for case names, and the guide shows no shortened form for a
  citation that leads with a registration number, so Thetis does not extrapolate.
- **SR & O numbers** (§2.5.1) and **rules of court** (§2.5.2, `CPR 7`).

## Not yet supported

Ten source types are modelled. Beyond them: command papers, theses, newspaper
articles, international materials, and the rest of OSCOLA §3.4; the abbreviation
lookup table that would catch `A.C.` for `AC`; and the Office add-in. The gaps
inside the ten types are listed above.
