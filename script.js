// Hilfsfunktion: HTML-Entities escapen (verhindert einfache XSS beim Insert ins DOM)
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Utility to truncate long text
function truncate(str, n = 140) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

async function loadPosts() {
  // supabase-Client ist jetzt als window.supabase verfügbar
  const { data, error } = await window.supabase
    .from("posts")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Fehler beim Laden der Beiträge:", error);
    document.getElementById("posts").innerHTML = "<p>Fehler beim Laden der Beiträge.</p>";
    return;
  }

  if (!data || data.length === 0) {
    document.getElementById("posts").innerHTML = "<p>Keine Beiträge.</p>";
    return;
  }

  // Fetch comment counts for the loaded posts (client-side aggregation)
  const postIds = data.map(p => p.id);
  let commentCounts = {};
  if (postIds.length > 0) {
    const { data: commentsForPosts, error: cErr } = await window.supabase
      .from("comments")
      .select("post_id")
      .in("post_id", postIds);

    if (cErr) {
      console.warn("Fehler beim Laden der Kommentarzählungen:", cErr);
    } else {
      (commentsForPosts || []).forEach(c => {
        commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;
      });
    }
  }

  document.getElementById("posts").innerHTML = data
    .map(
      p => `
      <div class="post" data-id="${p.id}">
        <h2>${escapeHtml(p.title)} <small style="font-size:12px;color:#ccc">#${p.id}</small></h2>
        <p>${escapeHtml(p.content)}</p>

        <div style="margin-top:8px;">
          <button onclick="deletePost(${p.id})">Löschen</button>
          <button onclick="editPost(${p.id}, ${JSON.stringify(p.title)}, ${JSON.stringify(p.content)})">Bearbeiten</button>
          <button onclick="scrollToPost(${p.id}); return false;">Anzeigen</button>
          <span style="margin-left:8px;color:#ccc">${(commentCounts[p.id] || 0)} Kommentare</span>
        </div>
      </div>
    `
    )
    .join("");
}

async function createPost() {
  const title = document.getElementById("title").value;
  const content = document.getElementById("content").value;

  if (!title && !content) {
    alert("Bitte Titel oder Inhalt eingeben.");
    return;
  }

  const { error } = await window.supabase
    .from("posts")
    .insert([{ title, content }]);

  if (error) {
    console.error("Fehler beim Erstellen:", error);
    alert("Fehler beim Erstellen des Beitrags.");
    return;
  }

  // Formular zurücksetzen und Beiträge neu laden
  document.getElementById("title").value = "";
  document.getElementById("content").value = "";
  await loadPosts();
  await loadCommentsOverview();
}

async function deletePost(id) {
  if (!confirm("Beitrag wirklich löschen?")) return;

  const { error } = await window.supabase
    .from("posts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Fehler beim Löschen:", error);
    alert("Fehler beim Löschen des Beitrags.");
    return;
  }

  await loadPosts();
  await loadCommentsOverview();
}

async function editPost(id, oldTitle, oldContent) {
  const title = prompt("Neuer Titel:", oldTitle);
  if (title === null) return; // Abbrechen
  const content = prompt("Neuer Inhalt:", oldContent);
  if (content === null) return;

  const { error } = await window.supabase
    .from("posts")
    .update({ title, content })
    .eq("id", id);

  if (error) {
    console.error("Fehler beim Aktualisieren:", error);
    alert("Fehler beim Aktualisieren des Beitrags.");
    return;
  }

  await loadPosts();
  await loadCommentsOverview();
}

// Load recent comments and top commented posts
async function loadCommentsOverview() {
  const overviewEl = document.getElementById("comments-overview");
  const topEl = document.getElementById("top-posts");

  if (!overviewEl || !topEl) return;

  // Fetch recent comments (most recent 10)
  const { data: recentComments, error: err1 } = await window.supabase
    .from("comments")
    .select("id, post_id, author, content, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (err1) {
    console.error("Fehler beim Laden der Kommentare:", err1);
    overviewEl.innerHTML = "<p>Fehler beim Laden.</p>";
  } else if (!recentComments || recentComments.length === 0) {
    overviewEl.innerHTML = "<p>Keine Kommentare.</p>";
  } else {
    overviewEl.innerHTML = recentComments
      .map(c => `
        <div class="comment-item">
          <div class="meta">${escapeHtml(c.author || "Anonym")} • ${new Date(c.created_at).toLocaleString()}</div>
          <div class="text">${escapeHtml(truncate(c.content, 140))}</div>
          <div style="margin-top:6px;"><a href="#" onclick="scrollToPost(${c.post_id});return false;">Zum Beitrag</a></div>
        </div>
      `).join("");
  }

  // Fetch counts for top posts
  const { data: allComments, error: err2 } = await window.supabase
    .from("comments")
    .select("post_id");

  if (err2) {
    console.error("Fehler beim Laden der Kommentarstatistiken:", err2);
    topEl.innerHTML = "<p>Fehler beim Laden.</p>";
  } else {
    const counts = {};
    (allComments || []).forEach(c => { counts[c.post_id] = (counts[c.post_id] || 0) + 1; });
    const tops = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    if (tops.length === 0) {
      topEl.innerHTML = "<p>Keine Kommentare vorhanden.</p>";
    } else {
      const postIds = tops.map(t => Number(t[0]));
      const { data: postsData } = await window.supabase
        .from("posts")
        .select("id, title")
        .in("id", postIds);

      const postsById = {};
      (postsData || []).forEach(p => postsById[p.id] = p.title);

      topEl.innerHTML = tops.map(([pid, cnt]) => `
        <div class="top-post">
          <a href="#" onclick="scrollToPost(${pid});return false;">${escapeHtml(postsById[pid] || 'Beitrag #' + pid)}</a>
          <span class="count">${cnt}</span>
        </div>
      `).join("");
    }
  }
}

// Scroll helper: find post element and focus/scroll to it
function scrollToPost(postId) {
  const postEl = document.querySelector(`#posts .post[data-id="${postId}"]`);
  if (postEl) {
    postEl.scrollIntoView({ behavior: "smooth", block: "center" });
    postEl.style.boxShadow = "0 0 0 3px rgba(255,204,0,0.15)";
    setTimeout(() => postEl.style.boxShadow = "", 2200);
  } else {
    loadPosts().then(() => {
      const el = document.querySelector(`#posts .post[data-id="${postId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        alert("Beitrag nicht gefunden (möglicherweise entfernt).");
      }
    });
  }
}

// Beim Laden der Seite Beiträge und Kommentare anzeigen
window.addEventListener("DOMContentLoaded", async () => {
  await loadPosts();
  await loadCommentsOverview();
});
