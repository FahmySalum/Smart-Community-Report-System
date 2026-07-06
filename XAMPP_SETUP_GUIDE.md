# XAMPP Setup Guide - Smart Community Report System

## Prerequisites
- XAMPP installed and running
- Node.js installed (v16 or higher)
- npm or yarn package manager

## Step 1: Start XAMPP

1. Open XAMPP Control Panel
2. Start **Apache** (optional - only if you need web server)
3. Start **MySQL** - CRITICAL! Must be running for the application
4. Verify MySQL is running on port 3306

## Step 2: Create the Database

### Option A: Using phpMyAdmin (Easy)
1. Open browser and go to `http://localhost/phpmyadmin`
2. Click on "SQL" tab
3. Copy the entire contents of `server/schema-mysql.sql`
4. Paste it into the SQL editor
5. Click "Go" to execute
6. The database `cityreport` will be created with all tables

### Option B: Using MySQL Command Line
1. Open Command Prompt or PowerShell
2. Navigate to the project directory
3. Run the following command:
   ```bash
   mysql -u root -p < server/schema-mysql.sql
   ```
4. Press Enter (no password needed if XAMPP default settings)

## Step 3: Install Node.js Dependencies

1. Open Command Prompt or PowerShell
2. Navigate to the project directory: `cd c:\Users\FAHMY\Downloads\Smart-Community-Report-System`
3. Run:
   ```bash
   npm install
   ```
4. Wait for all packages to install (mysql2 is the main dependency added)

## Step 4: Configure Environment (Optional)

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```
2. Edit `.env` if you have non-default XAMPP settings:
   - `DB_HOST`: localhost (or your MySQL host)
   - `DB_USER`: root (or your MySQL username)
   - `DB_PASSWORD`: (leave empty if using XAMPP default)
   - `DB_NAME`: cityreport
   - `DB_PORT`: 3306 (XAMPP MySQL port)

## Step 5: Start the Application

1. Open Command Prompt or PowerShell
2. Navigate to project directory
3. Run:
   ```bash
   npm start
   ```
4. You should see:
   ```
   Initializing database...
   Database initialized successfully
   Server running at http://localhost:3000
   ```

## Step 6: Access the Application

- Open browser and go to: `http://localhost:3000`
- You should see the Smart Community Report System homepage

## Test Login Credentials

After the database is initialized, use these credentials:

**Admin Account:**
- Email: `1@1.com`
- Password: `123`

**Regular User Account:**
- Email: `john.doe@email.com`
- Password: `password`

## Verification Checklist

✓ XAMPP MySQL is running (green indicator in Control Panel)
✓ Database created (check in phpMyAdmin)
✓ Node.js dependencies installed (node_modules folder exists)
✓ `.env` file exists with correct database credentials
✓ Server started successfully on port 3000
✓ Can access http://localhost:3000 in browser
✓ Can login with test credentials

## Troubleshooting

### "Port 3000 already in use"
- Change PORT in `.env` to another port (e.g., 3001, 3002)
- Or kill the process using port 3000

### "Connection refused" or "MySQL error"
- Verify MySQL is running in XAMPP Control Panel
- Check database credentials in `.env`
- Try running schema again in phpMyAdmin

### "Module not found: mysql2"
- Run `npm install` again
- Delete `node_modules` folder and reinstall: `npm install`

### Database not seeding
- Check if tables were created in phpMyAdmin
- Manually run schema-mysql.sql again
- Verify no existing data conflicts

### Server won't start
- Check if port 3000 is available
- Look for error messages in console
- Try restarting XAMPP

## Important Files

- `server/server-mysql.js` - Main server entry point
- `server/database-mysql.js` - MySQL database configuration and queries
- `server/schema-mysql.sql` - Database schema
- `.env` - Database credentials (create from .env.example)
- `package.json` - Node dependencies

## Next Steps

After setup is complete:
1. Visit http://localhost:3000
2. Browse existing community issues
3. Create new issues to report problems
4. Test admin features by logging in as admin
5. Check database data in phpMyAdmin to verify everything works

## Stopping the Application

Press `Ctrl+C` in the command prompt to stop the Node.js server.

To stop XAMPP MySQL:
1. Open XAMPP Control Panel
2. Click "Stop" next to MySQL
3. Close the Control Panel

---

**Enjoy using Smart Community Report System on XAMPP!**
