# Thetis

A citation manager for UK law students, in two schemes:

- **OSCOLA** — Oxford's 4th edn, every source in a footnote.
- **OU dual** — the Open University's undergraduate law scheme: legal sources
  in CTR OSCOLA footnotes, general academic sources in Cite Them Right Harvard,
  cited in the text with a reference list at the end.

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
npm test           # 444 tests
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
src/store/storage.ts the one guarded way in to localStorage
src/appearance.ts    theme and typeface — which palette, never what it holds
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
  out of. **Confirmed in Word**, not just intended: this was the open question
  over whether the export was a real workflow or a stopgap, and it is the reason
  the Office add-in sits at the back of `ROADMAP.md` rather than the front;
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

`src/store/library.ts`, `src/store/transfer.ts` and `src/store/appearance.ts`
are the only modules that touch storage, all of them through the single guarded
accessor in `src/store/storage.ts`, so a future backend is a contained change. The store API is
deliberately synchronous: making it async today would push a loading state
through the UI to serve a backend that does not exist.

## Theme and typeface

Two selects in the masthead, and neither touches a citation.

**Theme** is Light, Dark, or *Match my system*, which is the default: someone
who wants a dark screen has usually already said so once, to their operating
system. That choice is watched rather than read once, so a laptop set to switch
at dusk switches Thetis with it, without a reload.

**Typeface** is Georgia, Times New Roman, Arial or Verdana. Nothing is
downloaded — every one is a face the machine already has, so the choice costs no
request and works offline. Georgia is the house face; Times New Roman is what
most essays are set in; Arial and Verdana are there because the OU's own
accessibility guidance names them, Verdana for its wide letterforms. Each stack
names a metric-compatible Linux substitute after the proprietary face, so a Pi
renders the choice rather than falling back to the same serif twice.

There is no font-size control: the browser's own zoom does it better, and
applies to everything.

`src/appearance.ts` decides *which* palette and *which* stack; the palettes and
stacks themselves live in `styles.css`, keyed off `data-theme` and
`data-typeface` on the root element. Two things follow from that split, and both
are asserted rather than trusted, because either would fail silently:

- every typeface offered has a `--font-body` rule behind it;
- every colour in the light palette has a dark counterpart.

The choice is applied in `main.tsx` **before the first paint**, not in an effect
after it, so a dark reader is never shown a white page for a frame. It is stored
under its own key, `thetis.appearance`, apart from the library: clearing your
sources is about sources, and is not a factory reset.

