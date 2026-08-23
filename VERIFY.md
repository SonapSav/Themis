# Things to check yourself

Everything Themis does is covered by tests, but some things cannot be verified
from this machine — no Word, no LibreOffice, no browser I can drive, and no
access to Cite Them Right itself, which is paywalled.

**This list holds only what the two primary guides cannot settle.** Anything the
OSCOLA 5th edition PDF or the OU's law-modules quick guide answers has been
read, applied and removed from here; what those two settled is listed at the
bottom so you can see it was not simply dropped.

Roughly in order of how much damage a wrong answer would do.

---

## 1. The Word file — the decisive question is answered

**Confirmed on 23 August 2026.** Selecting a footnote marker in the exported
`.docx`, copying it, and pasting into your own document carries the footnote
across and renumbers it. That was the whole justification for exporting real
Word footnotes rather than a plain list, and the add-in has been demoted in
`ROADMAP.md` accordingly.

What is still unseen is presentation. None of it can break the workflow above:

- [ ] No repair prompt on opening
- [ ] Case names and book titles are *italic* in the footnotes
- [ ] The case name is **not** italic in the Table of cases (1.6.2)
- [ ] The lists have a hanging indent and keep their italics

Two sources — `Corr v IBC Vehicles Ltd` and Burrows, *Remedies for Torts and
Breach of Contract* — cited in the order 1, 1, 2, 1 exercises a repeat and a
cross-citation in four footnotes.

---

## 2. Does a pasted citation keep its italics?

**Why I can't check:** clipboard behaviour differs by browser and cannot be
exercised outside a real one. I tested that Themis offers both a `text/html`
and a `text/plain` flavour and falls back correctly, but not what Word does
with them.

**How to check:** copy a case footnote with the **Copy** button, paste into Word.

- [ ] `Page v Smith` arrives *italic* (OSCOLA 2.1.1 requires this)
- [ ] A book title arrives italic (3.1.2)
- [ ] Pasting into a plain-text editor gives clean text with no HTML tags
- [ ] **Copy Markdown** still gives `*Title*` — that button is deliberately for
      Markdown tools, not for Word

If italics are lost, that is a real citation error, not a cosmetic one.

---

## 3. Cite Them Right — what the OU's public page does not reach

CTR is paywalled. The OU law-modules page is the better authority for OU
students and settled most of what used to be listed here. These four are what it
genuinely does not show.

- [ ] **Plural editors.** The OU page shows an edited book with a single editor,
      `(ed.)`, and no example with more than one. Themis uses `(eds)`. Confirm
      CTR's plural form — `(eds)`, `(eds.)`, or something else.
- [ ] **Same author, same year: the reference-list half.** The OU page shows the
      in-text form, `The Open University (2023a, 5.1)`, so Themis names that form
      in its warning. What it never shows is whether the letter is repeated in
      the reference list entry. Themis assigns no letters at all, on purpose:
      they run in reference-list order, so handing them out silently would
      renumber a finished essay the moment one more source was added.
- [ ] **Book volumes.** The book template ends "Series and volume number if
      relevant" and prints no example, so whether it is `Vol. 2.`, `vol. 2` or
      something else is not fixed. A volume currently appears in an OSCOLA
      footnote and not in a Harvard reference.
- [ ] **Case notes in Harvard.** The OU guides have no case-note template at
      all. Themis renders an untitled case note's case name where the article
      title goes — the same substitution OSCOLA §3.4 makes — and does **not**
      add `(note)`, because that is an OSCOLA marker and no CTR equivalent has
      been seen.
- [ ] **Secondary referencing, the reference-list half.** The OU page shows the
      in-text form and then says only that "your full reference in your
      reference list would then be to the source(s) that you have actually
      read". No worked entry.

---

## 4. OSCOLA calls the 5th edition leaves open

Each is defensible and documented in the README, but none is settled by a worked
example in the guide. Worth an eye if you have a tutor to ask.

- [ ] **EU cases are excluded from the "named in your text" shortening.**
      §1.1.1's rule is stated for case names, and the guide shows no shortened
      form for a citation that leads with a registration number, so Themis does
      not extrapolate.
- [ ] **A pinpoint on EU legislation that announces a short form.** No example
      exists — the 5th edition dropped the Working Time Directive example the
      4th used. Themis puts the pinpoint after the bracket with a comma:
      `… OJ L307/18 (Working Time Directive), art 2`.
- [ ] **A separate Table of EU legislation.** §1.6.3 requires statutory
      instruments to be listed separately from statutes but says nothing about
      EU legislation, so Themis gives it its own section rather than mixing it
      in with the UK statutes.
- [ ] **`R v Evans` keeps its full name** in short forms. §2.1.2 says of
      shortening `R v Caldwell` to `Caldwell` that "either form is acceptable",
      and that the fuller form is usual outside a criminal-law work. Themis
      takes the safer one. Override per source with the short-name field.
- [ ] **One judge over several passages** is named once, at the end:
      `[42], [45] (Lord Woolf CJ)`. The guide only shows different judges on
      different passages.
- [ ] **`(note)` and `(forthcoming)` sit before a web address.** §3.4 puts
      `(note)` "at the end of the citation" and §3.3 describes the address as
      *following* the citation, so Themis takes the citation to end first.
      No example combines them.
- [ ] **A pinpoint sits before an `affd` clause, not after it.** §2.1.8 says
      `affd` and `revd` indicate the subsequent history of the primary
      citation, so Themis attaches the pinpoint to that citation. Its only
      example, `Roberts v Gable … affd [2007] EWCA Civ 721, [2008] QB 502`,
      carries no pinpoint at all, and there is no way yet to pinpoint the
      *later* decision.
