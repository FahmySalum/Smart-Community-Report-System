import 'dotenv/config';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRepository, initializeDatabase, prepareOptionalTables, verifyPassword, pool } from './database-mysql.js';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(__dirname);
const port = Number(process.env.PORT || 3000);
let repository;

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

    if (filename) {
      files.push({ filename, mimeType, content: body });
    } else if (name) {
      fields[name] = body.toString('utf8');
    }
  }

  return { fields, files };
}

async function handleRequest(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  console.log(`${req.method} ${url.href} -> ${pathname}`);

  // API Routes
  if (pathname.startsWith('/api/')) {
    try {
      // Issues
      if (pathname === '/api/issues' && req.method === 'GET') {
        const filters = {};
        if (url.searchParams.has('search')) filters.search = url.searchParams.get('search');
        if (url.searchParams.has('category')) filters.category = url.searchParams.get('category');
        if (url.searchParams.has('status')) filters.status = url.searchParams.get('status');
        if (url.searchParams.has('priority')) filters.priority = url.searchParams.get('priority');
        const issues = await repository.listIssues(filters);
        sendJson(res, 200, { issues });
        return;
      }

      if (pathname === '/api/issues' && req.method === 'POST') {
        const contentType = req.headers['content-type'] || '';
        let body;
        if (contentType.includes('multipart/form-data')) {
          const buffer = await readBody(req);
          const { fields, files } = parseMultipart(buffer, contentType);
          body = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v]));
          body.attachments = files;
        } else {
          const buffer = await readBody(req);
          body = buffer.length ? JSON.parse(buffer.toString('utf8')) : {};
        }
        const userId = req.headers['x-user-id'];
        body.reportedById = userId || null;
        const issue = await repository.createIssue(body);
        sendJson(res, 201, { issue });
        return;
      }

      const issueActionMatch = pathname.match(/^\/api\/issues\/([^/]+)(?:\/(upvote))?$/);
      const issueId = issueActionMatch?.[1];
      const issueAction = issueActionMatch?.[2];

      if (issueId && !issueAction) {
        if (req.method === 'GET') {
          const issue = await repository.getIssue(issueId);
          if (!issue) {
            sendError(res, 404, 'Issue not found');
            return;
          }
          sendJson(res, 200, { issue });
          return;
        }

        if (req.method === 'PATCH') {
          const buffer = await readBody(req);
          const body = buffer.length ? JSON.parse(buffer.toString('utf8')) : {};
          const issue = await repository.updateIssue(issueId, body);
          sendJson(res, 200, { issue });
          return;
        }

        if (req.method === 'DELETE') {
          const deleted = await repository.deleteIssue(issueId);
          if (!deleted) {
            sendError(res, 404, 'Issue not found');
            return;
          }
          sendJson(res, 204, {});
          return;
        }
      }

      // Upvote
      if (issueId && issueAction === 'upvote' && req.method === 'POST') {
        const voterKey = req.headers['x-voter-key'];
        const issue = await repository.upvoteIssue(issueId, voterKey);
        sendJson(res, 200, { issue });
        return;
      }

      // Attachments
      const attachmentMatch = pathname.match(/^\/api\/attachments\/([^/]+)$/);
      if (attachmentMatch && req.method === 'GET') {
        const attachmentId = attachmentMatch[1];
        const attachment = await repository.getAttachment(attachmentId);
        if (!attachment) {
          sendError(res, 404, 'Attachment not found');
          return;
        }
        res.writeHead(200, {
          'Content-Type': attachment.mime_type || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${attachment.filename}"`,
          'Content-Length': attachment.size_bytes
        });
        res.end(attachment.content);
        return;
      }

      // Users
      if (pathname === '/api/users' && req.method === 'GET') {
        const users = await repository.listUsers();
        sendJson(res, 200, { users });
        return;
      }

      if (pathname === '/api/users' && req.method === 'POST') {
        const buffer = await readBody(req);
        const body = JSON.parse(buffer.toString('utf8'));
        const user = await repository.createUser(body);
        sendJson(res, 201, { user });
        return;
      }

      const userIdMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
      if (userIdMatch && req.method === 'PATCH') {
        const userId = userIdMatch[1];
        const buffer = await readBody(req);
        const body = JSON.parse(buffer.toString('utf8'));
        const user = await repository.updateUser(userId, body);
        if (!user) {
          sendError(res, 404, 'User not found');
          return;
        }
        sendJson(res, 200, { user });
        return;
      }

      // Auth
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const buffer = await readBody(req);
        const { email, password } = JSON.parse(buffer.toString('utf8'));
        const user = await repository.findUserByEmail(email);
        if (!user || !verifyPassword(password, user.password_hash)) {
          sendError(res, 401, 'Invalid email or password');
          return;
        }
        sendJson(res, 200, { user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status } });
        return;
      }

      if (pathname === '/api/auth/register' && req.method === 'POST') {
        const buffer = await readBody(req);
        const { email, password, name } = JSON.parse(buffer.toString('utf8'));
        const existingUser = await repository.findUserByEmail(email);
        if (existingUser) {
          sendError(res, 400, 'Email already registered');
          return;
        }
        const user = await repository.createUser({ email, password, name });
        sendJson(res, 201, { user });
        return;
      }

      // Stats
      // Admin compatibility endpoints used by the frontend
      if (pathname === '/api/admin/summary' && req.method === 'GET') {
        const stats = await repository.stats();
        sendJson(res, 200, stats);
        return;
      }

      if (pathname === '/api/admin/users' && req.method === 'GET') {
        const users = await repository.listUsers();
        sendJson(res, 200, { users });
        return;
      }

      if (pathname === '/api/stats' && req.method === 'GET') {
        const stats = await repository.stats();
        sendJson(res, 200, stats);
        return;
      }

      // Contact form: receive messages from citizens
      if (pathname === '/api/contact' && req.method === 'POST') {
        const buffer = await readBody(req);
        const body = buffer.length ? JSON.parse(buffer.toString('utf8')) : {};
        if (!body.name || !body.email || !body.message) {
          sendError(res, 400, 'Name, email and message are required.');
          return;
        }
        const contact = await repository.createContact(body);
        sendJson(res, 201, { contact });
        return;
      }

      // Admin: list contact messages
      if (pathname === '/api/admin/contacts' && req.method === 'GET') {
        const contacts = await repository.listContacts();
        sendJson(res, 200, { contacts });
        return;
      }

      sendError(res, 404, 'Not found');
    } catch (error) {
      console.error(error);
      sendError(res, 500, error.message);
    }
    return;
  }

  // Static files
  try {
    let filePath = pathname === '/' ? '/HTML/index.html' : pathname;
    filePath = join(rootDir, filePath);

    // Security check
    if (!filePath.startsWith(rootDir)) {
      sendError(res, 403, 'Forbidden');
      return;
    }

    if (!existsSync(filePath)) {
      sendError(res, 404, 'Not found');
      return;
    }

    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      filePath = join(filePath, 'index.html');
      if (!existsSync(filePath)) {
        sendError(res, 404, 'Not found');
        return;
      }
    }

    const ext = extname(filePath);
    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Length': statSync(filePath).size
    });
    createReadStream(filePath).pipe(res);
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

async function resetDatabase() {
  const connection = await pool.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('DROP TABLE IF EXISTS votes, attachments, comments, status_history, issues, contacts, users');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Database reset completed.');
  } finally {
    connection.release();
  }
}

async function start() {
  try {
    const resetDb = process.argv.includes('--reset-db');
    if (resetDb) {
      console.log('Resetting database...');
      await resetDatabase();
    }

    console.log('Initializing database...');
    await initializeDatabase();
    // ensure optional tables exist (contacts etc.)
    try {
      await prepareOptionalTables();
    } catch (err) {
      console.warn('prepareOptionalTables failed, continuing:', err?.message || err);
    }
    repository = createRepository();
    console.log('Database initialized successfully');

    const server = createServer(handleRequest);
    server.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      server.close();
      await pool.end();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
