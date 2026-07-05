import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(__dirname);
const dataDir = join(__dirname, 'data');
const dbPath = join(dataDir, 'cityreport.sqlite');
const schemaPath = join(__dirname, 'schema.sql');

export const labels = {
  categories: {
    pothole: 'Pothole',
    streetlight: 'Streetlight',
    water_leak: 'Water Leak',
    garbage: 'Garbage/Litter',
    graffiti: 'Graffiti',
    noise: 'Noise Complaint',
    drainage: 'Drainage',
    road_damage: 'Road Damage',
    other: 'Other'
  },
  statuses: {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed'
  },
  priorities: {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical'
  }
};

const seedUsers = [
  { id: 'USR-001', name: 'Alex Thompson', email: '1@1.com', password: '123', role: 'admin', status: 'active', createdAt: '2025-11-01T09:00:00.000Z' },
  { id: 'USR-002', name: 'John Doe', email: 'john.doe@email.com', password: 'password', role: 'user', status: 'active', createdAt: '2025-12-10T09:00:00.000Z' },
  { id: 'USR-003', name: 'Jane Smith', email: 'jane.smith@email.com', password: 'password', role: 'moderator', status: 'active', createdAt: '2025-12-15T09:00:00.000Z' },
  { id: 'USR-004', name: 'Mike Johnson', email: 'mike.johnson@email.com', password: 'password', role: 'user', status: 'active', createdAt: '2026-01-05T09:00:00.000Z' },
  { id: 'USR-005', name: 'Sarah Williams', email: 'sarah.w@email.com', password: 'password', role: 'user', status: 'banned', createdAt: '2026-01-12T09:00:00.000Z' },
  { id: 'USR-006', name: 'Tom Brown', email: 'tom.brown@email.com', password: 'password', role: 'user', status: 'active', createdAt: '2026-01-20T09:00:00.000Z' },
  { id: 'USR-007', name: 'Emily Davis', email: 'emily.d@email.com', password: 'password', role: 'moderator', status: 'active', createdAt: '2025-11-15T09:00:00.000Z' },
  { id: 'USR-008', name: 'Lisa Anderson', email: 'lisa.a@email.com', password: 'password', role: 'user', status: 'active', createdAt: '2026-02-01T09:00:00.000Z' },
  { id: 'USR-009', name: 'David Wilson', email: 'david.w@email.com', password: 'password', role: 'user', status: 'banned', createdAt: '2026-02-05T09:00:00.000Z' },
  { id: 'USR-010', name: 'Rachel Green', email: 'rachel.g@email.com', password: 'password', role: 'user', status: 'active', createdAt: '2026-02-10T09:00:00.000Z' }
];

