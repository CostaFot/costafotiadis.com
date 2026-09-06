// The board: Costa's Linear team as three columns (todo, in progress, done).
// Plain ESM with no imports, because three things share it and must agree on
// the query, the fields that may leave the server and the order of the cards:
//   - the Astro build (src/lib/board.ts), which renders the no-JS snapshot on
//     /board/ and /board.md;
//   - server.js, which answers /board.json from Linear with a short cache;
//   - the script on /board/, which re-renders the columns from /board.json.
// scripts/things/capture.js also uses createIssue() so a /things idea opens
// a backlog issue.
//
// Columns come from the workflow state's `type` (backlog, unstarted, started,
// completed, canceled, triage), never its name: Costa can rename states in
// Linear and the page keeps working. Canceled and triage never show.
//
// The API key never comes through here; every caller passes it in.

// Guarded reads: this file is also bundled for the browser, where `process`
// does not exist.
const env = (k) => (typeof process !== 'undefined' && process.env?.[k]) || '';
// LINEAR_API points a local build or server at a mock (a few lines of node
// answering POST with { data: { issues: … } }); production uses the real one.
export const LINEAR_API = env('LINEAR_API') || 'https://api.linear.app/graphql';
// The team key (the `COS` in `COS-12`). LINEAR_TEAM_ID is what the linear CLI
// reads too, so one override covers both.
export const TEAM_KEY = env('LINEAR_TEAM_ID') || 'COS';
// Done issues fall off the board after this many days.
export const DONE_DAYS = 30;
// Linear's priority numbers, index = value. 0 is "no priority".
export const PRIORITY = ['none', 'urgent', 'high', 'medium', 'low'];
export const COLUMNS = { todo: 'todo', doing: 'in progress', done: 'done' };

// Everything the site shows about an issue, and nothing else: no description,
// no comments, no assignee, no attachments. The board is public.
export const BOARD_QUERY = `
query Board($team: String!, $since: DateTimeOrDuration!, $after: String) {
  issues(
    first: 100, after: $after, orderBy: updatedAt,
    filter: {
      team: { key: { eq: $team } },
      state: { type: { nin: ["canceled", "triage"] } },
      or: [{ completedAt: { null: true } }, { completedAt: { gte: $since } }]
    }
  ) {
    nodes {
      identifier title url priority createdAt updatedAt completedAt
      state { name type }
      labels { nodes { name } }
      project { name }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

const TEAM_QUERY = `
query TeamId($key: String!) { teams(filter: { key: { eq: $key } }) { nodes { id } } }`;

const CREATE_MUTATION = `
mutation CreateIssue($input: IssueCreateInput!) {
  issueCreate(input: $input) { success issue { identifier url } }
}`;

export function boardVariables(team = TEAM_KEY, days = DONE_DAYS, now = Date.now()) {
  return { team, since: new Date(now - days * 864e5).toISOString() };
}

/** @typedef {{ id: string, title: string, url: string, priority: number, state: { name: string, type: string }, labels: string[], project: string | null, createdAt: string, updatedAt: string, completedAt: string | null }} Issue */
/** @typedef {{ team: string, fetchedAt: string, since: string, issues: Issue[] }} Board */

// The whitelist: the only place a raw Linear node turns into what the site holds.
/** @returns {Issue} */
export function publicIssue(node) {
  return {
    id: node.identifier,
    title: node.title,
    url: node.url,
    priority: node.priority ?? 0,
    state: { name: node.state?.name ?? '', type: node.state?.type ?? '' },
    labels: (node.labels?.nodes ?? []).map((l) => l.name),
    project: node.project?.name ?? null,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    completedAt: node.completedAt ?? null,
  };
}

// One GraphQL call. Personal API keys go in `Authorization` bare, no `Bearer`.
export async function graphql({ apiKey, query, variables, signal, fetch: f = globalThis.fetch }) {
  if (!apiKey) throw new Error('no API key');
  const res = await f(LINEAR_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: apiKey },
    body: JSON.stringify({ query, variables }),
    signal,
  });
  if (!res.ok) throw new Error(`Linear HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(`Linear: ${json.errors.map((e) => e.message).join('; ')}`);
  return json.data;
}

