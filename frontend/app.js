/* ==================================
   WILD LENS - SHARED USER JS
   Used by: user-dashboard, detect, history, species, profile
================================== */

const API_URL = "/detect";

// The five official target species. `match` is matched against the model's class name,
// so "Bengal_Tiger", "bengal tiger" etc. all resolve to the same entry.
const SPECIES = [
  { match: "tiger", name: "Bengal Tiger", status: "Endangered" },
  { match: "rhino", name: "One-horned Rhinoceros", status: "Vulnerable" },
  { match: "leopard", name: "Snow Leopard", status: "Vulnerable" },
  { match: "panda", name: "Red Panda", status: "Endangered" },
  { match: "elephant", name: "Asian Elephant", status: "Endangered" },
];

const NAV = [
  {
    href: "user-dashboard.html",
    icon: "fa-house",
    label: "Dashboard",
    page: "dashboard",
  },
  {
    href: "detect.html",
    icon: "fa-camera",
    label: "AI Detection",
    page: "detect",
  },
  {
    href: "history.html",
    icon: "fa-clock-rotate-left",
    label: "History",
    page: "history",
  },
  { href: "species.html", icon: "fa-paw", label: "Species", page: "species" },
  { href: "profile.html", icon: "fa-user", label: "Profile", page: "profile" },
];

/* ---------- helpers ---------- */

async function fetchHistory() {
  const res = await fetch("/api/history");
  if (res.status === 401) {
    window.location.href = "login.html";
    return [];
  }
  return (await res.json()).items || [];
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

function speciesDisplayName(raw) {
  const lower = String(raw || "").toLowerCase();
  const found = SPECIES.find((s) => lower.includes(s.match));
  return found ? found.name : String(raw || "").replace(/_/g, " ");
}

function initialsOf(name) {
  const parts = String(name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2);
  return parts.map((p) => p[0].toUpperCase()).join("");
}

async function logout() {
  try {
    await fetch("/api/logout", { method: "POST" });
  } catch (e) {}
  localStorage.removeItem("currentUser");
  sessionStorage.setItem(
    "flash",
    JSON.stringify({ msg: "Logged out successfully", type: "success" }),
  );
  window.location.href = "login.html";
}

/* ---------- shell: sidebar + topbar ---------- */

function renderSidebar(activePage) {
  const el = document.getElementById("sidebar");
  if (!el) return;
  el.innerHTML = `
    <div class="logo">
      <h2>🌿 Wild<span>Lens</span></h2>
      <p>Wildlife AI System</p>
    </div>
    <ul>
      ${NAV.map(
        (n) => `
        <li class="${n.page === activePage ? "active" : ""}">
          <a href="${n.href}"><i class="fa-solid ${n.icon}"></i><span>${n.label}</span></a>
        </li>`,
      ).join("")}
      <li>
        <a href="#" id="logoutLink"><i class="fa-solid fa-right-from-bracket"></i><span>Logout</span></a>
      </li>
    </ul>`;
  document.getElementById("logoutLink").addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });
}

function renderTopbar(user) {
  const el = document.getElementById("topbar");
  if (!el) return;
  const name = escapeHtml(user.name || "User");
  const title = (document.body.dataset.title || "").replace(
    "{name}",
    `<span>${name}</span>`,
  );
  const sub = document.body.dataset.sub || "";
  const role = user.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "User";
  el.innerHTML = `
    <div class="welcome">
      <h1>${title}</h1>
      <p>${escapeHtml(sub)}</p>
    </div>
    <div class="profile">
      <div class="avatar">${escapeHtml(initialsOf(user.name))}</div>
      <div>
        <h4>${name}</h4>
        <p>${escapeHtml(role)}</p>
      </div>
    </div>`;
}

/* ---------- history cards ---------- */
function formatDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleString();
}

function historyCardHtml(item, withDelete) {
  return `
    <div class="history-card">
      <img src="${item.image}" alt="">
      <div class="history-info">
        <h3>${escapeHtml(item.species)}</h3>
        <p><i class="fa-solid fa-bullseye"></i>Confidence: ${escapeHtml(item.confidence)}%</p>
        <p><i class="fa-solid fa-calendar"></i>${escapeHtml(formatDate(item.date))}</p>
        ${withDelete ? `<button class="delete-history" data-delete="${item.id}">Remove</button>` : ""}
      </div>
    </div>`;
}