const seedIssues = [
  {
    id: 'ISS-001',
    title: 'Large pothole on Main Street near intersection',
    description: 'A large pothole approximately 2 feet wide has appeared on Main Street near the intersection with Oak Avenue. It is a danger to vehicles and cyclists. Multiple residents have reported near-accidents.',
    category: 'pothole',
    status: 'open',
    priority: 'high',
    location: 'Main Street & Oak Avenue',
    latitude: 40.7564,
    longitude: -73.9867,
    reportedById: 'USR-002',
    reportedByName: 'John Doe',
    reportedAt: '2026-02-15T10:30:00.000Z',
    updatedAt: '2026-02-15T10:30:00.000Z',
    upvotes: 24
  },
  {
    id: 'ISS-002',
    title: 'Broken streetlight on Elm Road',
    description: 'The streetlight outside 45 Elm Road has been flickering for the past week and is now completely out. The area is very dark at night and poses a safety concern for pedestrians.',
    category: 'streetlight',
    status: 'in_progress',
    priority: 'medium',
    location: '45 Elm Road',
    latitude: 40.7488,
    longitude: -73.968,
    reportedById: 'USR-003',
    reportedByName: 'Jane Smith',
    reportedAt: '2026-02-12T14:15:00.000Z',
    updatedAt: '2026-02-17T09:00:00.000Z',
    upvotes: 12
  },
  {
    id: 'ISS-003',
    title: 'Water leak from fire hydrant on Park Lane',
    description: 'A steady stream of water has been leaking from the fire hydrant on Park Lane for the past 3 days. Water is pooling on the sidewalk and causing ice to form in the mornings.',
    category: 'water_leak',
    status: 'open',
    priority: 'critical',
    location: 'Park Lane, near #12',
    latitude: 40.7641,
    longitude: -73.9815,
    reportedById: 'USR-004',
    reportedByName: 'Mike Johnson',
    reportedAt: '2026-02-16T08:45:00.000Z',
    updatedAt: '2026-02-16T08:45:00.000Z',
    upvotes: 31
  },
  {
    id: 'ISS-004',
    title: 'Overflowing garbage bins at Central Park',
    description: 'The garbage bins at the south entrance of Central Park have been overflowing for several days. Trash is scattered around the area and attracting pests.',
    category: 'garbage',
    status: 'resolved',
    priority: 'medium',
    location: 'Central Park, South Entrance',
    latitude: 40.7678,
    longitude: -73.9718,
    reportedById: 'USR-005',
    reportedByName: 'Sarah Williams',
    reportedAt: '2026-02-10T16:20:00.000Z',
    updatedAt: '2026-02-14T11:30:00.000Z',
    upvotes: 18
  },
  {
    id: 'ISS-005',
    title: 'Graffiti vandalism on community center wall',
    description: 'Extensive graffiti has been sprayed on the east-facing wall of the Riverside Community Center. The vandalism covers approximately 20 square feet.',
    category: 'graffiti',
    status: 'open',
    priority: 'low',
    location: 'Riverside Community Center',
    latitude: 40.7529,
    longitude: -73.9931,
    reportedById: 'USR-006',
    reportedByName: 'Tom Brown',
    reportedAt: '2026-02-18T09:00:00.000Z',
    updatedAt: '2026-02-18T09:00:00.000Z',
    upvotes: 7
  },
  {
    id: 'ISS-006',
    title: 'Blocked storm drain causing flooding on 5th Avenue',
    description: 'The storm drain at the corner of 5th Avenue and Cedar Street is completely blocked with debris. During rain, water floods the street and nearby sidewalks.',
    category: 'drainage',
    status: 'in_progress',
    priority: 'high',
    location: '5th Avenue & Cedar Street',
    latitude: 40.7449,
    longitude: -73.9857,
    reportedById: 'USR-007',
    reportedByName: 'Emily Davis',
    reportedAt: '2026-02-11T13:00:00.000Z',
    updatedAt: '2026-02-16T15:45:00.000Z',
    upvotes: 29
  },
  {
    id: 'ISS-007',
    title: 'Cracked road surface on Highway 12 exit ramp',
    description: 'Multiple deep cracks have appeared on the exit ramp of Highway 12 heading into town. The cracks span the entire width of the road and are getting worse.',
    category: 'road_damage',
    status: 'closed',
    priority: 'high',
    location: 'Highway 12 Exit Ramp B',
    latitude: 40.7405,
    longitude: -73.9992,
    reportedById: 'USR-009',
    reportedByName: 'David Wilson',
    reportedAt: '2026-01-28T11:00:00.000Z',
    updatedAt: '2026-02-10T14:00:00.000Z',
    upvotes: 45
  },
  {
    id: 'ISS-008',
    title: 'Excessive noise from construction site on weekends',
    description: 'Construction work at the new development on Birch Street is continuing on weekends starting at 6 AM, violating the city noise ordinance.',
    category: 'noise',
    status: 'open',
    priority: 'medium',
    location: 'Birch Street Development Site',
    latitude: 40.7586,
    longitude: -73.975,
    reportedById: 'USR-008',
    reportedByName: 'Lisa Anderson',
    reportedAt: '2026-02-17T07:30:00.000Z',
    updatedAt: '2026-02-17T07:30:00.000Z',
    upvotes: 15
  }
];

const seedComments = [
  { issueId: 'ISS-001', userId: 'USR-003', author: 'City Maintenance', body: "We've dispatched a team to assess the situation.", createdAt: '2026-02-17T09:00:00.000Z' },
  { issueId: 'ISS-001', userId: 'USR-010', author: 'Resident', body: "This has been a problem for weeks. Glad it's being addressed!", createdAt: '2026-02-18T09:00:00.000Z' },
  { issueId: 'ISS-001', userId: 'USR-003', author: 'City Maintenance', body: 'Work is scheduled for next week.', createdAt: '2026-02-19T08:30:00.000Z' }
];

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, original] = String(storedHash).split(':');
  if (!salt || !original) return false;

  const hash = pbkdf2Sync(password, salt, 100000, 64, 'sha512');
  const originalBuffer = Buffer.from(original, 'hex');
  return originalBuffer.length === hash.length && timingSafeEqual(originalBuffer, hash);
}

