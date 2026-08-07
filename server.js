console.log("Server startet...");


const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const db = new sqlite3.Database("database.sqlite");

// Tabelle erstellen
db.run(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT
  )
`);

// Alle Posts lesen
app.get("/api/posts", (req, res) => {
  db.all("SELECT * FROM posts", (err, rows) => {
    res.json(rows);
  });
});

// Post erstellen
app.post("/api/posts", (req, res) => {
  const { title, content } = req.body;
  db.run(
    "INSERT INTO posts (title, content) VALUES (?, ?)",
    [title, content],
    function () {
      res.json({ id: this.lastID, title, content });
    }
  );
});

// Post aktualisieren
app.put("/api/posts/:id", (req, res) => {
  const { title, content } = req.body;
  db.run(
    "UPDATE posts SET title = ?, content = ? WHERE id = ?",
    [title, content, req.params.id],
    () => res.json({ id: req.params.id, title, content })
  );
});

// Post löschen
app.delete("/api/posts/:id", (req, res) => {
  db.run("DELETE FROM posts WHERE id = ?", req.params.id, () => {
    res.json({ success: true });
  });
});

app.listen(3000, () => console.log("Forum läuft auf http://localhost:3000"));
