# Things to check yourself

Everything Thetis does is covered by tests, but some things cannot be verified
from this machine — no Word, no LibreOffice, no browser I can drive, and no
access to Cite Them Right, which is paywalled. This is the list.

Roughly in order of how much damage a wrong answer would do. Item 1 is answered
and kept for the record, because what it settled redirected the roadmap.

---

## 1. Does the Word file actually work? — **the decisive answer is yes**

**Confirmed on 23 August 2026.** Selecting a footnote marker in the exported
`.docx`, copying it, and pasting into your own document carries the footnote
across and renumbers it. It copies smoothly.

That was the whole justification for exporting real Word footnotes rather than a
plain list, and the whole question hanging over the Office add-in. The export is
a real workflow, not a stopgap, so the add-in has been demoted in `ROADMAP.md`
from the plan's centrepiece to a convenience for later.

- [x] Word opens it, and footnote markers copy into your own essay **and
      renumber** — the two that mattered

**Still worth an eye, but no longer urgent.** These were not separately reported,
and none of them can break the workflow above — they are presentation:

- [ ] No repair prompt on opening (opening plainly worked, but a prompt you
      clicked through would still be worth fixing)
- [ ] Case names and book titles are *italic* in the footnotes
- [ ] The case name is **not** italic in the Table of cases (1.6.2)
- [ ] The lists have a hanging indent and keep their italics

A five-minute recipe with a known-correct expected output is in the session
notes; the short version is two sources — `Corr v IBC Vehicles Ltd` and Burrows,
*Remedies for Torts and Breach of Contract* — cited in the order 1, 1, 2, 1 so
that footnote 2 is an `ibid` and footnote 4 a `Corr (n 1)` cross-citation.

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

## 3. Cite Them Right — the judgement calls and the blank templates

CTR is paywalled. I worked from the OU Library's own public guidance, which is
arguably the better authority for OU students but does not cover everything.
If you have CTR access, these are the gaps.

3a–3d are calls where the guide says two things or says nothing. 3e is a
different problem: five templates the guide names but never works through.

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

### 3e. Five templates the OU guide names but never shows

These are different in kind from 3a–3d. The OU guide *names* each of these
slots, but prints no worked example, so the exact form — capitalisation,
abbreviation, punctuation, position — is not fixed by anything I can read.
Rather than guess, Thetis does not model them at all, and the README records
each as a gap. Every one is a source a law student can actually hit.

- [ ] **Book volumes.** The book template ends "Series and volume number if
      relevant." No example shows whether that is `Vol. 2.`, `vol. 2`, or
      something else. A volume currently appears in an OSCOLA footnote and not
      in a Harvard reference.
- [ ] **`doi:`** The journal template allows `doi: 10.1080/02619761003602246`
      as an optional tail. Not modelled.
- [ ] **Case notes.** The OU guides have no case-note template at all. In
      Harvard, Thetis renders an untitled case note's case name where the
      article title goes — the same substitution OSCOLA §3.3.2 makes — and does
      **not** add `(note)`, because that is an OSCOLA marker and no CTR
      equivalent has been seen.
- [ ] **Forum messages** and **newspaper articles.** Templated, no example.
- [ ] **Secondary referencing** — `Fernandez (2015, quoted in Nabokov, 2017)`.
      Templated, no example of the reference-list half.

If your module materials show any of these worked through, that settles it and
each becomes a small piece of work. This is the main thing blocking the Harvard
half, so it is worth more than a guess from the public pages.

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
- [ ] **`(note)` and `(forthcoming)` sit before a web address.** §3.3.2 puts
      `(note)` "at the end of the citation" and §3.3.4 describes the address as
      *following* the citation, so Thetis takes the citation to end first:
      `… EJLT (note) <http://…> accessed 27 July 2010`. No example combines
      them.
- [ ] **A titled case note gets no automatic `(note)`.** §3.3.2 says to treat
      one "as if it were a journal article", and prints `(note)` only in the
      untitled example. The Case note switch still adds it if you want it.
- [ ] **No plural is inferred for a book's paragraphs.** §3.2.1 prints
      `para 76`, and the guide's looseleaf `para 8–106` is one paragraph's
      number rather than a range — so a dash proves nothing about plurals.
      Type `paras 76, 78` yourself and Thetis will respect it.
- [ ] **A bare, unbracketed journal year is not modelled.** §3.3.4's Boyle
      example prints `2004 Duke L & Tech Rev 0009` with no brackets at all,
      following that journal's own citation advice rather than a rule. Thetis
      gives it §3.3.1's square brackets, `[2004]`. If a journal's own guidance
      says otherwise, follow the journal.
