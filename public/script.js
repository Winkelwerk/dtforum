async function loadPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("id", { ascending: false });

  if (error) console.error(error);

  document.getElementById("posts").innerHTML = data
    .map(
      p => `
      <div class="post">
        <h2>${p.title}</h2>
        <p>${p.content}</p>

        <button onclick="deletePost(${p.id})">Löschen</button>
        <button onclick="editPost(${p.id}, '${p.title}', '${p.content}')">Bearbeiten</button>
      </div>
    `
    )
    .join("");
}


async function createPost() {
  const title = document.getElementById("title").value;
  const content = document.getElementById("content").value;

  const { error } = await supabase
    .from("posts")
    .insert([{ title, content }]);

  if (error) console.error(error);

  loadPosts();
}


async function deletePost(id) {
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id);

  if (error) console.error(error);

  loadPosts();
}


async function editPost(id, oldTitle, oldContent) {
  const title = prompt("Neuer Titel:", oldTitle);
  const content = prompt("Neuer Inhalt:", oldContent);

  const { error } = await supabase
    .from("posts")
    .update({ title, content })
    .eq("id", id);

  if (error) console.error(error);

  loadPosts();
}