- [ ] **How noisy the checks are in real use.** The no-full-stop rule (§5.2.1)
      and the court-code table (§5.1) both warn rather than block, and neither
      rewrites what you typed. §5.1 is the December 2025 list, so a court
      created since it went to press will warn correctly-but-unhelpfully. If
      that gets annoying, say so: a warning students learn to ignore is worse
      than no warning.

---

## 5. Small things

- [ ] **The dark theme, with your own eyes.** There is no browser I can drive
      here, so every colour in it was reasoned about rather than seen. Tests
      assert that every light colour *has* a dark counterpart, which is a
      different claim from it being the right one. Worth a look at: the
      `.rendered` citations against `--panel`; the warning and error text
      (`#e2b25c`, `#f0938a`) against the dark ground; the focus outline on a
      text field; and the accent buttons.
- [ ] **The four typefaces on your machine.** Georgia, Times New Roman, Arial
      and Verdana are system faces, so what you get depends on what is
      installed. On this Pi the proprietary three likely resolve to Liberation
      Serif, Liberation Sans and DejaVu Sans. Check the four are visibly
      different, and that italics still read as italic in each.
- [ ] **The mark at 16px, in a dark tab strip.** There is no SVG rasteriser on
      this machine, so I cannot see it at all. The dark-mode colour `#e0a08d`
      is also the accent across the whole dark theme.
- [ ] **LAN access in a browser.** `http://harmony.local:5173/` and
      `http://192.168.0.63:5173/` both answer to `curl`, but I have not loaded
      them from another machine.
- [ ] **A full run can flake on this Pi.** Once, two `src/App.test.tsx` tests
      failed in a full run and passed 61/61 when that file ran alone. It is
      load, not a regression. Re-run the file alone before believing it.
      `npx vitest run src/oscola src/harvard src/document` runs just the
      engines in about two seconds.

---

## 6. The repository and the GitHub account

Not about citations, but raised and still open. I have no access to your account
settings, so none of this can be checked from here.

- [ ] **Is `sonap.sav@gmail.com` verified on your GitHub account?** Commits are
      authored with it. If it is not on the account, they will not link to your
      profile or count toward your contribution graph —
      https://github.com/settings/emails fixes it retroactively.
- [ ] **Repository visibility.** `SonapSav/Themis` may be public or private; I
      did not check and it is worth being deliberate. Nothing sensitive is in it
      — no keys, no backend, and `.gitignore` covers `node_modules` and `dist`.
- [ ] **The SSH key.** `~/.ssh/id_ed25519` on this Pi, fingerprint
      `SHA256:TWfPo99XDG4sFT4JZ9cm07zH+gaNWxEwkBnG7L1YDSQ`, no passphrase so
      pushes run unattended. Add one with `ssh-keygen -p -f ~/.ssh/id_ed25519`
      if this machine is shared.

---

## What the two guides settled, so it needs none of your time

These were on this list and have been answered from the OSCOLA 5th edition PDF
or the OU's law-modules quick guide, and applied in the code.

**From the OU law-modules page:**

- **Legal sources stay out of the reference list.** "For primary sources of
  law … these primary sources should not be included in the reference list at
  the end of your work." This was the single biggest structural assumption in
  the OU half, and it holds.
- **Which editions.** The page says "this guidance is based on the 5th edition
  of OSCOLA"; you confirmed CTR 13th edn with the OU directly.
- **The corporate-author full stop.** Its template and its worked example agree
  — `The Open University (2025)`, no full stop before the year.
- **"no date", not "n.d."** — the phrase is spelled out, in both the in-text
  citation and the reference.
- **The section number in a module-unit citation** — `The Open University
  (2023a, 5.1)`.
- **`doi:`, newspaper articles and forum messages** are all worked through on
  the page. They are no longer unanswered questions but unbuilt features, and
  have moved to `ROADMAP.md`.

**From the OSCOLA 5th edition:**

- **Closing full stops on shortened footnotes.** §1.2.1's own examples now carry
  them — `Austin (n 1) [34], [39], [43]–[47].` — so Themis's full stop is the
  guide's, not an inference from a bare display example.
- **EU case numbers take a plain hyphen**, not the 4th edition's en dash.
- **A titled case note gets no `(note)`.** §3.4: treat one with a title "as if
  they were journal articles"; the marker is for the untitled form only.
- **Plurals for a book's paragraphs.** §3.1.3 gives the abbreviation as
  "para(s)", so `paras` is the guide's own form.
- **The bare, unbracketed journal year** is no longer a question: the 4th
  edition's Boyle example is not in the 5th, which has no flat-year form to
  reconcile.
- **The CPR pinpoint rule.** The 5th edition dropped the sentence about omitting
  `r` and `rr`, so the check is now read off its examples — `CPR 5.2(1)(b)`,
  `CrPR 8.4`, `FPR 15.2` bare; `RSC Ord 24 r 14A` keeps its `r`.

**Verified earlier, and still true:**

- Every citation string asserted in the tests appears **verbatim** in the guide
  it names, or in the OU's public guides. The OSCOLA PDF is read directly —
  extracted from the file, never recalled — after two recalled "official
  examples" turned out not to exist.
- **Online articles carry no web address in Harvard.** The OU's journal template
  says in terms: "Reference online articles the same way as print articles."
- **The `balance` icon's licence.** Material Symbols is Apache 2.0, confirmed
  from the repository's own `LICENSE`.
