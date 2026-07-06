import mysql from 'mysql2/promise';
import { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

// MySQL Connection Pool Configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cityreport',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

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

export async function initializeDatabase() {
  const connection = await pool.getConnection();
  try {
    // Check if database exists and has the users table
    await connection.query('SELECT 1 FROM users LIMIT 1');
    console.log('Database already initialized');
    await ensureSeedData();
  } catch (error) {
    console.log('Initializing database with seed data...');
    await seedDatabase();
  } finally {
    connection.release();
  }
}

// Call this at server start to ensure optional tables exist
export async function prepareOptionalTables() {
  await ensureContactsTable();
}

async function ensureSeedData() {
  const connection = await pool.getConnection();
  try {
    const [userRows] = await connection.query('SELECT id, email FROM users');
    const existingUsers = new Set(userRows.map(row => row.id));
    const existingEmails = new Set(userRows.map(row => row.email.toLowerCase()));

    for (const user of seedUsers) {
      if (!existingUsers.has(user.id) && !existingEmails.has(user.email.toLowerCase())) {
        await connection.query(
          'INSERT INTO users (id, name, email, password_hash, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [user.id, user.name, user.email, hashPassword(user.password), user.role, user.status, user.createdAt]
        );
      }
    }

    const [issueRows] = await connection.query('SELECT id FROM issues');
    const existingIssueIds = new Set(issueRows.map(row => row.id));
    const missingIssueIds = seedIssues.filter(issue => !existingIssueIds.has(issue.id));

    if (missingIssueIds.length) {
      console.log(`Restoring ${missingIssueIds.length} missing sample issue(s)...`);
      for (const issue of missingIssueIds) {
        await connection.query(
          `INSERT INTO issues (id, title, description, category, status, priority, location, latitude, longitude, reported_by_id, reported_by_name, reported_at, updated_at, upvotes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            issue.id, issue.title, issue.description, issue.category, issue.status, issue.priority,
            issue.location, issue.latitude, issue.longitude, issue.reportedById, issue.reportedByName,
            issue.reportedAt, issue.updatedAt, issue.upvotes
          ]
        );
      }
    }

    for (const issue of seedIssues) {
      const [comments] = await connection.query('SELECT COUNT(*) AS count FROM comments WHERE issue_id = ?', [issue.id]);
      if (comments[0]?.count === 0) {
        const issueComments = seedComments.filter(comment => comment.issueId === issue.id);
        for (const comment of issueComments) {
          await connection.query(
            'INSERT INTO comments (id, issue_id, user_id, author_name, body, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [publicId('COM'), comment.issueId, comment.userId, comment.author, comment.body, comment.createdAt]
          );
        }
      }
    }

    if (missingIssueIds.length) {
      console.log('Sample issue data restored successfully');
    }
  } finally {
    connection.release();
  }
}

// Ensure contact table exists (helpful if schema wasn't imported manually)
async function ensureContactsTable() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        message LONGTEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } finally {
    connection.release();
  }
}

async function seedDatabase() {
  const connection = await pool.getConnection();
  try {
    // Check if data already exists
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    if (users[0].count > 0) {
      console.log('Database already seeded');
      return;
    }

    // Insert users
    for (const user of seedUsers) {
      await connection.query(
        'INSERT INTO users (id, name, email, password_hash, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [user.id, user.name, user.email, hashPassword(user.password), user.role, user.status, user.createdAt]
      );
    }

    // Insert issues
    for (const issue of seedIssues) {
      await connection.query(
        `INSERT INTO issues (id, title, description, category, status, priority, location, latitude, longitude, reported_by_id, reported_by_name, reported_at, updated_at, upvotes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          issue.id, issue.title, issue.description, issue.category, issue.status, issue.priority,
          issue.location, issue.latitude, issue.longitude, issue.reportedById, issue.reportedByName,
          issue.reportedAt, issue.updatedAt, issue.upvotes
        ]
      );
    }

    // Insert comments
    for (const comment of seedComments) {
      await connection.query(
        'INSERT INTO comments (id, issue_id, user_id, author_name, body, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [publicId('COM'), comment.issueId, comment.userId, comment.author, comment.body, comment.createdAt]
      );
    }

    console.log('Database seeded successfully');
  } finally {
    connection.release();
  }
}

export function createRepository() {
  return {
    labels,

    async listIssues(filters = {}) {
      let sql = `
        SELECT i.*,
          (SELECT COUNT(*) FROM comments c WHERE c.issue_id = i.id) AS comments,
          (SELECT COUNT(*) FROM attachments a WHERE a.issue_id = i.id) AS attachments
        FROM issues i
        WHERE 1=1
      `;
      const params = [];

      if (filters.search) {
        sql += ' AND (LOWER(i.title) LIKE ? OR LOWER(i.location) LIKE ? OR LOWER(i.description) LIKE ?)';
        const term = `%${filters.search.toLowerCase()}%`;
        params.push(term, term, term);
      }
      if (filters.category) {
        sql += ' AND i.category = ?';
        params.push(filters.category);
      }
      if (filters.status) {
        sql += ' AND i.status = ?';
        params.push(filters.status);
      }
      if (filters.priority) {
        sql += ' AND i.priority = ?';
        params.push(filters.priority);
      }

      sql += ' ORDER BY i.reported_at DESC';

      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.query(sql, params);
        return rows.map(mapIssue);
      } finally {
        connection.release();
      }
    },

    async getIssue(id) {
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.query(`
          SELECT i.*,
            (SELECT COUNT(*) FROM comments c WHERE c.issue_id = i.id) AS comments,
            (SELECT COUNT(*) FROM attachments a WHERE a.issue_id = i.id) AS attachments
          FROM issues i
          WHERE i.id = ?
        `, [id]);

        if (!rows.length) return null;

        const issue = mapIssue(rows[0]);

        const [comments] = await connection.query(`
          SELECT id, author_name AS author, body, created_at AS createdAt
          FROM comments
          WHERE issue_id = ?
          ORDER BY created_at ASC
        `, [id]);

        const [attachments] = await connection.query(`
          SELECT id, filename, mime_type AS mimeType, size_bytes AS sizeBytes, created_at AS createdAt
          FROM attachments
          WHERE issue_id = ?
          ORDER BY created_at ASC
        `, [id]);

        issue.commentList = comments;
        issue.attachmentList = attachments;

        return issue;
      } finally {
        connection.release();
      }
    },

        // Contact messages
        async createContact(input) {
          const id = publicId('CON');
          const createdAt = now();
          const connection = await pool.getConnection();
          try {
            await connection.query(
              'INSERT INTO contacts (id, name, email, subject, message, created_at) VALUES (?, ?, ?, ?, ?, ?)',
              [id, input.name, input.email, input.subject || null, input.message, createdAt]
            );
            return { id, name: input.name, email: input.email, subject: input.subject || null, message: input.message, created_at: createdAt };
          } finally {
            connection.release();
          }
        },

        async listContacts() {
          const connection = await pool.getConnection();
          try {
            const [rows] = await connection.query('SELECT id, name, email, subject, message, created_at AS createdAt FROM contacts ORDER BY created_at DESC');
            return rows;
          } finally {
            connection.release();
          }
        },

    async createIssue(input) {
      const id = publicId('ISS');
      const createdAt = now();
      const reportedBy = input.reportedByName || 'Guest Reporter';
      const latitude = input.latitude === '' || input.latitude == null ? null : Number(input.latitude);
      const longitude = input.longitude === '' || input.longitude == null ? null : Number(input.longitude);

      const connection = await pool.getConnection();
      try {
        await connection.query(`
          INSERT INTO issues (id, title, description, category, status, priority, location, latitude, longitude, reported_by_id, reported_by_name, reported_at, updated_at, upvotes)
          VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `, [
          id, input.title, input.description, input.category, input.priority || 'medium',
          input.location, latitude, longitude, input.reportedById || null, reportedBy, createdAt, createdAt
        ]);

        if (Array.isArray(input.attachments)) {
          for (const file of input.attachments) {
            if (!file.filename || !file.content?.length) continue;
            await connection.query(`
              INSERT INTO attachments (id, issue_id, filename, mime_type, size_bytes, content, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              publicId('ATT'), id, file.filename, file.mimeType || 'application/octet-stream',
              file.content.length, file.content, createdAt
            ]);
          }
        }

        return this.getIssue(id);
      } finally {
        connection.release();
      }
    },

    async updateIssue(id, input) {
      const current = await this.getIssue(id);
      if (!current) return null;

      const status = input.status || current.status;
      const priority = input.priority || current.priority;
      const updatedAt = now();

      const connection = await pool.getConnection();
      try {
        await connection.query(`
          UPDATE issues
          SET status = ?, priority = ?, updated_at = ?
          WHERE id = ?
        `, [status, priority, updatedAt, id]);

        if (status !== current.status) {
          await connection.query(`
            INSERT INTO status_history (id, issue_id, old_status, new_status, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [publicId('HIS'), id, current.status, status, input.note || null, updatedAt]);
        }

        return this.getIssue(id);
      } finally {
        connection.release();
      }
    },

    async deleteIssue(id) {
      const connection = await pool.getConnection();
      try {
        const [result] = await connection.query('DELETE FROM issues WHERE id = ?', [id]);
        return result.affectedRows > 0;
      } finally {
        connection.release();
      }
    },

    async upvoteIssue(id, voterKey = randomUUID()) {
      const connection = await pool.getConnection();
      try {
        try {
          await connection.query(
            'INSERT INTO votes (id, issue_id, voter_key, created_at) VALUES (?, ?, ?, ?)',
            [publicId('VOT'), id, voterKey, now()]
          );
          await connection.query(
            'UPDATE issues SET upvotes = upvotes + 1, updated_at = ? WHERE id = ?',
            [now(), id]
          );
        } catch (error) {
          if (!String(error.message).includes('UNIQUE') && !String(error.message).includes('Duplicate')) throw error;
        }
        return this.getIssue(id);
      } finally {
        connection.release();
      }
    },

    async getAttachment(id) {
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.query('SELECT * FROM attachments WHERE id = ?', [id]);
        return rows[0] || null;
      } finally {
        connection.release();
      }
    },

    async listUsers() {
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.query(`
          SELECT u.*,
            (SELECT COUNT(*) FROM issues i WHERE i.reported_by_id = u.id) AS issues_reported
          FROM users u
          ORDER BY u.created_at ASC
        `);
        return rows.map(mapUser);
      } finally {
        connection.release();
      }
    },

    async updateUser(id, input) {
      const connection = await pool.getConnection();
      try {
        const [users] = await connection.query('SELECT * FROM users WHERE id = ?', [id]);
        const current = users[0];
        if (!current) return null;

        const status = input.status || current.status;
        const role = input.role || current.role;

        await connection.query('UPDATE users SET status = ?, role = ? WHERE id = ?', [status, role, id]);

        const allUsers = await this.listUsers();
        return allUsers.find(user => user.id === id);
      } finally {
        connection.release();
      }
    },

    async findUserByEmail(email) {
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
        return rows[0] || null;
      } finally {
        connection.release();
      }
    },

    async createUser(input) {
      const id = publicId('USR');
      const createdAt = now();

      const connection = await pool.getConnection();
      try {
        await connection.query(`
          INSERT INTO users (id, name, email, password_hash, role, status, created_at)
          VALUES (?, ?, ?, ?, 'user', 'active', ?)
        `, [id, input.name, input.email, hashPassword(input.password), createdAt]);

        return mapUser({ id, name: input.name, email: input.email, role: 'user', status: 'active', created_at: createdAt, issues_reported: 0 });
      } finally {
        connection.release();
      }
    },

    async stats() {
      const connection = await pool.getConnection();
      try {
        const [summary] = await connection.query(`
          SELECT
            COUNT(*) AS totalIssues,
            SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS openIssues,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS inProgressIssues,
            SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS resolvedIssues
          FROM issues
        `);

        const [categoryStats] = await connection.query(`
          SELECT category AS name, COUNT(*) AS count
          FROM issues
          GROUP BY category
          ORDER BY count DESC
        `);

        const [monthlyTrends] = await connection.query(`
          SELECT DATE_FORMAT(reported_at, '%Y-%m') AS month,
            COUNT(*) AS reported,
            SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS resolved
          FROM issues
          GROUP BY DATE_FORMAT(reported_at, '%Y-%m')
          ORDER BY month ASC
        `);

        return {
          totalIssues: summary[0]?.totalIssues || 0,
          openIssues: summary[0]?.openIssues || 0,
          inProgressIssues: summary[0]?.inProgressIssues || 0,
          resolvedIssues: summary[0]?.resolvedIssues || 0,
          categoryStats: categoryStats.map(row => ({ name: labels.categories[row.name] || row.name, count: row.count })),
          monthlyTrends
        };
      } finally {
        connection.release();
      }
    }
  };
}

export { pool };
