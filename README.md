# Career Path Navigator - Full Stack Website

Career Path Navigator is a full-stack web application for students to explore career opportunities using a tree/mindmap based interface.

It includes:

- User register and login
- JWT authentication
- MySQL database
- Career option tree
- Detailed career information
- Mindmap view
- Personalized roadmap
- Save roadmap to database
- Compare two roadmaps
- Chatbot for career doubts
- Download roadmap as PDF using browser print

## Technologies Used

Frontend:

- HTML
- CSS
- JavaScript

Backend:

- Node.js
- Express.js
- JWT Authentication
- bcrypt password hashing

Database:

- MySQL

## Folder Structure

```text
career-path-navigator-fullstack/
  backend/
    server.js
    package.json
    .env.example
    src/
      auth.js
      db.js
    scripts/
      setupDatabase.js
  database/
    schema.sql
    seed.sql
  frontend/
    index.html
    styles.css
    app.js
  README.md
```

## Step 1: Install Required Software

Install these on your laptop:

1. Node.js
2. MySQL Server
3. VS Code

Check Node.js:

```bash
node -v
npm -v
```

Check MySQL:

```bash
mysql --version
```

## Step 2: Open Project Folder

Open terminal or PowerShell and go to the backend folder:

```bash
cd "C:\Users\sanka\Documents\Codex\2026-05-16\files-mentioned-by-the-user-career\career-path-navigator-fullstack\backend"
```

## Step 3: Install Backend Packages

Run:

```bash
npm install
```

This installs Express, MySQL driver, JWT, bcrypt, cors and dotenv.

## Step 4: Create Environment File

In the `backend` folder, copy `.env.example` and rename the copy to `.env`.

Edit `.env`:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=career_path_navigator
JWT_SECRET=career_path_navigator_secret_key
```

Change `DB_PASSWORD` to your MySQL password.

If your MySQL root password is empty, use:

```env
DB_PASSWORD=
```

## Step 5: Setup Database

Make sure MySQL Server is running.

Then run from the `backend` folder:

```bash
npm run setup-db
```

This command will:

- Create database `career_path_navigator`
- Create tables `users`, `career_options`, `roadmaps`
- Insert sample career data

## Step 6: Start Website

Run:

```bash
npm start
```

You should see:

```text
Career Path Navigator running at http://localhost:5000
```

Open this URL in browser:

```text
http://localhost:5000
```

## Step 7: Demo Flow for Sir

1. Open `http://localhost:5000`
2. Register with name, email, password and academic status
3. Click "Create account and start"
4. Open Explore screen
5. Select:
   `After 10th -> Science Stream -> Engineering and Technology -> Computer Science Engineering`
6. Explain that data is coming from MySQL through Express API
7. Open Mindmap screen
8. Open Roadmap PDF screen
9. Click "Download as PDF"
10. Choose "Save as PDF" in browser print dialog
11. Click "Save roadmap"
12. Reset path and explore another path, for example:
    `After 10th -> Science Stream -> Medical and Health Sciences -> MBBS Doctor`
13. Save that roadmap too
14. Open Compare screen and compare both roadmaps
15. Open chatbot and ask:
    `Compare Science and Commerce`

## API Endpoints

Authentication:

```text
POST /api/auth/register
POST /api/auth/login
```

Career:

```text
GET /api/career/stages
GET /api/career/options?parentId=after-10th
GET /api/career/options/:id
GET /api/career/tree/:rootId
```

Roadmaps:

```text
POST /api/roadmaps
GET /api/roadmaps
```

Compare:

```text
POST /api/compare
```

Chatbot:

```text
POST /api/chatbot
```

Health check:

```text
GET /api/health
```

## Common Problems

Problem:

```text
Access denied for user root
```

Fix:

Check your MySQL username/password in `.env`.

Problem:

```text
Cannot find module express
```

Fix:

Run `npm install` inside the `backend` folder.

Problem:

```text
Database setup failed
```

Fix:

Make sure MySQL Server is running and password is correct.

## How to Explain the Project

Say this:

```text
Career Path Navigator is a full-stack career guidance platform.
The frontend allows students to register, login, select academic status and explore career paths.
The backend is built using Node.js and Express.js.
The database is MySQL and stores users, career options and saved roadmaps.
The system supports mindmap exploration, detailed option view, roadmap generation, comparison and chatbot guidance.
```

