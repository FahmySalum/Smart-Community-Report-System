import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createDatabase, createRepository, dbPath, rootDir, verifyPassword } from './database.js';

const port = Number(process.env.PORT || 3000);
const shouldReset = process.argv.includes('--reset-db');
const db = createDatabase({ reset: shouldReset });
const repository = createRepository(db);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS'
  });
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function readBody(req, limit = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('Request body is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function splitBuffer(buffer, delimiter) {
  const parts = [];
  let start = 0;
  let index;
  while ((index = buffer.indexOf(delimiter, start)) !== -1) {
    parts.push(buffer.subarray(start, index));
    start = index + delimiter.length;
  }
  parts.push(buffer.subarray(start));
  return parts;
}

function trimMultipartChunk(chunk) {
  let result = chunk;
  if (result.subarray(0, 2).toString() === '\r\n') result = result.subarray(2);
  if (result.subarray(0, 2).toString() === '--') return null;
  if (result.subarray(-2).toString() === '\r\n') result = result.subarray(0, -2);
  return result;
}

function parseMultipart(buffer, contentType) {
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.[1] || contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.[2];
  if (!boundary) throw new Error('Missing multipart boundary.');

  const fields = {};
  const files = [];
  const delimiter = Buffer.from(`--${boundary}`);

  for (const rawPart of splitBuffer(buffer, delimiter)) {
    const part = trimMultipartChunk(rawPart);
    if (!part?.length) continue;

    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) continue;

    const headerText = part.subarray(0, headerEnd).toString('utf8');
    const body = part.subarray(headerEnd + 4);
    const disposition = headerText.match(/content-disposition:\s*form-data;([^\r\n]+)/i)?.[1] || '';
    const name = disposition.match(/name="([^"]+)"/)?.[1];
    const filename = disposition.match(/filename="([^"]*)"/)?.[1];
    const mimeType = headerText.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim();

    if (!name) continue;
    if (filename) {
      files.push({ field: name, filename, mimeType, content: body });
    } else {
      fields[name] = body.toString('utf8');
    }
  }

  return { fields, files };
}

async function parseRequestData(req) {
  const contentType = req.headers['content-type'] || '';
  const body = await readBody(req);

  if (contentType.includes('multipart/form-data')) {
    return parseMultipart(body, contentType);
  }

  if (contentType.includes('application/json')) {
    return { fields: JSON.parse(body.toString('utf8') || '{}'), files: [] };
  }

  return { fields: {}, files: [] };
}

