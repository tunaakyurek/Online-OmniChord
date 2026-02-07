async function loadSongs() {
  const response = await fetch("./data/songs.json");
  if (!response.ok) {
    throw new Error("Songs data could not be loaded.");
  }
  return response.json();
}

function renderSongs(list, songs) {
  list.innerHTML = "";
  for (const [id, song] of Object.entries(songs)) {
    const item = document.createElement("a");
    item.className = "song-card";
    item.href = `./index.html?song=${encodeURIComponent(id)}`;

    const title = document.createElement("span");
    title.className = "song-card__title";
    title.textContent = song.title;

    const meta = document.createElement("span");
    meta.className = "song-card__meta";
    meta.textContent = `${song.meter} • ${song.bpm} BPM`;

    item.appendChild(title);
    item.appendChild(meta);
    list.appendChild(item);
  }
}

async function init() {
  const list = document.getElementById("songs-list");
  const status = document.getElementById("songs-status");
  try {
    const songs = await loadSongs();
    renderSongs(list, songs);
    status.textContent = `${Object.keys(songs).length} songs loaded.`;
  } catch (error) {
    status.textContent = "Songs failed to load.";
  }
}

init();