function renderHistoryInto(container, items, withDelete, emptyText) {
  if (!container) return;
  if (items.length === 0) {
    container.innerHTML = `<p class="empty-note">${emptyText}</p>`;
    return;
  }
  container.innerHTML = items
    .map((i) => historyCardHtml(i, withDelete))
    .join("");
}

/* ---------- page: dashboard ---------- */

async function initDashboard(user) {
  const mine = (await fetchHistory()).reverse(); // reverse keeps the old oldest-first order
  const wildlife = mine.filter((d) => d.label === "wildlife");
  const blank = mine.filter((d) => d.label === "blank");

  const set = (id, v) => {
    const e = document.getElementById(id);
    if (e) e.textContent = v;
  };
  set("totalScan", mine.length);
  set("wildlifeCount", wildlife.length);
  set("blankCount", blank.length);
  set(
    "speciesCount",
    new Set(wildlife.map((d) => speciesDisplayName(d.species))).size,
  );

  // species breakdown
  const bd = document.getElementById("speciesBreakdown");
  if (bd) {
    const counts = SPECIES.map((s) => ({
      name: s.name,
      n: wildlife.filter((d) => speciesDisplayName(d.species) === s.name)
        .length,
    }));
    const max = Math.max(1, ...counts.map((c) => c.n));
    bd.innerHTML = counts
      .map(
        (c) => `
      <div class="breakdown-row">
        <div class="b-name">${c.name}</div>
        <div class="b-bar"><div class="b-fill" style="width:${(c.n / max) * 100}%"></div></div>
        <div class="b-count">${c.n}</div>
      </div>`,
      )
      .join("");
  }

  // recent 3
  const recent = mine.slice().reverse().slice(0, 3);
  renderHistoryInto(
    document.getElementById("recentContainer"),
    recent,
    false,
    "No detections yet. Go to AI Detection to upload your first image.",
  );
}

/* ---------- page: history ---------- */

async function initHistory(user) {
  const container = document.getElementById("historyContainer");
  const filter = document.getElementById("historyFilter");
  const countEl = document.getElementById("historyCount");
  let all = await fetchHistory(); // newest first

  function draw() {
    let items = all;
    const f = filter ? filter.value : "all";
    if (f !== "all") items = items.filter((d) => d.label === f);
    if (countEl)
      countEl.textContent =
        items.length + (items.length === 1 ? " record" : " records");
    renderHistoryInto(container, items, true, "No records to show.");
  }

  if (filter) filter.addEventListener("change", draw);
  if (container) {
    container.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-delete]");
      if (!btn) return;
      const ok = await showConfirm(
        "Remove this record from your history?",
        "Remove",
        true,
      );
      if (!ok) return;
      const res = await fetch("/api/history/" + btn.dataset.delete, {
        method: "DELETE",
      });
      if (!res.ok) return showToast("Could not remove the record", "error");
      all = all.filter((d) => d.id !== Number(btn.dataset.delete));
      draw();
      showToast("Removed from history");
    });
  }
  draw();
}

/* ---------- page: species ---------- */

function initSpecies() {
  const grid = document.getElementById("speciesGrid");
  if (!grid) return;
  grid.innerHTML = SPECIES.map(
    (s) => `
    <div class="species-card">
      <i class="fa-solid fa-paw"></i>
      <h3>${s.name}</h3>
      <span class="status-badge ${s.status.toLowerCase()}">${s.status}</span>
    </div>`,
  ).join("");
}

/* ---------- page: profile ---------- */

function initProfile(user) {
  const set = (id, v) => {
    const e = document.getElementById(id);
    if (e) e.textContent = v;
  };
  set("profileFullName", user.name || "User");
  set("profileEmail", user.email || "");
  set(
    "profileRole",
    user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "User",
  );
  fetchHistory().then((items) => set("profileScans", items.length));
  const av = document.getElementById("profileAvatar");
  if (av) av.textContent = initialsOf(user.name);
}

/* ---------- page: detect ---------- */

