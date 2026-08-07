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

  document.getElementById("posts").innerHTML = data
    .map(
      p => `
      <div class="post">
        <h2>${escapeHtml(p.title)}</h2>
        <p>${escapeHtml(p.content)}</p>

        <button onclick="deletePost(${p.id})">Löschen</button>
        <button onclick="editPost(${p.id}, ${JSON.stringify(p.title)}, ${JSON.stringify(p.content)})">Bearbeiten</button>
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
}

// Beim Laden der Seite Beiträge anzeigen
window.addEventListener("DOMContentLoaded", loadPosts);
