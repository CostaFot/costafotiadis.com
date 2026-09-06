---
name: board
description: Read and move Costa's work board (www.costafotiadis.com/board/, backed by Linear) from the command line. Use when Costa says /board, asks what is on the board, what is in progress or done, wants an idea or task added, picked up, finished or commented on, or when an agent starts or finishes a piece of work that should show on the board. Triggers - board, linear, backlog, todo, in progress, "what am I working on", pick up, close the issue.
---

# board

Costa's Linear team, rendered publicly at https://www.costafotiadis.com/board/
and moved from a terminal. The site reads it; the CLI writes it. Read the
"Board" section of `AGENTS.md` in the repo for how the page works.

| | |
|---|---|
| Workspace | https://linear.app/costafotiadis |
| Team | key `COS` (issues are `COS-12`); `.linear.toml` in the repo root says so for the CLI |
| Read without a key | https://www.costafotiadis.com/board.md (as of the last deploy) or `curl -s https://www.costafotiadis.com/board.json` (live, a minute fresh) |
| Read/write | `linear` (`@schpet/linear-cli` 2.6.0, installed with mise) with `LINEAR_API_KEY` in the environment: `set -a; . /home/costa/Work/blog/.env; set +a` first, the key lives there |
| Columns | by the state's *type*: todo = backlog + unstarted, in progress = started, done = completed (30 days). Canceled never shows |
| Labels | one area label per issue: `blog`, `cmdpal`, `lab`, `omarchy`, `android`, `things`, `infra`. No new labels without asking |

**Everything on the team is public.** Titles, labels, project names and
comments are written as public text: no keys, no client or employer names, no
private URLs. Anything private does not go on this team.

The commands below were checked against `--help` of 2.6.0 on 2026-09-06.
`-s/--state` takes a state *type* (`backlog`, `unstarted`, `started`,
`completed`, `canceled`) or a state name.

## Read

```sh
linear issue query --json                 # every issue on the team, all states
linear issue query -s started --json      # one state type
linear issue view COS-12 --json           # one issue with its description
curl -s https://www.costafotiadis.com/board.md   # no key needed, from anywhere
```

`linear issue mine` (alias `list`) is only Costa's own, unstarted by default,
and has no `--json`; use `query` from an agent.

## Create

One issue per idea, never two for the same thing. `/things idea …` already
opens one (the entry carries `issue: { id, url }`); do not open a second.

```sh
linear issue create --no-interactive -t "<title in plain words>" -l blog \
  -d "<what and why, a link to the things entry or post>"
```

Titles are what Costa would say, not ticket-speak. Priority stays unset
unless he sets one (`-p 1` urgent … `-p 4` low).

## Pick up and finish

Move the state; do not use `linear issue start`, which also checks out a git
branch named after the issue, wrong in a repo that deploys from `main`.

```sh
linear issue update COS-12 -s started      # pick up
linear issue update COS-12 -s completed    # finish
linear issue update COS-12 -s canceled     # drop (never delete)
```

Finishing an issue gets a closing comment with what shipped: the commit sha,
the URL, or the one line of why it was dropped.

## Comment

```sh
linear issue comment add COS-12 -b "claude: <what changed or what was found>"
```

First word is the agent (`claude`, `codex`, `opencode`, `pi`) so the trail
shows who did what. Short and factual; the issue is not a log.

## Rules

- Never `linear issue delete`. Cancel.
- Never move an issue another agent has in progress; comment on it instead.
- One area label per issue (`-l` on create replaces nothing; on update `-l`
  replaces the whole set, `--add-label` adds); no new labels, states or
  projects without asking.
- The board is public. Write accordingly.
- `LINEAR_API_KEY` is never pasted into a chat, a commit or a comment.