function initDetect(user) {
  const imageInput = document.getElementById("imageInput");
  if (!imageInput) return;

  const previewImage = document.getElementById("previewImage");
  const previewText = document.getElementById("previewText");
  const detectBtn = document.getElementById("detectBtn");
  const removeBtn = document.getElementById("removeBtn");
  const uploadArea = document.getElementById("uploadArea");
  const batchBox = document.getElementById("batchResults");
  const previewDefault = previewText.innerHTML;
  const resultSection = document.getElementById("resultSection");
  if (resultSection && batchBox && batchBox.parentElement !== resultSection) {
    resultSection.appendChild(batchBox); // table now lives inside the result container
  }

  // single = true: show the one-image card; false: hide it (batch table only)
  const resultCard = resultSection
    ? resultSection.querySelector(".result-card")
    : null;

  function showSingleMode(single) {
    if (resultCard) resultCard.style.display = single ? "" : "none";
    if (single && batchBox) batchBox.innerHTML = "";
  }

  let uploadedImage = "";
  let selectedFile = null;
  let batchFiles = [];
  let resetTimer = null;

  function resetDetectBtn() {
    detectBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Start Detection`;
  }

  function clearPreview() {
    uploadedImage = "";
    selectedFile = null;
    batchFiles = [];
    previewImage.src = "";
    previewImage.style.display = "none";
    previewText.innerHTML = previewDefault;
    previewText.style.display = "block";
    imageInput.value = "";
    detectBtn.disabled = true;
    resetDetectBtn();
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    clearTimeout(resetTimer);
    batchFiles = [];
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImage = e.target.result;
      previewImage.src = uploadedImage;
      previewImage.style.display = "block";
      previewText.style.display = "none";
      detectBtn.disabled = false;
      resetDetectBtn();
    };
    reader.readAsDataURL(file);
  }

  function loadBatch(files) {
    files = files.filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    if (files.length > 30) {
      showToast(
        "Maximum 30 images per batch. Only the first 30 are used.",
        "error",
      );
      files = files.slice(0, 30);
    }
    clearTimeout(resetTimer);
    batchFiles = files;
    selectedFile = null;
    uploadedImage = "";
    previewImage.style.display = "none";
    previewText.style.display = "block";
    previewText.innerHTML = `
      <div class="batch-thumbs">
        ${files.map((f) => `<img src="${URL.createObjectURL(f)}" alt="">`).join("")}
      </div>
      <p>${files.length} images selected</p>`;
    detectBtn.disabled = false;
    resetDetectBtn();
  }

  function handleFiles(fileList) {
    const files = Array.from(fileList);
    if (files.length > 1) loadBatch(files);
    else loadFile(files[0]);
  }

  imageInput.addEventListener("change", function () {
    handleFiles(this.files);
  });

  if (uploadArea) {
    ["dragenter", "dragover"].forEach((ev) =>
      uploadArea.addEventListener(ev, (e) => {
        e.preventDefault();
        uploadArea.classList.add("drag-over");
      }),
    );
    ["dragleave", "drop"].forEach((ev) =>
      uploadArea.addEventListener(ev, (e) => {
        e.preventDefault();
        uploadArea.classList.remove("drag-over");
      }),
    );
    uploadArea.addEventListener("drop", (e) =>
      handleFiles(e.dataTransfer.files),
    );
  }

  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      clearTimeout(resetTimer);
      clearPreview();
      showSingleMode(true);
    });
  }

  detectBtn.addEventListener("click", async () => {
    if (batchFiles.length) return runBatch();

    if (!selectedFile || !uploadedImage) {
      showToast("Please upload an image first", "error");
      return;
    }

    clearTimeout(resetTimer);
    detectBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...`;
    detectBtn.disabled = true;

    try {
      const form = new FormData();
      form.append("image", selectedFile);
      const res = await fetch(API_URL, { method: "POST", body: form });
      if (res.status === 401) {
        window.location.href = "login.html";
        return;
      }
      if (!res.ok) throw new Error("Server returned " + res.status);
      const result = await res.json();
      showResult(result);
    } catch (err) {
      console.error(err);
      showToast("Detection failed. Is the Flask server running?", "error");
      resetDetectBtn();
      detectBtn.disabled = false;
      return;
    }

    detectBtn.innerHTML = `<i class="fa-solid fa-check"></i> Detection Complete`;
    document
      .getElementById("resultSection")
      .scrollIntoView({ behavior: "smooth", block: "start" });
    resetTimer = setTimeout(clearPreview, 5000);
  });

  function showResult(result) {
    showSingleMode(true);
    let species, rawConf, note;
    if (result.label === "wildlife") {
      species = speciesDisplayName(result.species);
      rawConf = result.confidence;
      note = "Identified as one of the five target species.";
    } else if (result.label === "unidentified") {
      species = "Wildlife detected (not a target species)";
      rawConf = result.confidence;
      note =
        "An animal was found, but it was not confidently matched to a target species.";
    } else {
      species = "No wildlife detected";
      rawConf = result.stage1_confidence;
      note =
        "No animal found. This image was likely triggered by leaves, shadows or wind.";
    }
    const confidence = rawConf == null ? 0 : Math.round(rawConf * 1000) / 10;

    document.getElementById("resultImage").src = uploadedImage;
    document.getElementById("speciesName").textContent = species;
    document.getElementById("confidence").textContent = confidence + "%";
    document.getElementById("confidenceBar").style.width = confidence + "%";
    document.getElementById("detectDate").textContent =
      new Date().toLocaleDateString();
    const noteEl = document.getElementById("resultNote");
    if (noteEl) noteEl.textContent = note;
    // no localStorage save: the server stores every prediction
  }

  function describe(r) {
    if (r.label === "wildlife")
      return { text: speciesDisplayName(r.species), conf: r.confidence };
    if (r.label === "unidentified") {
      const g = r.top_guess
        ? " (possibly " + speciesDisplayName(r.top_guess) + ")"
        : "";
      return { text: "Wildlife, low confidence" + g, conf: r.confidence };
    }
    return { text: "No wildlife", conf: r.stage1_confidence };
  }

  function renderBatch(results, urls) {
    showSingleMode(false);
    const c = { wildlife: 0, unidentified: 0, blank: 0, error: 0 };
    results.forEach((r) => {
      if (r.error) c.error++;
      else c[r.label]++;
    });

    const rows = results
      .map((r, i) => {
        const img = `<img src="${urls[i]}" alt="">`;
        if (r.error) {
          return `<tr><td>${img}</td><td>${escapeHtml(r.filename)}</td><td colspan="2">${escapeHtml(r.error)}</td></tr>`;
        }
        const d = describe(r);
        const pct = d.conf == null ? "-" : Math.round(d.conf * 1000) / 10 + "%";
        return `<tr><td>${img}</td><td>${escapeHtml(r.filename)}</td><td>${escapeHtml(d.text)}</td><td>${pct}</td></tr>`;
      })
      .join("");

    batchBox.innerHTML = `
      <div class="result-card batch-card">
        <div class="batch-content">
          <div class="batch-summary">
            <strong>${results.length} images processed:</strong>
            ${c.wildlife} identified · ${c.unidentified} unidentified · ${c.blank} blank · ${c.error} failed
          </div>
          <table class="batch-table">
            <thead><tr><th></th><th>File</th><th>Result</th><th>Confidence</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }

  async function runBatch() {
    clearTimeout(resetTimer);
    const urls = batchFiles.map((f) => URL.createObjectURL(f));
    detectBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Analyzing ${batchFiles.length} images...`;
    detectBtn.disabled = true;

    try {
      const form = new FormData();
      batchFiles.forEach((f) => form.append("images", f));
      const res = await fetch("/detect/batch", { method: "POST", body: form });
      if (res.status === 401) {
        window.location.href = "login.html";
        return;
      }
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Server returned " + res.status);

      renderBatch(data.results, urls);
      detectBtn.innerHTML = `<i class="fa-solid fa-check"></i> Batch Complete`;
      resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
      resetTimer = setTimeout(clearPreview, 5000);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Batch failed", "error");
      resetDetectBtn();
      detectBtn.disabled = false;
    }
  }
}

/* ---------- boot ---------- */

document.addEventListener("DOMContentLoaded", () => {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("currentUser"));
  } catch (e) {}
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const page = document.body.dataset.page;
  renderSidebar(page);
  renderTopbar(user);

  if (page === "dashboard") initDashboard(user);
  if (page === "history") initHistory(user);
  if (page === "species") initSpecies();
  if (page === "profile") initProfile(user);
  if (page === "detect") initDetect(user);
});
