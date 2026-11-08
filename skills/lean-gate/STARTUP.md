# Startup: the mandatory setup at the start of a project

Run this at the start of every new project and every adoption, before any build. It is mandatory: no plan, no code and no site change until the setup answers are recorded in the plan. Ask in cards (AskUserQuestion, up to 4 per call, several calls for longer sets). Each card has a recommended option first, so the user can answer with one click. Skip a card only when the answer is already known from the code, the docs or the server, and say so.

Record every answer as a D# row in `docs/PLAN.md` the moment it is given. Keep the cards short; put the reasoning in the option descriptions.

## Adopting an existing project: read first, then pre-fill

For a project that already exists, do the read-only discovery in `NEW-PROJECT.md` ("Adopting a project", step 1) before the first card. Then:

- **Pre-fill, do not ask blank.** When the evidence answers a card, make that answer the recommended option and say where it came from ("Found: Bricks 2.4.4 on the live host. Confirm?"). Ask blank only when nothing shows the answer.
- **Never overwrite.** Existing index, state file, docs and decision records are kept. Only missing pieces are added, and replaced text moves verbatim to an archive file.
- **Evidence sources, read-only:** the index and state file, the git log (a range), the code map, the server (read-only checks), the plugin or theme headers, the live product or site pages.

## Round 1, every project (always)

1. **Project type:** website (live or building), WordPress plugin, web app, other.
2. **Starting point:** new project, or adopting one that exists (then read first, per `NEW-PROJECT.md` "Adopting a project").
3. **Who it is for:** your clients, the public (WordPress.org or similar), internal only.
4. **What done means for the first release:** one core job, a fixed feature list, or verified in the real target environment.

## Round 2, websites (live or building)

5. **Live server:** which host serves the public site. Check public DNS and the origin. A CDN in front means the origin is the host to work on; confirm with the owner.
6. **Staging:** exists or not, and is it empty or in use. Who may use it.
7. **Test area:** drafts or private pages on live, or staging.
8. **Approval:** a yes in chat per change, or per batch.
9. **Backups:** database dump only for plugin changes or anything that could break the site; full file copies before code changes. Where they are kept, and that they hold client data.
10. **Acceptance per change:** desktop and phone check, error-log check, others the owner names. The security audit runs at release, on the review-scope list.
11. **Change channel:** site abilities or MCP first; SSH file edits only when the builder cannot express the change; no direct database edits.
12. **CDN cache:** which provider, and purge scope asked per change.
13. **Languages:** source language, the translation setup, and whether translations run automatically.
14. **Copy:** whose voice (the owner's or the site's), where the voice notes live, and whether copy must be fact-checked against product pages (it must; see `SITE-COPY.md`).
15. **Styling:** which system leads (builder classes, a CSS framework, a design token system) and what replaces what.

## Round 3, WordPress plugins

16. **Distribution:** WordPress.org, a private zip, or a paid add-on. This sets the review rules.
17. **Compatibility:** minimum WordPress, PHP and WooCommerce versions.
18. **Security and review:** run `WORDPRESS.md` checks; run the release review that `lean-gate review-scope` asks for (rules in SKILL.md "Review scope").
19. **Release:** version scheme, changelog location, tag and release process.

## Round 4, anything else

20. **Constraints:** deadline, budget, must and never rules, who else works on it.
21. **Tools:** which MCP servers and skills this project needs. Park the rest (`skills-off`), and say so in the project index.

## After the cards

- Write the answers into `docs/PLAN.md` as D# rows (status `decided` or `open`).
- Write `docs/STACK.md` from read-only checks, for websites and plugins that have a running site.
- Write `CLAUDE.md` (index) and `docs/HANDOFF.md`.
- Write `.lean-project-setup` at the project root: a date, and "new" or "adopted". The session-start hook reads it, and reminds the next session until it exists.
- Show the user a one-table summary of the decisions and any `open` items. Ask only for the open ones.