// The whole board, paginated. Five pages of a hundred is far more than 250
// active issues (the free plan's cap) plus a month of done ones; the cap
// keeps a runaway workspace from burning the rate limit.
/** @returns {Promise<Board>} */
export async function fetchBoard({ apiKey, team = TEAM_KEY, days = DONE_DAYS, signal, fetch: f } = {}) {
  const vars = boardVariables(team, days);
  const issues = [];
  let after = null;
  for (let page = 0; page < 5; page++) {
    const data = await graphql({ apiKey, query: BOARD_QUERY, variables: { ...vars, after }, signal, fetch: f });
    for (const node of data.issues.nodes) issues.push(publicIssue(node));
    if (!data.issues.pageInfo.hasNextPage) break;
    after = data.issues.pageInfo.endCursor;
  }
  return { team, fetchedAt: new Date().toISOString(), since: vars.since, issues };
}

const LABELS_QUERY = `
query LabelIds($names: [String!]!) { issueLabels(filter: { name: { in: $names } }) { nodes { id name } } }`;

// Opens a backlog issue on the team; returns its identifier and URL.
// `labels` are label names (unknown ones are skipped); `createdAt` backdates
// the issue, which Linear allows for API-created issues.
export async function createIssue({ apiKey, team = TEAM_KEY, title, description, labels = [], createdAt, signal, fetch: f } = {}) {
  if (!title?.trim()) throw new Error('an issue needs a title');
  const teams = await graphql({ apiKey, query: TEAM_QUERY, variables: { key: team }, signal, fetch: f });
  const teamId = teams.teams.nodes[0]?.id;
  if (!teamId) throw new Error(`no Linear team with key ${team}`);
  let labelIds;
  if (labels.length) {
    const found = await graphql({ apiKey, query: LABELS_QUERY, variables: { names: labels }, signal, fetch: f });
    labelIds = found.issueLabels.nodes.map((l) => l.id);
  }
  const data = await graphql({
    apiKey, query: CREATE_MUTATION, signal, fetch: f,
    variables: { input: { teamId, title: title.trim(), ...(description ? { description } : {}), ...(labelIds?.length ? { labelIds } : {}), ...(createdAt ? { createdAt } : {}) } },
  });
  const issue = data.issueCreate?.issue;
  if (!data.issueCreate?.success || !issue) throw new Error('issueCreate did not succeed');
  return { id: issue.identifier, url: issue.url };
}

/** @returns {'todo' | 'doing' | 'done' | null} */
export function columnOf(stateType) {
  if (stateType === 'backlog' || stateType === 'unstarted') return 'todo';
  if (stateType === 'started') return 'doing';
  if (stateType === 'completed') return 'done';
  return null;
}

const prio = (p) => (p === 0 ? PRIORITY.length : p);
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// The three lists in the order the page shows them: in progress by most
// recently touched, todo by priority then oldest first (the backlog is a
// queue), done by most recently finished.
/** @param {Issue[]} issues @returns {{ todo: Issue[], doing: Issue[], done: Issue[] }} */
export function columns(issues) {
  const out = { todo: [], doing: [], done: [] };
  for (const i of issues) {
    const col = columnOf(i.state.type);
    if (col) out[col].push(i);
  }
  out.doing.sort((a, b) => cmp(b.updatedAt, a.updatedAt));
  out.todo.sort((a, b) => prio(a.priority) - prio(b.priority) || cmp(a.createdAt, b.createdAt));
  out.done.sort((a, b) => cmp(b.completedAt ?? '', a.completedAt ?? ''));
  return out;
}

// The time an issue was last touched, as shown on its card: updatedAt for
// what is open, completedAt for what is done.
/** @param {Issue} i */
export const touchedAt = (i) => (i.state.type === 'completed' && i.completedAt) || i.updatedAt;

// "now", "5m", "3h", "2d", "4w", "3mo": short enough for a card's meta line.
export function relTime(iso, now = Date.now()) {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 60) return 'now';
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)}m`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h`;
  const d = h / 24;
  if (d < 14) return `${Math.floor(d)}d`;
  if (d < 60) return `${Math.floor(d / 7)}w`;
  return `${Math.floor(d / 30)}mo`;
}