Dark mode also forced two colours into the open that had been literal `#fff` —
the text on an accent fill, and the ground under a text field. Both are now
`--on-accent` and `--field`, because white text on the accent is unreadable the
moment the accent is the light half of the pair.

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
| **Book volumes** | §3.2.1: the volume "follows the publication details, unless the publication details of the volumes vary, in which case it precedes them, and is separated from the title by a comma". A **Volume position** select chooses between `Halsbury's Laws (5th edn, 2010) vol 57` and `The Common European Law of Torts, vol 2 (CH Beck 2000)`. A pinpoint after a trailing volume takes a comma — `vol 57, para 53`, `vol 1, ch 3` — where one after the publication bracket alone takes a space. A `vol` already typed is not doubled. |
| **Book paragraphs** | §3.2.1: "Pinpoint to paragraphs rather than pages if the paragraphs are numbered." A book's paragraphs are **labelled**, `para 76`, not bracketed as a case's are (§2.1.6). No plural is inferred: the guide prints no `paras` for a book, and its looseleaf `para 8–106` is one paragraph's number rather than a range, so a `paras` the student types is respected and nothing is guessed. |
| **Case year brackets** | An explicit `yearFormat` field, defaulting to square. §2.1.1: square where the year identifies the volume (`Barrett v Enfield LBC [2001] 2 AC 550 (HL)`), round for the year of *judgment* where the volumes are independently numbered (`Barrett v Enfield LBC (1999) 49 BMLR 1 (HL)`). Not inferable — `[2008] 1 AC 884` has both a volume and square brackets. |
| **Unreported cases** | §2.1.4: a case that is unreported and has no neutral citation is given by its court and date of judgment in place of a report — `Stubbs v Sayer (CA, 8 November 1990)` — with no need for the word "unreported". A neutral citation, where there is one, is given instead. EU cases follow §2.6.2 the same way: `Case T–277/08 Bayer Healthcare v OHMI—Uriach Aquilea OTC (CFI, 11 November 2009)`. |
| **Court in brackets** | §2.1.3 and §2.1.5: the court is **not** cited where there is a neutral citation, because the neutral citation identifies the court, nor for cases decided before 1865. A court entered alongside a neutral citation is dropped from the output and a warning says so. Where it is cited, it follows the first page and precedes any pinpoint. |
| **Table of cases** | §1.6.2: case names are **not** italicised in a table of cases, though they are in footnotes (§2.1.1). The two formatters differ accordingly. |
| **Neutral citations** | Modelled separately from the law report and cited first: `Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884`. The two carry independent years, because they differ (`[2004] EWCA Civ 1031, [2005] QB 410`). |
| **More than one neutral citation** | §2.1.3: where one report holds more than one judgment, the neutral citations are listed "in chronological order, starting with the oldest, and separate[d] with a comma", before the report — `Masterman-Lister v Brutton & Co (Nos 1 and 2) [2002] EWCA Civ 1889, [2003] EWCA Civ 70, [2003] 1 WLR 1511`. |
| **`sub nom`** | §2.1.2: where the same case is reported under significantly different names, the report using the alternative name is introduced by `sub nom`, **in roman** while both case names stay italic — `Gibbons v South West Water Services Ltd [1993] QB 507, sub nom AB v South West Water Services Ltd [1993] 2 WLR 507 (CA)`. The same applies to a name changed at a later stage. |
| **Subsequent history** | §2.1.8: `affd` and `revd` abbreviate "affirmed" and "reversed", and "refer to the decision in the primary citation" — `Roberts v Gable [2006] EWHC 1025 (QB), [2006] EMLR 23, affd [2007] EWCA Civ 721, [2008] QB 502`. They combine with `sub nom`, as §2.1.2's own `affd sub nom` example shows. §2.1.3's rule applies again to the later citation: a court entered alongside a later neutral citation is dropped. |
| **Journal year brackets** | Inferred, unlike cases. §3.3.1: square "if it identifies the volume", round "if there is a separate volume number". An issue number goes in brackets immediately after the volume, and only where pagination restarts each issue. |
| **Case notes** | §3.3.2: a case note with its own title is cited as an ordinary article. One without a title puts the case name, **italicised**, where the title would go, and closes with `(note)`: `Andrew Ashworth, 'R (Singh) v Chief Constable of the West Midlands Police' [2006] Crim LR 441 (note)`. Where the text identifies the case, the name is dropped from the citation and the comma after the author goes with it — `Andrew Ashworth [2006] Crim LR 441 (note)` — which the preview offers as the name-in-text form. The section also says the case belongs in the table of cases even when not separately cited, so the panel says so. |
| **Forthcoming articles** | §3.3.3: cited as published articles, closing with `(forthcoming)`. "If volume and/or page numbers are not yet known, simply omit that information", so neither a missing volume nor a missing page is flagged on a forthcoming article. |
| **Online journals** | §3.3.4: ordinary publication details, then `<web address> accessed date`. Pinpoints "follow the citation and come before the web address". Online journals "may lack some of the publication elements (for example, many do not include page numbers)" — the guide's own EJLT example has none — so the first page stops being required once there is a URL. §3.1.4's `http://` rule applies to the address, as it does to a web page's. |
| **What is italicised** | Book titles (§3.1.2) and case names in footnotes (§2.1.1). *Not* italicised: article titles and journal names, both roman (§3.3.1); Act short titles (§2.4.1); case names in a table of cases (§1.6.2). The website or blog name **is** italicised (§3.4.8) — the page's own title stays in roman inside quotation marks, as with newspapers (§3.4.9). |
| **Terminal punctuation** | Footnotes close with a full stop; bibliography and table entries do not. |
| **Acts** | §2.4.1: short title and year in roman, no comma before the year. §2.4.2: a provision follows a comma after the year, with a space and no full stop before the number (`Human Rights Act 1998, s 15(1)(b)`). Provisions are dropped from the table of legislation. |
| **Statutory instruments** | §2.5.1: name, year, then the SI number after a comma (`Penalties for Disorderly Behaviour (Amendment of Minimum Age) Order 2004, SI 2004/3166`). A **Numbering** field switches the label to `SR & O` for the pre-1948 statutory rules and orders (`Hollow-ware and Galvanising Welfare Order 1921, SR & O 1921/2032`), which the same section cites “by their title and SR & O number”. |
| **Rules of court** | §2.5.2: the CPR, RSC and CCR “may be cited without reference to their SI number or year”, so the third **Numbering** option drops both and leaves the name: `CPR 7`, `RSC Ord 24, r 14A`, `CCR Ord 17, r 11`, and practice directions numbered by the part they supplement (`6A PD 4.1`). §2.5.3: no comma before the pinpoint (`CPR 5.2(1)(b)`), and a CPR pinpoint written with `r` or `rr` raises a warning, because that section says to omit them. A year or SI number entered anyway is left out, and says so. Every other court rule is cited in full as a statutory instrument. |
| **Judge attribution** | §2.1.7: the judge's name goes in brackets after the pinpoint — `[27] (Laws LJ)`, `547 (Potter J)` — and "per" is never used. Passages can be attributed individually, so §1.2.1's `ibid [34] (Lord Hope), [39] (Lord Scott), [43]–[47] (Lord Walker), [58]–[60] (Lord Neuberger)` renders as printed. A single judge attributes the whole pinpoint and is named once: `[42], [45] (Lord Woolf CJ)`. |
| **Pinpoints** | Dropped from bibliography and table entries. In footnotes (§2.1.6): paragraphs are bracketed individually, with no preceding comma, whether single (`… 1 AC 1339 [14]`), a range (`[1]–[37]`) or a list (`[42], [45]`); pages take a comma after a report (`[1996] AC 155, 165`) but a space after a bracketed court (`[1990] QB 523 (QB) 530–31`) or a book's publication bracket (`(OUP 2009) 68`). Multiple pages are comma-separated (`(CA) 720, 723`). |
| **Author names** | Given names and surname stored separately — no free-text name parse is reliable. Footnotes give names in full; bibliographies invert **every** author and reduce given names to initials with no stops or spaces. Corporate authors are never inverted. Evidence: §1.7 lists `—— and Honoré AM, Causation in the Law (2nd edn, OUP 1985)` under `Hart HLA`, i.e. `Hart HLA and Honoré AM` — the co-author inverts too. |
| **Names already initialised** | A given name that is an initialism is kept whole: §1.7 and §3.2.2 give `HLA Hart` in a footnote and `Hart HLA` in the bibliography, so `HLA` must not reduce to `H`. |
| **Unattributed works** | §1.7 exception (3): a bibliography entry with no author is preceded by a double em-dash (`—— 'Title' …`). Footnotes simply begin with the title. |
| **URLs** | §3.1.4: `http://` is included only where the address does not begin with `www`. The guide's own example is `<www.nakedlaw.com/2009/05/index.html>`. Entering a redundant `http://www.` raises a warning; the URL is never rewritten silently. |
| **Four or more authors** | Reduced to the first plus "and others", in both footnote and bibliography. |
| **Editions** | First editions are not cited, so `1` renders nothing. Later editions render `7th edn`. |
| **No full stops in abbreviations** | §4.2.1, in terms: "In OSCOLA, abbreviations do not have full stops." `A.C.` is flagged with what it would normally be — `AC` — and **never rewritten**, because the same field legitimately carries `Lloyd's Rep` and `Cr App R (S)`. Applied to report series, journal abbreviations and court codes. |
| **Neutral citation courts** | §4.1's appendix is the table: 26 rows, 17 codes. An unlisted code warns *softly* — §4.1 is the 2012 list, so a court created since is genuinely absent rather than wrong. A miscased code is named rather than merely rejected (`"UKHL", not "ukhl"`). §2.1.3's rule that High Court citations carry a division is checked against the eight §4.1 lists for `EWHC`, and a division given to a court that takes none is flagged too. |
| **Quotation marks** | Straight single quotes around article and web page titles. Titles are stored and emitted verbatim — §3.1.2 wants major words capitalised, but auto-capitalising would silently rewrite the student's source, so that is left to them. |

