const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const pool = require("./src/db");
const { createToken, authRequired } = require("./src/auth");

const app = express();
const PORT = process.env.PORT || 5000;
const frontendPath = path.join(__dirname, "../frontend");
app.use(cors());
app.use(express.json({
  limit: "1mb",
  verify(req, res, buf) {
    req.rawBody = buf.toString();
  }
}));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Invalid JSON payload for', req.method, req.url, 'from', req.ip);
    console.error('Content-Type:', req.headers['content-type']);
    console.error('Raw body length:', req.rawBody ? req.rawBody.length : 0);
    console.error('Raw body:', req.rawBody);
    return res.status(400).json({ message: 'Invalid JSON payload' });
  }
  next(err);
});

app.use(express.static(frontendPath));

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function optionRow(row) {
  return {
    id: row.id,
    parentId: row.parent_id,
    title: row.title,
    short: row.short_description,
    summary: row.summary,
    duration: row.duration,
    cost: row.cost,
    difficulty: row.difficulty,
    scope: row.scope,
    eligibility: parseJson(row.eligibility, []),
    skills: parseJson(row.skills, []),
    opportunities: parseJson(row.opportunities, [])
  };
}

async function getOption(id) {
  const [rows] = await pool.query("SELECT * FROM career_options WHERE id = ?", [id]);
  return rows[0] ? optionRow(rows[0]) : null;
}

