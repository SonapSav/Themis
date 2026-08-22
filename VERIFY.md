# Things to check yourself

Everything Thetis does is covered by tests, but some things cannot be verified
from this machine — no Word, no LibreOffice, no browser I can drive, and no
access to Cite Them Right, which is paywalled. This is the list.

Roughly in order of how much damage a wrong answer would do.

---

## 1. Does the Word file actually open?

**Why I can't check:** there is no Word or LibreOffice on the Pi. I verified the
`.docx` is a well-formed ZIP whose parts include `[Content_Types].xml`,
`word/document.xml` and `word/footnotes.xml`, but "valid ZIP with the right
parts" is not the same as "Word opens it without complaining".

**How to check:** add a couple of sources, build a footnote sequence, click
**Export to Word** in the Your lists panel, and open the file.

- [ ] Word opens it with no repair prompt
- [ ] The footnotes are **real footnotes** — click in the footnote pane, or
      turn on View → Draft → Show Notes. They should not be ordinary text.
- [ ] Case names and book titles are *italic* in the footnotes
- [ ] The lists (Table of cases, Bibliography, Reference list) have a hanging
      indent and keep their italics
- [ ] Selecting a footnote marker in the exported file, copying it, and pasting
      into your own essay carries the footnote across **and renumbers it**

That last point is the whole justification for exporting real footnotes rather
than a plain list. If it does not work smoothly in practice, say so — the honest
conclusion would be that this export is a stopgap and the Office add-in is the
real answer.

---

## 2. Does a pasted citation keep its italics?

**Why I can't check:** clipboard behaviour differs by browser and cannot be
exercised outside a real one. I tested that Thetis offers both a `text/html`
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

## 3. Cite Them Right — four judgement calls

CTR is paywalled. I worked from the OU Library's own public guidance, which is
arguably the better authority for OU students but does not cover everything.
If you have CTR access, these are the gaps.

### 3a. Plural editors

The OU guide prints only the singular, `(ed.)`. Thetis uses `(eds)` for several.

- [ ] Confirm CTR's plural form — `(eds)`, `(eds.)`, or something else

### 3b. Corporate author before the year

The OU template prints `The Open University. (Year of publication)` with a full
stop; its own worked example prints `The Open University (2025)` without one.
Thetis follows the example.

- [ ] Confirm which is right

### 3c. Same author, same year

CTR distinguishes these with a letter after the date (`2014a`, `2014b`), but the
OU guidance does not show the form, so Thetis **flags the clash and stops**
rather than guessing. You will see a warning in the Your lists panel.

- [ ] Confirm the exact form, and whether the letter appears in both the in-text
      citation and the reference list

### 3d. Which CTR edition

Thetis follows the **12th edition**, which drops the place of publication:
`Bell, J. (2014) Doing your research project. Open University Press.`

The OU's own two pages disagree — their 2019 Harvard quick guide still shows the
11th edition form with `Maidenhead:`. I followed the current law-modules page.

- [ ] Confirm your modules expect the 12th edition

---

## 4. Does your module really exclude legal sources from the end list?

You told me legal sources appear in footnotes only, with no table of cases or
legislation at the end, and Thetis is built that way in **OU Dual** mode. This
is the single biggest structural assumption in the OU half.

- [ ] Check your module handbook, or Sections 8–8.2.2 of the Law undergraduate
      guide, and confirm

If your module *does* want tables, switching to OSCOLA mode produces them today,
and making it a separate setting is a small change.

---

## 5. OSCOLA calls where the guide is silent or permissive

Each of these is defensible and documented in the README, but none is settled by
a worked example in the guide. Worth an eye if you have a tutor to ask.

- [ ] **Closing full stops on shortened footnotes.** §1.1 says "Close footnotes
      with a full stop", but the display examples in §1.2 and §1.1.1 print
      `Austin (n 1)` and `[1967] 2 AC 46 (HL)` without one. Thetis adds the full
      stop, reading the bare examples as display formatting.
- [ ] **EU case numbers** are passed through exactly as you type them. The guide
      prints `Case C–176/03` with an **en dash**; the official EU form uses a
      hyphen. Thetis does not convert either way, so type what you want.
- [ ] **EU cases are excluded from the "named in your text" shortening.**
      §1.1.1's rule is stated for case names, and the guide shows no shortened
      form for a citation that leads with a registration number, so Thetis does
      not extrapolate.
- [ ] **A pinpoint on EU legislation that announces a short form** — no guide
      example exists. Thetis puts the pinpoint after the bracket with a comma:
      `… OJ L307/18 (Working Time Directive), art 2`.
- [ ] **A separate Table of EU legislation.** §1.6.3 suggests separate lists per
      jurisdiction, so EU legislation gets its own section rather than mixing in
      with the UK statutes.
- [ ] **`R v Evans` keeps its full name** in short forms. §2.1.2 accepts either
      `R v Evans` or `Evans`; the fuller form is safer outside a criminal-law
      work. Override per source with the short-name field if you disagree.
- [ ] **One judge over several passages** is named once, at the end:
      `[42], [45] (Lord Woolf CJ)`. The guide only shows different judges on
      different passages.

---

## 6. Small things

- [ ] **The favicon in a real tab.** I drew it and rasterised it to check the
      geometry, but never saw it in a browser tab. Check it reads as scales at
      16px, and that the dark-mode colour is legible if your tab strip is dark.
- [ ] **LAN access.** `http://harmony.local:5173/` and
      `http://192.168.0.63:5173/` both answer to `curl`, but I have not loaded
      them in a browser from another machine.
- [ ] **The tests take about 95 seconds**, nearly all of it the DOM tests typing
      character by character. `npx vitest run src/oscola src/harvard src/document`
      runs just the engines in about two seconds if you want a fast loop.

---

## What is already verified, and does not need your time

For contrast — these were checked against the primary sources, not recalled:

- Every citation string asserted in the tests appears **verbatim** in OSCOLA 4th
  edn or its quick reference guide, or in the OU's public guides. Each test names
  the section it comes from.
- §1.2's worked examples (Stevens, Ashworth, Raz, both Austin footnotes, the
  Working Time Directive), §2.1.7's footnote 101, and §1.7's Hart and Honoré
  bibliography all reproduce line for line.
- The OSCOLA PDF was read directly — extracted from the file, not from memory —
  after two recalled "official examples" turned out not to exist.