## The form folds away what most sources do not need

There is no conditional logic in the form: every field of a type is rendered,
because whether a case has a later history is not something the form can work
out. But the case form reached 33 fields, which buries the ones nearly every
citation actually needs. So the rule is:

> **A reader sees everything a citation of that type cannot be saved without,
> and opts in to the rest.**

That is asserted, not just described — `fields.test.ts` builds an empty form for
every source type, asks `validate` what it errors on, and fails if any of those
fields sits inside a folded group. The rule cannot decay quietly as fields are
added.

Folded on the case form: `Pinpoint and short name`, `Second neutral citation`,
`Later history`, `Later neutral citation`, `Later law report`. On the book:
`Reprints and translations`, `Multi-volume works`, `Pinpoint and short title`.
On the journal article: `Pinpoint and short title`, `Case note, forthcoming,
online`.

**Folding is only applied to the three forms big enough to need it** — case
(33 fields), book and journal article (13 each). Below about ten fields a click
costs more than the clutter saves, and OU module material is required end to
end, so there is nothing to fold. Nine fields on the case form are visible where
thirty-three were.

There is no group called "Other" any more. It had collected two of the
most-used fields on the case form (`Court`, `Pinpoint`) alongside three of the
rarest, because `toSections` can start a group but never end one — so every
field after a group needed *some* name to escape it. Each group now maps to one
thing the formatter emits: `Court and date` is the single bracket
`courtBracket()` produces, `(HL)` or `(CA, 8 November 1990)`; `Pinpoint and
short name` is the pinpoint and the judge §2.1.7 attaches to it.

