# Smart Community Reporting System

Web Application

## Overview
This project is designed to help community members report public issues such as:
- Road damage
- Water supply problems
- Electricity faults
- Illegal dumping
- Security concerns
- Environmental issues

The system enables authorities to review reports, update their status, and provide feedback to citizens.

## Features

- User Registration
- User Login
- Report Community Issues
- Upload Images
- Track Report Status
- Receive Feedback
- Admin Dashboard
- Manage Users
- Manage Reports
- Generate Reports

## Technologies Used

Frontend
- Visual Studio Code (HTML/XML)

Backend
- JavaScript

Database
- SQL

Version Control
- Git & GitHub

## Installation

1. Clone the repository

```bash
git clone https://github.com/FahmySalum/Smart-Community-Reporting-System.git

## Run with XAMPP (MySQL / MariaDB)

1. Start XAMPP and ensure the MySQL (MariaDB) service is running.
2. Copy `.env.example` to `.env` and update values if needed (database credentials).

```powershell
copy .env.example .env
```

3. Import the MySQL schema using phpMyAdmin or the included helper script.

Using phpMyAdmin: log in to http://localhost/phpmyadmin, create a database named `cityreport` and import `server/schema-mysql.sql`.

Or run the helper (Windows / XAMPP) from the `server` folder:

```powershell
cd server
setup-xampp.cmd
```

4. Install Node dependencies and start the server:

```powershell
npm install
npm start
```

5. Open the app at http://localhost:3000

Notes:
- The server reads DB connection settings from environment variables: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`.
- The project includes a MySQL-backed server entrypoint `server/server-mysql.js` and a legacy SQLite server at `server/server.js`.
