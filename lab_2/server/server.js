const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, "..", "data", "db.json");
const sessions = new Map();

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://127.0.0.1:5173");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

function readDb() {
  const text = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(text);
}

function writeDb(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function createToken() {
  return crypto.randomUUID();
}

function getNextId(items) {
  let maxId = 0;

  for (const item of items) {
    if (item.id > maxId) {
      maxId = item.id;
    }
  }

  return maxId + 1;
}

function getTokenFromRequest(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return "";
  }

  return header.slice(7);
}

function requireAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  const userId = sessions.get(token);

  if (!userId) {
    res.status(401).json({ message: "Потрібна авторизація." });
    return;
  }

  const db = readDb();
  const user = db.users.find((item) => item.id === userId);

  if (!user) {
    res.status(401).json({ message: "Користувача не знайдено." });
    return;
  }

  req.user = {
    id: user.id,
    name: user.name,
    username: user.username
  };

  next();
}

function getPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username
  };
}

function getFilteredArticles(db, query) {
  const search = (query.search || "").toLowerCase().trim();
  const category = (query.category || "").trim();

  return db.articles
    .filter((article) => {
      const matchesCategory = category === "" || category === "Усі" || article.category === category;
      const articleText = [
        article.title,
        article.content,
        article.category,
        article.authorName
      ].join(" ").toLowerCase();
      const matchesSearch = search === "" || articleText.includes(search);

      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/categories", (req, res) => {
  const db = readDb();
  res.json(db.categories);
});

app.get("/api/articles", (req, res) => {
  const db = readDb();
  res.json(getFilteredArticles(db, req.query));
});

app.post("/api/articles", requireAuth, (req, res) => {
  const title = String(req.body.title || "").trim();
  const content = String(req.body.content || "").trim();
  const category = String(req.body.category || "").trim();

  if (title === "" || content === "" || category === "") {
    res.status(400).json({ message: "Заповніть назву, категорію та текст статті." });
    return;
  }

  const db = readDb();
  const article = {
    id: getNextId(db.articles),
    title,
    category,
    content,
    authorId: req.user.id,
    authorName: req.user.name,
    createdAt: new Date().toISOString(),
    comments: []
  };

  if (!db.categories.includes(category)) {
    db.categories.push(category);
  }

  db.articles.push(article);
  writeDb(db);

  res.status(201).json(article);
});

app.post("/api/articles/:id/comments", requireAuth, (req, res) => {
  const articleId = Number(req.params.id);
  const text = String(req.body.text || "").trim();

  if (text === "") {
    res.status(400).json({ message: "Коментар не може бути порожнім." });
    return;
  }

  const db = readDb();
  const article = db.articles.find((item) => item.id === articleId);

  if (!article) {
    res.status(404).json({ message: "Статтю не знайдено." });
    return;
  }

  const comment = {
    id: getNextId(article.comments),
    text,
    authorId: req.user.id,
    authorName: req.user.name,
    createdAt: new Date().toISOString()
  };

  article.comments.push(comment);
  writeDb(db);

  res.status(201).json(comment);
});

app.post("/api/register", (req, res) => {
  const name = String(req.body.name || "").trim();
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (name === "" || username === "" || password === "") {
    res.status(400).json({ message: "Заповніть ім'я, логін і пароль." });
    return;
  }

  const db = readDb();
  const userExists = db.users.some((user) => user.username.toLowerCase() === username.toLowerCase());

  if (userExists) {
    res.status(409).json({ message: "Користувач із таким логіном уже існує." });
    return;
  }

  const user = {
    id: getNextId(db.users),
    name,
    username,
    passwordHash: hashPassword(password)
  };

  db.users.push(user);
  writeDb(db);

  const token = createToken();
  sessions.set(token, user.id);

  res.status(201).json({
    token,
    user: getPublicUser(user)
  });
});

app.post("/api/login", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const db = readDb();
  const user = db.users.find((item) => item.username.toLowerCase() === username.toLowerCase());

  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ message: "Неправильний логін або пароль." });
    return;
  }

  const token = createToken();
  sessions.set(token, user.id);

  res.json({
    token,
    user: getPublicUser(user)
  });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json(req.user);
});

app.post("/api/logout", requireAuth, (req, res) => {
  const token = getTokenFromRequest(req);
  sessions.delete(token);
  res.json({ message: "Вихід виконано." });
});

const distPath = path.join(__dirname, "..", "dist");

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server started: http://127.0.0.1:${PORT}`);
});