Three rules keep that from hiding anything:

- **A folded group opens by itself when it holds something** — editing a saved
  source with a volume opens the volume group, so nothing is silently invisible
  to someone correcting it.
- **It also opens when it holds a validation issue**, so a warning does not
  appear from nowhere behind a closed heading. Folding it back is still your
  call, and the Checks panel lists every issue whatever the form is showing.
- **Your choice is remembered** until the source type changes. Someone entering
  one multi-volume book is probably entering another, so the group does not
  snap shut after each one.

The toggle is a real `<button aria-expanded>` inside the `<legend>`, so the
fieldset still takes its accessible name from the legend, the control is
reachable by keyboard, and its state is announced. Folded fields are **removed
from the DOM** rather than hidden, so nothing invisible stays focusable — and a
component test that fills one has to open it first, exactly as a person does.
That is why the eight tests touching these groups gained an `openGroup` call
rather than a workaround.

## Validation

`src/oscola/courts.ts` holds §4.1's court table, generated from the guide's own
appendix rather than typed from memory — see *Where the data comes from* below.

`validate(source)` returns `error` issues (the citation cannot be correct as it
stands) and `warning` issues (it will render, but departs from OSCOLA's
preference — a post-2001 case with no neutral citation, a journal article with
no volume, a report-only case with no court). Errors are surfaced inline on the
field and block adding the source; the panel lists both.

The failure mode for a tool like this is a silent citation error a student does
not catch, so the checks are deliberately noisy about the ambiguous cases rather
than guessing.

## Where the data comes from

`src/oscola/courts.ts` is generated from OSCOLA §4.1's appendix, and how it was
generated matters more than it looks.

The appendix is a two-column table. Extracting it from the PDF's linear text
stream **silently mis-pairs**: a court or report name that wraps to a second
line shifts every pair after it. A first attempt at the neighbouring §4.2.1
produced `Road Traffic Reports` against `RPC`, which reads perfectly plausibly
and is wrong — the answer is `RTR`. Two of eight known-good anchors survived.

That failure mode is worse here than anywhere else in the project. Every other
rule is a formatter that is wrong only if the rule was misread. This table is
used to tell a student their citation is wrong, so a bad row does not merely
produce a bad citation — it overrides a correct one. **A wrong table is worse
than no table.**

So §4.1 is extracted by anchoring each row on the `[Year] CODE number` pattern
rather than on column alignment, which is immune to wrapped names, and
`courts.test.ts` asserts all 26 rows against a transcription of the printed
guide. A regeneration that corrupts the table fails the suite.

