// Linear, for the things feed: scripts/things/capture.js calls createIssue()
// so a /things idea opens a backlog issue on Costa's team, and
// scripts/things/board-import.mjs did the same for the ideas that predate it.
// Plain ESM with no imports. The public board page that used to read the
// team through here (/board/, /board.md, the /board.json proxy) was removed
// on 2026-09-16; nothing on the site reads Linear any more.
//
// The API key never comes through here; every caller passes it in.

const env = (k) => (typeof process !== 'undefined' && process.env?.[k]) || '';
// LINEAR_API points a script at a mock (scripts/linear-mock.mjs); production
// uses the real one.
export const LINEAR_API = env('LINEAR_API') || 'https://api.linear.app/graphql';
// The team key (the `COS` in `COS-12`). LINEAR_TEAM_ID is what the linear CLI
// reads too, so one override covers both.
export const TEAM_KEY = env('LINEAR_TEAM_ID') || 'COS';

const TEAM_QUERY = `
query TeamId($key: String!) { teams(filter: { key: { eq: $key } }) { nodes { id } } }`;

const LABELS_QUERY = `
query LabelIds($names: [String!]!) { issueLabels(filter: { name: { in: $names } }) { nodes { id name } } }`;

const CREATE_MUTATION = `
mutation CreateIssue($input: IssueCreateInput!) {
  issueCreate(input: $input) { success issue { identifier url } }
}`;

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
