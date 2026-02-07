const STORAGE_KEY = "omnichord.customSongs";
const ADMIN_KEY = "omnichord.admin";

async function loadSongs() {
  const response = await fetch("./data/songs.json");
  if (!response.ok) {
    throw new Error("Songs data could not be loaded.");
  }
  return response.json();
}

function loadCustomSongs() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

function saveCustomSongs(songs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs, null, 2));
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseSteps(input) {
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const steps = [];
  for (const line of lines) {
    const parts = line.split(/[,|]/).map((p) => p.trim());
    if (parts.length < 2) {
      throw new Error(`Invalid step: ${line}`);
    }
    const chord = parts[0];
    const beats = Number(parts[1]);
    if (!chord || Number.isNaN(beats) || beats <= 0) {
      throw new Error(`Invalid step: ${line}`);
    }
    steps.push({ chord, beats });
  }
  if (!steps.length) {
    throw new Error("Add at least one chord line.");
  }
  return steps;
}

function renderSongs(list, songs, options = {}) {
  list.innerHTML = "";
  for (const [id, song] of Object.entries(songs)) {
    const card = document.createElement("div");
    card.className = "song-card";

    const link = document.createElement("a");
    link.className = "song-card__link";
    link.href = `./index.html?song=${encodeURIComponent(id)}`;

    const title = document.createElement("span");
    title.className = "song-card__title";
    title.textContent = song.title;

    const meta = document.createElement("span");
    meta.className = "song-card__meta";
    meta.textContent = `${song.meter} • ${song.bpm} BPM`;

    link.appendChild(title);
    link.appendChild(meta);
    card.appendChild(link);

    if (song.__custom && options.allowDelete) {
      const remove = document.createElement("button");
      remove.className = "song-card__remove";
      remove.type = "button";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => options.onRemove?.(id));
      card.appendChild(remove);
    }

    list.appendChild(card);
  }
}

async function init() {
  const list = document.getElementById("songs-list");
  const status = document.getElementById("songs-status");
  const adminSection = document.getElementById("songs-admin");
  const form = document.getElementById("song-form");
  const formStatus = document.getElementById("song-form-status");
  const clearBtn = document.getElementById("song-clear");
  const clearAllBtn = document.getElementById("song-clear-all");
  const exportBtn = document.getElementById("song-export");
  const importInput = document.getElementById("song-import");
  const logoutBtn = document.getElementById("song-logout");

  const isAdmin = localStorage.getItem(ADMIN_KEY) === "1";
  if (adminSection) {
    adminSection.hidden = !isAdmin;
  }
  try {
    const baseSongs = await loadSongs();
    const customSongs = loadCustomSongs();
    const merged = { ...baseSongs };
    for (const [id, song] of Object.entries(customSongs)) {
      merged[id] = { ...song, __custom: true };
    }

    renderSongs(list, merged, {
      allowDelete: isAdmin,
      onRemove: (id) => {
        delete customSongs[id];
        saveCustomSongs(customSongs);
        merged[id].__custom = false;
        delete merged[id];
        renderSongs(list, merged, {
          allowDelete: isAdmin,
          onRemove: (removeId) => {
            delete customSongs[removeId];
            saveCustomSongs(customSongs);
            delete merged[removeId];
            renderSongs(list, merged, { allowDelete: isAdmin, onRemove: null });
          }
        });
      }
    });

    status.textContent = `${Object.keys(merged).length} songs loaded.`;

    if (exportBtn && isAdmin) {
      exportBtn.addEventListener("click", () => {
        const exportData = JSON.stringify(customSongs, null, 2);
        const blob = new Blob([exportData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "custom-songs.json";
        link.click();
        URL.revokeObjectURL(url);
        formStatus.textContent = "Exported custom songs JSON.";
      });
    }

    if (importInput && isAdmin) {
      importInput.addEventListener("change", async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const imported = JSON.parse(text);
          if (typeof imported !== "object" || Array.isArray(imported)) {
            throw new Error("Invalid JSON format.");
          }
          for (const [id, song] of Object.entries(imported)) {
            customSongs[id] = song;
            merged[id] = { ...song, __custom: true };
          }
          saveCustomSongs(customSongs);
          renderSongs(list, merged, {
            allowDelete: true,
            onRemove: (removeId) => {
              delete customSongs[removeId];
              saveCustomSongs(customSongs);
              delete merged[removeId];
              renderSongs(list, merged, { allowDelete: true, onRemove: null });
            }
          });
          status.textContent = `${Object.keys(merged).length} songs loaded.`;
          formStatus.textContent = "Imported custom songs.";
        } catch (error) {
          formStatus.textContent = error.message ?? "Import failed.";
        } finally {
          importInput.value = "";
        }
      });
    }

    if (logoutBtn && isAdmin) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem(ADMIN_KEY);
        window.location.reload();
      });
    }

    if (form && isAdmin) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        try {
          const title = document.getElementById("song-title-input").value.trim();
          const meter = document.getElementById("song-meter").value.trim();
          const bpm = Number(document.getElementById("song-bpm").value);
          const loop = document.getElementById("song-loop").checked;
          const stepsRaw = document.getElementById("song-steps").value;
          const steps = parseSteps(stepsRaw);

          if (!title || !meter || Number.isNaN(bpm)) {
            throw new Error("Fill out title, meter, and BPM.");
          }

          let id = slugify(title);
          if (!id) id = `song-${Date.now()}`;
          let uniqueId = id;
          let i = 1;
          while (merged[uniqueId]) {
            uniqueId = `${id}-${i}`;
            i += 1;
          }

          customSongs[uniqueId] = { title, meter, bpm, steps, loop };
          saveCustomSongs(customSongs);
          merged[uniqueId] = { ...customSongs[uniqueId], __custom: true };
          renderSongs(list, merged, {
            allowDelete: true,
            onRemove: (removeId) => {
              delete customSongs[removeId];
              saveCustomSongs(customSongs);
              delete merged[removeId];
              renderSongs(list, merged, { allowDelete: true, onRemove: null });
            }
          });
          status.textContent = `${Object.keys(merged).length} songs loaded.`;
          form.reset();
          document.getElementById("song-bpm").value = "96";
          document.getElementById("song-loop").checked = true;
          formStatus.textContent = "Song saved locally.";
        } catch (error) {
          formStatus.textContent = error.message ?? "Could not save song.";
        }
      });
    }

    if (clearBtn && form) {
      clearBtn.addEventListener("click", () => {
        form.reset();
        document.getElementById("song-bpm").value = "96";
        document.getElementById("song-loop").checked = true;
        formStatus.textContent = "";
      });
    }

    if (clearAllBtn && isAdmin) {
      clearAllBtn.addEventListener("click", () => {
        saveCustomSongs({});
        for (const key of Object.keys(merged)) {
          if (merged[key].__custom) {
            delete merged[key];
          }
        }
        renderSongs(list, merged, { allowDelete: false, onRemove: null });
        status.textContent = `${Object.keys(merged).length} songs loaded.`;
        formStatus.textContent = "All custom songs removed.";
      });
    }
  } catch (error) {
    status.textContent = "Songs failed to load.";
  }
}

init();