§4.2.1's report and journal abbreviations are **not** included for the same
reason: they need positional extraction from the PDF's coordinates to be
trustworthy, and until that exists an unrecognised report series is not flagged
at all. §4.2.1 itself says the list is not exhaustive and points to the
[Cardiff Index of Legal Abbreviations](http://www.legalabbrevs.cardiff.ac.uk),
which is a searchable database rather than a list, so it cannot be bundled.

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
- **Harvard book volumes** are named in the OU's book template — "Series and
  volume number if relevant" — but it prints no worked example, so the form is
  not fixed and is not guessed at. A volume shows in an OSCOLA footnote and not
  in a Harvard reference.
- **Harvard forum messages, newspaper articles and secondary referencing**
  (`Fernandez (2015, quoted in Nabokov, 2017)`) are templated in the OU guide
  but not yet modelled here.
- **Online articles carry no address in Harvard, deliberately.** The OU guide's
  journal template says in terms: "Reference online articles the same way as
  print articles." So an article's URL appears in its OSCOLA footnote (§3.3.4)
  and not in its Harvard reference. The `doi:` the same template allows is not
  yet modelled.
- **Case notes have no Cite Them Right template** in the OU's guides. An
  untitled one renders its case name where the article title goes — the same
  substitution OSCOLA §3.3.2 makes — rather than inventing a CTR rule. `(note)`
  is not added in Harvard.

**Secondary sources**

- **No publisher** — §3.2.1 requires one, but its own research-report example
  (`(Ministry of Justice Research Series 1/09, 2009)`) has none. Validation
  currently treats a missing publisher as an error; such reports belong to
  §3.4, outside these five types.

**Abbreviations**

- **Report and journal series are not checked** against §4.2.1's list, only for
  full stops. See *Where the data comes from*: the list needs positional PDF
  extraction before it can be trusted, and a wrong entry would be worse than
  none. §4.2.2–4.2.4 — historical works, books of authority, and case-name
  abbreviations such as `AG` and `DPP` — are untouched for the same reason.

**Cases**

- **A third neutral citation.** §2.1.3 says "more than one" without a limit, and
  the model holds any number, but the form offers one further citation beyond the
  first — the guide's own example has two, and a repeatable group is UI work
  rather than a citation rule. An imported library keeps what it holds.
- **A pinpoint alongside subsequent history.** Thetis attaches the pinpoint to
  the primary citation, before the `affd` clause, because that is the decision
  the pinpoint refers to. The guide shows no example of the two together.
- **EU case numbers** are passed through as typed. OSCOLA prints them with an
  en dash (`C–176/03`); Thetis does not silently convert a hyphen, because the
  official EU form uses a hyphen and guessing either way would be wrong.
- **Shortened footnotes for EU cases** — §1.1.1's "name given in the text" rule
  is stated for case names, and the guide shows no shortened form for a
  citation that leads with a registration number, so Thetis does not extrapolate.

## Not yet supported

Ten source types are modelled. Beyond them: command papers, theses, newspaper
articles, international materials, and the rest of OSCOLA §3.4; the abbreviation
lookup table that would catch `A.C.` for `AC`; and the Office add-in. The gaps
inside the ten types are listed above.

## Commit authorship

Every commit in this repository carries two names — the human author, and
whichever Claude model actually did the work:

```
Author:         Panos Vasilopoulos <sonap.sav@gmail.com>
Co-authored-by: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

Neither half depends on anyone remembering it.

- The **author** is pinned per-repository in `.git/config`, so it holds
  regardless of the machine's global git identity.
- The **co-author trailer** is added by `.githooks/commit-msg`, which runs on
  every commit however it is made — `git commit -m`, an editor session, an
  amend, or a tool.

**The model name has to stay accurate**, and nothing in the environment reports
it: Claude Code exports a session id and a pid, but not the model. So the hook
keeps it honest two ways. A trailer that already names Claude is never touched,
because an agent knows which model it is and the hook does not — that is the
normal path for a commit Claude makes. Otherwise the name comes from
`claude.coauthor`, with the tracked `DEFAULT_COAUTHOR` in the hook as the
fallback a fresh clone gets. On a model change, set both:

```sh
git config claude.coauthor 'Claude Opus 6 <noreply@anthropic.com>'
```

`Co-authored-by:` is the only spelling GitHub parses into a second author
avatar; `Co-Author:` renders as ordinary message text and attributes nobody.

The hook is tracked in `.githooks/` rather than left in `.git/hooks`, which git
never versions, so it travels with a clone. `core.hooksPath` is what activates
it, and `npm install` sets that through the `prepare` script. To wire it up by
hand:

```sh
git config core.hooksPath .githooks
```

## Licence

MIT — see [LICENSE](LICENSE).

### Third-party assets

The Thetis mark — the balance scale in the masthead and in the browser tab — is
`balance` from [Google Material Symbols](https://github.com/google/material-design-icons),
used under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

The path is unmodified. Fill colours were added, because the icon as published
declares none: it would render black, ignoring the app's accent and disappearing
against a dark tab strip. That change is recorded in both files that carry it,
`public/favicon.svg` and `src/components/ScalesIcon.tsx`.

Google asks for attribution rather than requiring it — "We'd love attribution in
your app's *about* screen, but it's not required" — and the upstream repository
ships no `NOTICE` file. It is given here anyway, because the icon is
redistributed as part of this repository.

This is the only vendored asset. There is no icon font and no icon library; the
single SVG path is copied in. Runtime dependencies are React and `docx`, nothing
else.