function sanitizeIssueInput(fields) {
  const required = ['title', 'description', 'category', 'priority', 'location'];
  for (const key of required) {
    if (!String(fields[key] || '').trim()) {
      throw new Error(`${key} is required.`);
    }
  }

  return {
    title: String(fields.title).trim(),
    description: String(fields.description).trim(),
    category: String(fields.category).trim(),
    priority: String(fields.priority).trim(),
    location: String(fields.location).trim(),
    latitude: fields.latitude,
    longitude: fields.longitude,
    reportedById: fields.reportedById || null,
    reportedByName: fields.reportedByName || 'Guest Reporter'
  };
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    joinedAt: user.created_at || user.joinedAt,
    issuesReported: user.issues_reported || user.issuesReported || 0
  };
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, database: dbPath });
  }

  if (req.method === 'GET' && url.pathname === '/api/labels') {
    return sendJson(res, 200, repository.labels);
  }

  if (req.method === 'GET' && url.pathname === '/api/issues') {
    return sendJson(res, 200, {
      issues: repository.listIssues({
        search: url.searchParams.get('search') || '',
        category: url.searchParams.get('category') || '',
        status: url.searchParams.get('status') || '',
        priority: url.searchParams.get('priority') || ''
      })
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/issues') {
    const { fields, files } = await parseRequestData(req);
    const issue = repository.createIssue({
      ...sanitizeIssueInput(fields),
      attachments: files
    });
    return sendJson(res, 201, { issue });
  }

  const issueMatch = url.pathname.match(/^\/api\/issues\/([^/]+)$/);
  if (issueMatch && req.method === 'GET') {
    const issue = repository.getIssue(issueMatch[1]);
    return issue ? sendJson(res, 200, { issue }) : sendError(res, 404, 'Issue not found.');
  }

  if (issueMatch && req.method === 'PATCH') {
    const { fields } = await parseRequestData(req);
    const issue = repository.updateIssue(issueMatch[1], fields);
    return issue ? sendJson(res, 200, { issue }) : sendError(res, 404, 'Issue not found.');
  }

  if (issueMatch && req.method === 'DELETE') {
    const deleted = repository.deleteIssue(issueMatch[1]);
    return sendJson(res, deleted ? 200 : 404, { deleted });
  }

  const upvoteMatch = url.pathname.match(/^\/api\/issues\/([^/]+)\/upvote$/);
  if (upvoteMatch && req.method === 'POST') {
    const voterKey = req.headers['x-user-id'] || req.socket.remoteAddress || 'anonymous';
    const issue = repository.upvoteIssue(upvoteMatch[1], String(voterKey));
    return issue ? sendJson(res, 200, { issue }) : sendError(res, 404, 'Issue not found.');
  }

  const attachmentMatch = url.pathname.match(/^\/api\/attachments\/([^/]+)$/);
  if (attachmentMatch && req.method === 'GET') {
    const attachment = repository.getAttachment(attachmentMatch[1]);
    if (!attachment) return sendError(res, 404, 'Attachment not found.');
    res.writeHead(200, {
      'Content-Type': attachment.mime_type,
      'Content-Length': attachment.size_bytes,
      'Content-Disposition': `inline; filename="${attachment.filename.replaceAll('"', '')}"`
    });
    return res.end(attachment.content);
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/summary') {
    return sendJson(res, 200, repository.stats());
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/users') {
    return sendJson(res, 200, { users: repository.listUsers() });
  }

  const userMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (userMatch && req.method === 'PATCH') {
    const { fields } = await parseRequestData(req);
    const user = repository.updateUser(userMatch[1], fields);
    return user ? sendJson(res, 200, { user }) : sendError(res, 404, 'User not found.');
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const { fields } = await parseRequestData(req);
    const user = repository.findUserByEmail(fields.email || '');
    if (!user || !verifyPassword(fields.password || '', user.password_hash)) {
      return sendError(res, 401, 'Invalid email or password.');
    }
    if (user.status === 'banned') {
      return sendError(res, 403, 'This account is banned.');
    }
    return sendJson(res, 200, { user: publicUser(user) });
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/signup') {
    const { fields } = await parseRequestData(req);
    if (!fields.name || !fields.email || !fields.password) return sendError(res, 400, 'Name, email, and password are required.');
    if (repository.findUserByEmail(fields.email)) return sendError(res, 409, 'Email is already registered.');
    const user = repository.createUser({ name: String(fields.name).trim(), email: String(fields.email).trim(), password: String(fields.password) });
    return sendJson(res, 201, { user });
  }

  return sendError(res, 404, 'API route not found.');
}

function resolveStaticPath(pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const normalizedPath = normalize(decodedPath)
    .replace(/^[/\\]+/, '')
    .replace(/^(\.\.[/\\])+/, '');

  const candidates = [];
  if (normalizedPath === '.' || normalizedPath === '') {
    candidates.push(join(rootDir, 'HTML', 'index.html'));
  } else {
    candidates.push(join(rootDir, normalizedPath));
    const firstSegment = normalizedPath.split(/[\\/]/)[0].toLowerCase();
    if (firstSegment !== 'html' && extname(normalizedPath) === '.html') {
      candidates.push(join(rootDir, 'HTML', normalizedPath));
    }
  }

  const normalizedRoot = normalize(rootDir);
  return candidates.find(candidate => {
    const normalizedCandidate = normalize(candidate);
    const isInsideRoot = normalizedCandidate === normalizedRoot
      || normalizedCandidate.startsWith(`${normalizedRoot}\\`)
      || normalizedCandidate.startsWith(`${normalizedRoot}/`);
    return isInsideRoot && existsSync(normalizedCandidate) && statSync(normalizedCandidate).isFile();
  });
}

function serveStatic(req, res, url) {
  const filePath = resolveStaticPath(url.pathname);
  if (!filePath) {
    const notFound = join(rootDir, 'HTML', '404.html');
    res.writeHead(404, { 'Content-Type': mimeTypes['.html'] });
    return createReadStream(notFound).pipe(res);
  }

  const extension = extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': mimeTypes[extension] || 'application/octet-stream' });
  return createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }
    serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    sendError(res, 500, error.message || 'Internal server error.');
  }
});

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  server.listen(port, () => {
    console.log(`CityReport running at http://localhost:${port}`);
    console.log(`SQLite database: ${dbPath}`);
  });
}

export { server, repository };
