---
name: board
description: Read and move Costa's work board (Linear, team COS) from the command line. Use when Costa says /board, asks what is on the board, what is in progress or done, wants an idea or task added, picked up, finished or commented on, or when an agent starts or finishes a piece of work that should show on the board. Triggers - board, linear, backlog, todo, in progress, "what am I working on", pick up, close the issue.
---

# board

Costa's Linear team, read and moved from a terminal. It was rendered
publicly at www.costafotiadis.com/board/ from 2026-09-06 to 2026-09-16; the
site no longer shows it, so the CLI (or the Linear MCP) is the only way in.
Read the "Board" section of `AGENTS.md` in the repo for the conventions.

| | |
|---|---|
| Workspace | https://linear.app/costafotiadis |
| Team | key `COS` (issues are `COS-12`); `.linear.toml` in the repo root says so for the CLI |
| Read/write | `linear` (`@schpet/linear-cli` 2.6.0, installed with mise) with `LINEAR_API_KEY` in the environment: `set -a; . /home/costa/Work/blog/.env; set +a` first, the key lives there |
| States | by *type*, as in Linear: backlog, todo (= unstarted), in progress (= started), done (= completed), canceled |
| Labels | one area label per issue: `blog`, `cmdpal`, `lab`, `omarchy`, `android`, `things`, `infra`. No new labels without asking |
| Projects | one per repo or product, named after it. `linear project list` is the live list — read it, do not trust a list written down here or anywhere else, it goes stale every time a repo gets one (it did: three were missing until 2026-09-13). The repo's `AGENTS.md`/`CLAUDE.md` names its project. Ideas with no repo yet have none. No new projects without asking |

**Write everything on the team as public text**: no keys, no client or
employer names, no private URLs. The board was public until 2026-09-16 and
may be again; anything private does not go on this team.

The commands below were checked against `--help` of 2.6.0 on 2026-09-06.
`-s/--state` takes a state *type* (`backlog`, `unstarted`, `started`,
`completed`, `canceled`) or a state name.

## Read

```sh
linear issue query --json                 # every issue on the team, all states
linear issue query -s started --json      # one state type
linear issue view COS-12 --json           # one issue with its description
linear project list                       # the projects, before setting --project on anything
```

`linear issue mine` (alias `list`) is only Costa's own, unstarted by default,
and has no `--json`; use `query` from an agent.

## Create

One issue per idea, never two for the same thing. `/things idea …` already
opens one (the entry carries `issue: { id, url }`); do not open a second.

```sh
linear issue create --no-interactive -t "<title in plain words>" -l blog \
  --project "costafotiadis.com" \
  -d "<what and why, a link to the things entry or post>"
```

`--project` takes the name. Set it when the work belongs to a repo; leave it
off for an idea with no home yet. `linear issue update COS-12 --project <name>`
adds it later.

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

## Follow-ups

Work that leaves something for later gets its own issue, opened before the
session ends: a check that waits on an external event (a DNS transfer, a
review, a release), a fix that was deferred, a TODO written into code or
docs, anything told to Costa as "worth doing later". One issue per
follow-up, with the area label and the repo's project, and the closing
message names it (`opened COS-38 for the post-transfer checks`). A note
in `AGENTS.md` or a code comment is not a substitute; the board is where
Costa looks. Do not open one for work finished in the same session.

```sh
linear issue create --no-interactive -t "Check the apex after the transfer" \
  -l infra --project "costafotiadis.com" --due-date 2026-09-19 \
  -d "<what to check, and why it waits>

Ready when: dig +short apex.example.com returns the new A record."
```

The due date and the `Ready when:` line go on at create, not afterwards. Both
are part of the issue, not decoration on it: without them the follow-up is a
note nobody reads again. `--due-date` works on `create` as well as `update`.

### When it becomes actionable

A follow-up that waits on something gets a due date, so the morning briefing
can find it (COS-190). Without one it sits in the backlog and only surfaces on
the days Costa happens to look. `update` is for a date that has moved or one
that should have been set at create:

```sh
linear issue update COS-184 --due-date 2026-09-19
```

Most follow-ups are not really waiting on a date, though. The date stands in
for a condition — "a week of samples" became 19 Sept — and the two come apart
the moment the machine is off for a few days, always in the same direction:
the date arrives and the condition is further away than before. So when there
is a condition, write it as a `Ready when:` line in the description.

The briefing has to settle that line every morning, so write it to be run, not
to be read: name the file, command or number, and keep it to one check with an
obvious answer.

```
Ready when: ~/.local/state/vitals/samples.csv has 7 days of rows.
Ready when: `date -d "$(uptime -s)" +%s` is greater than 1789319161.
```

"The machine has been rebooted since 13 Sept" is the same condition as the
second line and no use at all: true, unambiguous to a human, and nothing to
run. Prose like that puts the guessing back on the briefing, which is where it
was before the line existed.

The due date is then only the floor, the earliest day worth looking. The
briefing checks the condition itself and stays quiet until it holds. With no
condition, the date alone is the trigger.

Nothing is lost when the machine is off at the due moment: the next briefing
sees an overdue issue and says so. Late is fine, silent is not.

The briefing reads due dates with one GraphQL query, because both
`linear issue query --json` and `linear issue view --json` omit `dueDate` —
the CLI can write one but not read it back:

```sh
curl -s https://api.linear.app/graphql -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ issues(filter:{team:{key:{eq:\"COS\"}}, dueDate:{null:false}}, first:50){ nodes{ identifier title dueDate state{name} } } }"}'
```

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
  replaces the whole set, `--add-label` adds) and the repo's project when
  there is one; no new labels, states or projects without asking.
- Follow-ups become issues before the session ends, with a due date when
  they wait on something and a `Ready when:` line when they wait on a
  condition (see Follow-ups).
- The board is the only list. No plan files, `IDEAS.md`, roadmaps or TODO
  sections on disk (Costa, 2026-09-06): a plan goes in the issue's
  description, a roadmap is issues in a project, an idea is an issue.
- Write as if the board were public (it was, and may be again).
- `LINEAR_API_KEY` is never pasted into a chat, a commit or a comment.