async function getChildren(parentId) {
  const [rows] = await pool.query(
    "SELECT * FROM career_options WHERE parent_id <=> ? ORDER BY display_order, title",
    [parentId || null]
  );
  return rows.map(optionRow);
}

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, academicStatus, city, goal } = req.body;
    if (!name || !email || !password || !academicStatus) {
      return res.status(400).json({ message: "Name, email, password and academic status are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash, academic_status, city, goal) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, hashedPassword, academicStatus, city || "", goal || ""]
    );

    const user = { id: result.insertId, name, email, academicStatus, city, goal };
    res.status(201).json({ user, token: createToken(user) });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email already registered. Please login." });
    }
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    const userRow = rows[0];

    const passwordMatches = userRow && (
      (userRow.password_hash && await bcrypt.compare(password, userRow.password_hash)) ||
      (!userRow.password_hash && userRow.password && password === userRow.password)
    );

    if (!userRow || !passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      academicStatus: userRow.academic_status || userRow.academic_stage,
      city: userRow.city || "",
      goal: userRow.goal || ""
    };
    res.json({ user, token: createToken(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/career/stages", async (_req, res) => {
  const stages = await getChildren(null);
  res.json(stages);
});

app.get("/api/career/options", async (req, res) => {
  const options = await getChildren(req.query.parentId || null);
  res.json(options);
});

app.get("/api/career/options/:id", async (req, res) => {
  const option = await getOption(req.params.id);
  if (!option) return res.status(404).json({ message: "Career option not found" });
  const children = await getChildren(req.params.id);
  res.json({ ...option, children });
});

app.get("/api/career/tree/:rootId", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM career_options ORDER BY display_order, title");
  const all = rows.map(optionRow);
  const byParent = new Map();
  all.forEach((item) => {
    const key = item.parentId || "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(item);
  });

  function build(id) {
    const node = all.find((item) => item.id === id);
    if (!node) return null;
    return { ...node, children: (byParent.get(id) || []).map((child) => build(child.id)).filter(Boolean) };
  }

  const tree = build(req.params.rootId);
  if (!tree) return res.status(404).json({ message: "Root option not found" });
  res.json(tree);
});

app.post("/api/roadmaps", authRequired, async (req, res) => {
  try {
    const { title, pathIds, finalOptionId } = req.body;
    if (!Array.isArray(pathIds) || !finalOptionId) {
      return res.status(400).json({ message: "pathIds and finalOptionId are required" });
    }

    const finalOption = await getOption(finalOptionId);
    if (!finalOption) return res.status(404).json({ message: "Final option not found" });

    const roadmapTitle = title || pathIds.join(" -> ");
    const [result] = await pool.query(
      "INSERT INTO roadmaps (user_id, title, path_ids, final_option_id) VALUES (?, ?, ?, ?)",
      [req.user.id, roadmapTitle, JSON.stringify(pathIds), finalOptionId]
    );

    res.status(201).json({ id: result.insertId, title: roadmapTitle, pathIds, finalOption });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/roadmaps", authRequired, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT r.*, c.title AS final_title FROM roadmaps r JOIN career_options c ON c.id = r.final_option_id WHERE r.user_id = ? ORDER BY r.created_at DESC",
    [req.user.id]
  );
  res.json(rows.map((row) => ({
    id: row.id,
    title: row.title,
    pathIds: parseJson(row.path_ids, []),
    finalOptionId: row.final_option_id,
    finalTitle: row.final_title,
    createdAt: row.created_at
  })));
});

app.post("/api/compare", async (req, res) => {
  const { optionA, optionB } = req.body;
  const a = await getOption(optionA);
  const b = await getOption(optionB);
  if (!a || !b) return res.status(404).json({ message: "Both career options are required" });
  res.json({
    a,
    b,
    factors: [
      { label: "Duration", a: a.duration, b: b.duration },
      { label: "Cost", a: a.cost, b: b.cost },
      { label: "Difficulty", a: a.difficulty, b: b.difficulty },
      { label: "Scope", a: a.scope, b: b.scope },
      { label: "Skills", a: a.skills.join(", "), b: b.skills.join(", ") },
      { label: "Opportunities", a: a.opportunities.join(", "), b: b.opportunities.join(", ") }
    ]
  });
});

app.post("/api/chatbot", async (req, res) => {
  console.debug('Chatbot payload:', req.body);
  const questionRaw = req.body && (req.body.question || req.body.q || req.body.message || req.body.prompt || "");
  const question = String(questionRaw || "").trim();
  const lower = question.toLowerCase();
  console.debug('Normalized question:', lower);

  if (!lower) {
    return res.json({ answer: "Please type your question and ask about career paths, roadmap PDF, saving roadmaps or comparing options." });
  }

  let answer = "I can help with career paths, roadmap saving, PDF download, and comparisons. Ask about after 10th, after 12th, engineering, medical, commerce, or roadmap options.";

  if (lower.includes("after 10") || lower.includes("10th")) {
    answer = "After 10th, the main options are Science, Commerce, Arts, Diploma/Polytechnic, ITI, vocational courses, defence, government jobs, agriculture, business, digital careers, open schooling and apprenticeships.";
  } else if (lower.includes("after 12") || lower.includes("12th")) {
    answer = "After 12th, students can pursue degree programs, professional courses, entrance exams, government job preparation, skill-training, or entrepreneurship.";
  } else if (lower.includes("diploma") || lower.includes("polytechnic") || lower.includes("iti")) {
    answer = "Diploma and ITI paths are good for technical skills, practical jobs, apprenticeships, and later entry into engineering or industry roles.";
  } else if (lower.includes("science") && lower.includes("commerce")) {
    answer = "Science leads to engineering, medical, research, and technology. Commerce leads to CA, CS, finance, banking, business, management and analytics.";
  } else if (lower.includes("science")) {
    answer = "Science is ideal for engineering, medical, research, IT and technical careers. It requires strong maths, physics, and in many cases biology.";
  } else if (lower.includes("commerce")) {
    answer = "Commerce is ideal for accounting, finance, business, management, CA, CS, and analytics. It suits students interested in business and economics.";
  } else if (lower.includes("engineering") || lower.includes("coding") || lower.includes("programming")) {
    answer = "Engineering and coding require maths, logical thinking, problem solving and projects. Popular options include CSE, IT, ECE, AI/Data Science and software development.";
  } else if (lower.includes("medical") || lower.includes("doctor") || lower.includes("neet")) {
    answer = "Medical requires 12th Science with Biology and usually NEET for MBBS. It is competitive, but leads to strong healthcare and research careers.";
  } else if (lower.includes("earn") || lower.includes("job") || lower.includes("income")) {
    answer = "For early earning, consider vocational training, ITI, diploma, apprenticeships, freelancing, retail/repair services, or government 10th-pass exams.";
  } else if (lower.includes("pdf") || lower.includes("roadmap")) {
    answer = "Open the Roadmap PDF screen after choosing a path, then click Download as PDF. In the print dialog, choose Save as PDF.";
  } else if (lower.includes("save") || lower.includes("roadmaps") || lower.includes("save roadmap")) {
    answer = "You can save your selected career path as a roadmap once a final option is selected. Saved roadmaps can be compared later in the Compare screen.";
  } else if (lower.includes("compare")) {
    answer = "Use the Compare screen to select two saved roadmaps and compare duration, cost, difficulty, scope, skills and opportunities side by side.";
  }

  res.json({ answer });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Career Path Navigator running at http://localhost:${PORT}`);
});