- [ ] **A pinpoint sits before an `affd` clause, not after it.** §2.1.8 says
      `affd` and `revd` "refer to the decision in the primary citation", so
      Thetis attaches the pinpoint to that primary citation:
      `… [2006] EMLR 23 [12], affd [2007] EWCA Civ 721`. No example in the guide
      shows a pinpoint and a subsequent history together, and there is no way
      yet to pinpoint the *later* decision.
- [ ] **How noisy the two new checks are in real use.** The no-full-stop rule
      (§4.2.1) and the court-code table (§4.1) both warn rather than block, and
      neither rewrites what you typed. §4.1 is the **2012** list, so a court
      created since — `EWFC`, later Upper Tribunal chambers — will warn
      correctly-but-unhelpfully. If that gets annoying in practice, say so: a
      warning students learn to ignore is worse than no warning, and that
      judgement decides whether the report-series list is worth extracting at
      all.
- [ ] **A CPR pinpoint written `r 5.2` warns rather than being corrected.**
      §2.5.3 says to omit `r` and `rr` for the CPR, but Thetis never silently
      rewrites what you typed. The warning is stated for the CPR only; the RSC
      and CCR keep theirs, as `RSC Ord 24, r 14A` shows.

---

## 6. Small things

- [ ] **The mark at 16px, in a dark tab strip.** The mark is now `balance` from
      Google Material Symbols (Apache 2.0, attributed in the README). You have
      seen it in the masthead and approved it; what is still unchecked is the
      browser tab at 16px, and whether the dark-mode colour `#e0a08d` is legible
      if your tab strip is dark. There is no SVG rasteriser on this machine, so
      I cannot see it at all.
- [ ] **LAN access.** `http://harmony.local:5173/` and
      `http://192.168.0.63:5173/` both answer to `curl`, but I have not loaded
      them in a browser from another machine.
- [ ] **The tests take about two minutes**, nearly all of it the DOM tests
      typing character by character. `npx vitest run src/oscola src/harvard
      src/document` runs just the engines in about two seconds if you want a
      fast loop.
- [ ] **A full run can flake on this Pi.** Once, two `src/App.test.tsx` tests
      failed in a full run and passed 61/61 when that file ran alone; a second
      full run was green. It is load, not a regression — the DOM tests are slow
      enough here to brush against their timeout when everything runs at once.
      If you see it, re-run the file alone before believing it.

---

## 7. The repository and the GitHub account

Not about citations, but raised and still open. I have no access to your
account settings, so none of this can be checked from here.

- [ ] **Is `sonap.sav@gmail.com` verified on your GitHub account?** Commits are
      authored with it. If it is not on the account, they will not link to your
      profile or count toward your contribution graph — https://github.com/settings/emails
      fixes it retroactively.
- [ ] **Repository visibility.** `SonapSav/Thetis` may be public or private; I
      did not check and it is worth being deliberate. Nothing sensitive is in it
      — no keys, no backend, and `.gitignore` covers `node_modules` and `dist`.
- [ ] **The SSH key.** `~/.ssh/id_ed25519` on this Pi, fingerprint
      `SHA256:TWfPo99XDG4sFT4JZ9cm07zH+gaNWxEwkBnG7L1YDSQ`, no passphrase so
      pushes run unattended. Add one with `ssh-keygen -p -f ~/.ssh/id_ed25519`
      if this machine is shared.
- [ ] **A local tag `pre-amend-backup`** still points at the pre-rewrite version
      of the licence commit. It was never pushed. Delete it with
      `git tag -d pre-amend-backup` once you are happy the history is right.

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
  after two recalled "official examples" turned out not to exist. Every section
  added since — §2.5 (SIs, SR & O, rules of court), §3.3.2–3.3.4 (case notes,
  forthcoming and online articles) and §3.2.1 (book volumes and paragraphs) —
  was read the same way, and each of the guide's worked examples for them is
  asserted verbatim in a test.
- **Online articles carry no web address in Harvard**, and that is correct, not
  an omission. The OU's journal template says in terms: "Reference online
  articles the same way as print articles." Checked rather than assumed, so it
  needs none of your time.
- **The `balance` icon's licence.** Material Symbols is Apache 2.0, confirmed
  from the repository's own `LICENSE`. Upstream ships no `NOTICE` file, and
  Google's wording is "We'd love attribution in your app's *about* screen, but
  it's not required". Attribution is given in the README regardless, because the
  icon is redistributed here.
