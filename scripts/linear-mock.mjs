// A stand-in for api.linear.app so a /things idea can be captured without a
// real key:
//   node scripts/linear-mock.mjs &
//   LINEAR_API=http://localhost:4568 LINEAR_API_KEY=test-key node scripts/things/capture.js --type idea --text "test"
// Answers the operations in src/lib/linear.mjs (the team lookup, the label
// lookup, issueCreate); any other key is rejected the way Linear rejects one,
// so the no-issue path can be seen too.
import http from 'node:http';

const PORT = Number(process.env.PORT) || 4568;
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
    if (/query LabelIds/.test(query)) return res.end(JSON.stringify({ data: { issueLabels: { nodes: (variables.names || []).map((name, i) => ({ id: `label-${i}`, name })) } } }));
    if (/mutation CreateIssue/.test(query)) {
      const n = ++created;
      return res.end(JSON.stringify({ data: { issueCreate: { success: true, issue: { identifier: `COS-${n}`, url: `https://linear.app/costafot/issue/COS-${n}` } } } }));
    }
    res.end(JSON.stringify({ errors: [{ message: `mock: unknown operation` }] }));
  });
}).listen(PORT, () => console.log(`mock Linear on http://localhost:${PORT} (key: test-key)`));