function publicId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
}

function now() {
  return new Date().toISOString();
}

function mapIssue(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    categoryLabel: labels.categories[row.category] || row.category,
    status: row.status,
    statusLabel: labels.statuses[row.status] || row.status,
    priority: row.priority,
    priorityLabel: labels.priorities[row.priority] || row.priority,
    location: row.location,
    latitude: row.latitude,
    longitude: row.longitude,
    reportedBy: row.reported_by_name,
    reportedById: row.reported_by_id,
    reportedAt: row.reported_at,
    updatedAt: row.updated_at,
    upvotes: row.upvotes,
    comments: row.comments ?? 0,
    attachments: row.attachments ?? 0
  };
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    joinedAt: row.created_at,
    issuesReported: row.issues_reported ?? 0
  };
}

export function createDatabase({ reset = false } = {}) {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (reset && existsSync(dbPath)) rmSync(dbPath);

  const db = new DatabaseSync(dbPath);
  db.exec(readFileSync(schemaPath, 'utf8'));
  seedDatabase(db);
  return db;
}

function seedDatabase(db) {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount > 0) return;

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertIssue = db.prepare(`
    INSERT INTO issues (id, title, description, category, status, priority, location, latitude, longitude, reported_by_id, reported_by_name, reported_at, updated_at, upvotes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertComment = db.prepare(`
    INSERT INTO comments (id, issue_id, user_id, author_name, body, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  try {
    for (const user of seedUsers) {
      insertUser.run(user.id, user.name, user.email, hashPassword(user.password), user.role, user.status, user.createdAt);
    }

    for (const issue of seedIssues) {
      insertIssue.run(
        issue.id,
        issue.title,
        issue.description,
        issue.category,
        issue.status,
        issue.priority,
        issue.location,
        issue.latitude,
        issue.longitude,
        issue.reportedById,
        issue.reportedByName,
        issue.reportedAt,
        issue.updatedAt,
        issue.upvotes
      );
    }

    for (const comment of seedComments) {
      insertComment.run(publicId('COM'), comment.issueId, comment.userId, comment.author, comment.body, comment.createdAt);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function createRepository(db) {
  return {
    labels,

    listIssues(filters = {}) {
      const where = [];
      const params = [];

      if (filters.search) {
        where.push('(LOWER(i.title) LIKE ? OR LOWER(i.location) LIKE ? OR LOWER(i.description) LIKE ?)');
        const term = `%${filters.search.toLowerCase()}%`;
        params.push(term, term, term);
      }
      if (filters.category) {
        where.push('i.category = ?');
        params.push(filters.category);
      }
      if (filters.status) {
        where.push('i.status = ?');
        params.push(filters.status);
      }
      if (filters.priority) {
        where.push('i.priority = ?');
        params.push(filters.priority);
      }

      const sql = `
        SELECT i.*,
          (SELECT COUNT(*) FROM comments c WHERE c.issue_id = i.id) AS comments,
          (SELECT COUNT(*) FROM attachments a WHERE a.issue_id = i.id) AS attachments
        FROM issues i
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY datetime(i.reported_at) DESC
      `;
      return db.prepare(sql).all(...params).map(mapIssue);
    },

    getIssue(id) {
      const row = db.prepare(`
        SELECT i.*,
          (SELECT COUNT(*) FROM comments c WHERE c.issue_id = i.id) AS comments,
          (SELECT COUNT(*) FROM attachments a WHERE a.issue_id = i.id) AS attachments
        FROM issues i
        WHERE i.id = ?
      `).get(id);
      const issue = mapIssue(row);
      if (!issue) return null;

      issue.commentList = db.prepare(`
        SELECT id, author_name AS author, body, created_at AS createdAt
        FROM comments
        WHERE issue_id = ?
        ORDER BY datetime(created_at) ASC
      `).all(id);
      issue.attachmentList = db.prepare(`
        SELECT id, filename, mime_type AS mimeType, size_bytes AS sizeBytes, created_at AS createdAt
        FROM attachments
        WHERE issue_id = ?
        ORDER BY datetime(created_at) ASC
      `).all(id);

      return issue;
    },

    createIssue(input) {
      const id = publicId('ISS');
      const createdAt = now();
      const reportedBy = input.reportedByName || 'Guest Reporter';
      const latitude = input.latitude === '' || input.latitude == null ? null : Number(input.latitude);
      const longitude = input.longitude === '' || input.longitude == null ? null : Number(input.longitude);

      db.prepare(`
        INSERT INTO issues (id, title, description, category, status, priority, location, latitude, longitude, reported_by_id, reported_by_name, reported_at, updated_at, upvotes)
        VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(
        id,
        input.title,
        input.description,
        input.category,
        input.priority || 'medium',
        input.location,
        latitude,
        longitude,
        input.reportedById || null,
        reportedBy,
        createdAt,
        createdAt
      );

      if (Array.isArray(input.attachments)) {
        const insertAttachment = db.prepare(`
          INSERT INTO attachments (id, issue_id, filename, mime_type, size_bytes, content, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const file of input.attachments) {
          if (!file.filename || !file.content?.length) continue;
          insertAttachment.run(publicId('ATT'), id, file.filename, file.mimeType || 'application/octet-stream', file.content.length, file.content, createdAt);
        }
      }

      return this.getIssue(id);
    },

    updateIssue(id, input) {
      const current = this.getIssue(id);
      if (!current) return null;

      const status = input.status || current.status;
      const priority = input.priority || current.priority;
      const updatedAt = now();

      db.prepare(`
        UPDATE issues
        SET status = ?, priority = ?, updated_at = ?
        WHERE id = ?
      `).run(status, priority, updatedAt, id);

      if (status !== current.status) {
        db.prepare(`
          INSERT INTO status_history (id, issue_id, old_status, new_status, note, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(publicId('HIS'), id, current.status, status, input.note || null, updatedAt);
      }

      return this.getIssue(id);
    },

    deleteIssue(id) {
      const result = db.prepare('DELETE FROM issues WHERE id = ?').run(id);
      return result.changes > 0;
    },

    upvoteIssue(id, voterKey = randomUUID()) {
      try {
        db.prepare('INSERT INTO votes (id, issue_id, voter_key, created_at) VALUES (?, ?, ?, ?)').run(publicId('VOT'), id, voterKey, now());
        db.prepare('UPDATE issues SET upvotes = upvotes + 1, updated_at = ? WHERE id = ?').run(now(), id);
      } catch (error) {
        if (!String(error.message).includes('UNIQUE')) throw error;
      }
      return this.getIssue(id);
    },

    getAttachment(id) {
      return db.prepare('SELECT * FROM attachments WHERE id = ?').get(id);
    },

    listUsers() {
      return db.prepare(`
        SELECT u.*,
          (SELECT COUNT(*) FROM issues i WHERE i.reported_by_id = u.id) AS issues_reported
        FROM users u
        ORDER BY datetime(u.created_at) ASC
      `).all().map(mapUser);
    },

    updateUser(id, input) {
      const current = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      if (!current) return null;
      const status = input.status || current.status;
      const role = input.role || current.role;
      db.prepare('UPDATE users SET status = ?, role = ? WHERE id = ?').run(status, role, id);
      return this.listUsers().find(user => user.id === id);
    },

    findUserByEmail(email) {
      return db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
    },

    createUser(input) {
      const id = publicId('USR');
      const createdAt = now();
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, status, created_at)
        VALUES (?, ?, ?, ?, 'user', 'active', ?)
      `).run(id, input.name, input.email, hashPassword(input.password), createdAt);
      return mapUser({ id, name: input.name, email: input.email, role: 'user', status: 'active', created_at: createdAt, issues_reported: 0 });
    },

    stats() {
      const summary = db.prepare(`
        SELECT
          COUNT(*) AS totalIssues,
          SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS openIssues,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS inProgressIssues,
          SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS resolvedIssues
        FROM issues
      `).get();

      const categoryStats = db.prepare(`
        SELECT category AS name, COUNT(*) AS count
        FROM issues
        GROUP BY category
        ORDER BY count DESC
      `).all().map(row => ({ name: labels.categories[row.name] || row.name, count: row.count }));

      const monthlyTrends = db.prepare(`
        SELECT strftime('%Y-%m', reported_at) AS month,
          COUNT(*) AS reported,
          SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS resolved
        FROM issues
        GROUP BY strftime('%Y-%m', reported_at)
        ORDER BY month ASC
      `).all();

      return {
        totalIssues: summary.totalIssues || 0,
        openIssues: summary.openIssues || 0,
        inProgressIssues: summary.inProgressIssues || 0,
        resolvedIssues: summary.resolvedIssues || 0,
        categoryStats,
        monthlyTrends
      };
    }
  };
}

export { dbPath, rootDir };
