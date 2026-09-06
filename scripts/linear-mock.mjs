// A stand-in for api.linear.app so the board can be checked without a key:
//   node scripts/linear-mock.mjs &
//   LINEAR_API=http://localhost:4568 LINEAR_API_KEY=test-key npm run build
//   LINEAR_API=http://localhost:4568 LINEAR_API_KEY=test-key npm start
//   LINEAR_API=http://localhost:4568 LINEAR_API_KEY=test-key node scripts/things/capture.js --type idea --text "test"
// Answers the three operations in src/lib/linear.mjs (the board query, the
// team lookup, issueCreate) with made-up issues; any other key is rejected
// the way Linear rejects one, so the offline paths can be seen too.
import http from 'node:http';

const PORT = Number(process.env.PORT) || 4568;
const now = Date.now();
const iso = (hoursAgo) => new Date(now - hoursAgo * 3600e3).toISOString();
const issue = (n, title, state, type, extra = {}) => ({
  identifier: `COS-${n}`, title, url: `https://linear.app/costafot/issue/COS-${n}`, priority: 0,
  createdAt: iso(200 - n), updatedAt: iso(n), completedAt: null,
  state: { name: state, type }, labels: { nodes: [] }, project: null, ...extra,
});
const nodes = [
  issue(1, 'Linear board page', 'In Progress', 'started', { labels: { nodes: [{ name: 'blog' }] }, priority: 2 }),
  issue(2, 'Comments or a guestbook on the site', 'Backlog', 'backlog', { labels: { nodes: [{ name: 'blog' }] } }),
  issue(3, 'AI detection for the things feed', 'Todo', 'unstarted', { priority: 1, project: { name: 'Site' } }),
  issue(4, 'Fold the lab in', 'Done', 'completed', { completedAt: iso(30) }),
  issue(5, 'A cancelled thing (never shown)', 'Canceled', 'canceled'),
  issue(6, 'Black hole experiment', 'Done', 'completed', { completedAt: iso(60), labels: { nodes: [{ name: 'lab' }] } }),
  issue(7, 'Winget update manager for CmdPal', 'Backlog', 'backlog', { labels: { nodes: [{ name: 'cmdpal' }] }, priority: 3 }),
];
let created = 100;

http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const { query = '', variables = {} } = body ? JSON.parse(body) : {};
    console.log(new Date().toISOString(), query.trim().split('\n')[0] || req.method);
    res.setHeader('content-type', 'application/json');
    if (req.headers.authorization !== 'test-key') return res.end(JSON.stringify({ errors: [{ message: 'Authentication required' }] }));
    if (/query TeamId/.test(query)) return res.end(JSON.stringify({ data: { teams: { nodes: variables.key === 'COS' ? [{ id: 'team-uuid' }] : [] } } }));
    if (/mutation CreateIssue/.test(query)) {
      const n = ++created;
      return res.end(JSON.stringify({ data: { issueCreate: { success: true, issue: { identifier: `COS-${n}`, url: `https://linear.app/costafot/issue/COS-${n}` } } } }));
    }
    res.end(JSON.stringify({ data: { issues: { nodes, pageInfo: { hasNextPage: false, endCursor: null } } } }));
  });
}).listen(PORT, () => console.log(`mock Linear on http://localhost:${PORT} (key: test-key)`));
