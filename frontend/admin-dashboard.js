/* Wild Lens Admin Dashboard */

const $ = (id) => document.getElementById(id);

const SPECIES = [
  { match: "tiger", name: "Bengal Tiger" },
  { match: "rhino", name: "One-horned Rhinoceros" },
  { match: "leopard", name: "Snow Leopard" },
  { match: "panda", name: "Red Panda" },
  { match: "elephant", name: "Asian Elephant" },
];

function esc(s) {
  return String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function speciesName(raw) {
  const l = String(raw || "").toLowerCase();
  const f = SPECIES.find((s) => l.includes(s.match));
  return f ? f.name : String(raw || "").replace(/[_-]/g, " ");
}
function fmtDate(ts) {
  const d = new Date(String(ts).replace(" ", "T") + "Z");
  return isNaN(d) ? ts : d.toLocaleString();
}
function pct(v) {
  return v == null ? "-" : Math.round(v * 1000) / 10 + "%";
}

function resultText(p) {
  if (p.final_label === "wildlife") return speciesName(p.species);
  if (p.final_label === "unidentified") return "Wildlife (low confidence)";
  return "No wildlife";
}
function confOf(p) {
  return p.final_label === "blank" ? p.stage1_confidence : p.stage2_confidence;
}

async function api(url, opts) {
  const res = await fetch(url, opts);
  if (res.status === 401) {
    window.location.href = "login.html";
    throw new Error("auth");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
function fail(e) {
  if (e.message !== "auth") showToast(e.message, "error");
}

/* ---------- navigation ---------- */
const menus = document.querySelectorAll(".menu");
const pages = document.querySelectorAll(".page");

menus.forEach((menu) => {
  menu.addEventListener("click", function () {
    menus.forEach((m) => m.classList.remove("active"));
    this.classList.add("active");
    const page = this.dataset.page;
    pages.forEach((p) => p.classList.remove("active-page"));
    $(page).classList.add("active-page");
    $("pageHeading").textContent = this.innerText.trim();
    if (page === "users") loadUsers();
    if (page === "detections") loadDetections(true);
    if (page === "species" || page === "dashboard") loadStats();
    if (page === "training") loadTraining();
    if (page === "models") loadModels();
  });
});

/* ---------- stats + species ---------- */
async function loadStats() {
  try {
    const s = await api("/api/admin/stats");
    $("totalUsers").textContent = s.users;
    $("totalPredictions").textContent = s.predictions;
    $("wildlifeCount").textContent = s.wildlife;
    $("avgMs").textContent = s.avg_ms + " ms";

    const counts = SPECIES.map((sp) => ({
      name: sp.name,
      n: s.species
        .filter((r) => speciesName(r.species) === sp.name)
        .reduce((a, r) => a + r.n, 0),
    }));
    const max = Math.max(1, ...counts.map((c) => c.n));
    $("speciesBreakdown").innerHTML = counts
      .map(
        (c) => `
      <div class="breakdown-row">
        <div class="b-name">${c.name}</div>
        <div class="b-bar"><div class="b-fill" style="width:${(c.n / max) * 100}%"></div></div>
        <div class="b-count">${c.n}</div>
      </div>`,
      )
      .join("");
  } catch (e) {
    fail(e);
  }
}

/* ---------- users ---------- */
let allUsers = [];

function statusBadge(u) {
  return `<span class="status ${u.status}">${u.status === "active" ? "Active" : "Inactive"}</span>`;
}
function toggleBtn(u, cls) {
  if (u.role === "admin") return "-";
  const next = u.status === "active" ? "inactive" : "active";
  const label = u.status === "active" ? "Deactivate" : "Activate";
  return `<button class="${cls}" data-toggle="${u.user_id}" data-next="${next}" data-name="${esc(u.name)}">${label}</button>`;
}

async function loadUsers() {
  try {
    allUsers = (await api("/api/admin/users")).users;
    $("userTable").innerHTML =
      allUsers
        .map(
          (u) => `
      <tr>
        <td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td>
        <td>${statusBadge(u)}</td><td>${u.scans}</td>
        <td>${toggleBtn(u, "action-btn " + (u.status === "active" ? "delete-btn" : "edit-btn"))}</td>
      </tr>`,
        )
        .join("") || `<tr><td colspan="6">No users yet.</td></tr>`;

    $("usersGrid").innerHTML = allUsers
      .map(
        (u) => `
      <div class="user-card">
        <h3>${esc(u.name)}</h3>
        <p>${esc(u.email)}</p>
        <p>${u.scans} scans · joined ${esc(fmtDate(u.created_at).split(",")[0])}</p>
        <span class="user-role">${esc(u.role.toUpperCase())}</span> ${statusBadge(u)}
        <div class="user-actions">${toggleBtn(u, u.status === "active" ? "delete" : "edit")}</div>
      </div>`,
      )
      .join("");
  } catch (e) {
    fail(e);
  }
}

async function onToggle(e) {
  const btn = e.target.closest("[data-toggle]");
  if (!btn) return;
  const deactivating = btn.dataset.next === "inactive";
  if (deactivating) {
    const ok = await showConfirm(
      `Deactivate ${btn.dataset.name}? They will no longer be able to log in.`,
      "Deactivate",
      true,
    );
    if (!ok) return;
  }
  try {
    const r = await api(`/api/admin/users/${btn.dataset.toggle}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: btn.dataset.next }),
    });
    showToast(r.message);
    loadUsers();
    loadStats();
  } catch (err) {
    fail(err);
  }
}
$("userTable").addEventListener("click", onToggle);
$("usersGrid").addEventListener("click", onToggle);

/* ---------- detections ---------- */
let detOffset = 0;

function detRow(p) {
  const removed = p.removed_by_user
    ? ` <span class="badge-removed">removed by user</span>`
    : "";
  return `<tr>
    <td><img class="det-thumb" src="${p.image}" alt=""></td>
    <td>${esc(p.original_filename)}${removed}</td>
    <td>${esc(p.user_name)}<br><small>${esc(p.user_email)}</small></td>
    <td>${esc(resultText(p))}</td>
    <td>${pct(confOf(p))}</td>
    <td>${esc(p.model_version)}</td>
    <td>${esc(fmtDate(p.created_at))}</td>
    <td>${trainCell(p)}</td>
  </tr>`;
}

function trainCell(p) {
  if (p.training_status) {
    const cls =
      p.training_status === "approved"
        ? "active"
        : p.training_status === "rejected"
          ? "inactive"
          : "pending";
    return `<span class="status ${cls}">${p.training_status}</span>`;
  }
  return `<button class="action-btn edit-btn" data-candidate="${p.prediction_id}">Add to training</button>`;
}

async function loadDetections(reset) {
  const offset = reset ? 0 : detOffset;
  const q = new URLSearchParams({ limit: 25, offset });
  if ($("detFilter").value) q.set("label", $("detFilter").value);
  try {
    const d = await api("/api/admin/predictions?" + q);
    const html = d.items.map(detRow).join("");
    if (reset)
      $("detTable").innerHTML =
        html || `<tr><td colspan="8">No records.</td></tr>`;
    else $("detTable").insertAdjacentHTML("beforeend", html);
    detOffset = offset + d.items.length;
    $("detCount").textContent =
      d.total + (d.total === 1 ? " record" : " records");
    $("loadMore").style.display = detOffset < d.total ? "" : "none";
  } catch (e) {
    fail(e);
  }
}

$("detFilter").addEventListener("change", async () => {
  await loadDetections(true);
  $("detections")
    .querySelector(".table-card")
    .scrollIntoView({ behavior: "smooth", block: "start" });
});
$("loadMore").addEventListener("click", () => loadDetections(false));

// $("detTable").addEventListener("click", async (e) => {
//   const btn = e.target.closest("[data-purge]");
//   if (!btn) return;
//   const ok = await showConfirm(
//     "Permanently delete this record and its image? This cannot be undone.",
//     "Purge",
//     true,
//   );
//   if (!ok) return;
//   try {
//     await api("/api/admin/predictions/" + btn.dataset.purge, {
//       method: "DELETE",
//     });
//     showToast("Record permanently deleted");
//     loadDetections(true);
//     loadStats();
//     loadRecent();
//   } catch (err) {
//     fail(err);
//   }
// });

/* ---------- dashboard side panels ---------- */
async function loadRecent() {
  try {
    const d = await api("/api/admin/predictions?limit=5");
    $("recentDetections").innerHTML =
      d.items
        .map(
          (p) => `
      <div class="detect-item">
        <div><h4>${esc(resultText(p))}</h4><p>${esc(p.user_name)}</p></div>
        <span>${pct(confOf(p))}</span>
      </div>`,
        )
        .join("") || `<p class="muted">No detections yet.</p>`;
  } catch (e) {
    fail(e);
  }
}

async function loadModel() {
  try {
    const m = (await api("/api/admin/models")).models.find(
      (x) => x.status === "active",
    );
    if (!m) {
      $("systemInfo").innerHTML = `<p class="muted">No active model.</p>`;
      return;
    }
    const row = (label, val) =>
      `<div class="report"><i class="fa-solid fa-circle-check"></i><span>${label}: ${esc(val)}</span></div>`;
    $("systemInfo").innerHTML =
      row("Version", m.version_name) +
      row("Stage 1 accuracy", pct(m.stage1_accuracy)) +
      row("Stage 2 mAP50", m.map50 == null ? "-" : m.map50) +
      row("Stage 2 mAP50-95", m.map50_95 == null ? "-" : m.map50_95);
  } catch (e) {
    fail(e);
  }
}

/* ---------- search (filters rows already loaded) ---------- */
document
  .querySelector(".search-box input")
  .addEventListener("input", function () {
    const v = this.value.toLowerCase();
    document.querySelectorAll("#userTable tr, #detTable tr").forEach((r) => {
      r.style.display = r.innerText.toLowerCase().includes(v) ? "" : "none";
    });
    document.querySelectorAll(".user-card").forEach((c) => {
      c.style.display = c.innerText.toLowerCase().includes(v) ? "" : "none";
    });
  });

/* ---------- logout ---------- */
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

/* ---------- training review ---------- */
async function loadTraining() {
  const st = $("trainFilter").value;
  try {
    const d = await api("/api/admin/training" + (st ? "?status=" + st : ""));
    $("trainCount").textContent =
      `${d.counts.pending} pending · ${d.counts.approved} approved · ${d.counts.rejected} rejected`;
    $("trainGrid").innerHTML =
      d.items
        .map((t) => {
          const guess = t.predicted_species
            ? speciesName(t.predicted_species)
            : "No species";
          const chosen =
            t.actual_species || (d.labels.includes(guess) ? guess : "");
          const cls =
            t.review_status === "approved"
              ? "active"
              : t.review_status === "rejected"
                ? "inactive"
                : "pending";
          return `
      <div class="train-card" data-id="${t.id}">
        <img src="${t.image}" alt="">
        <div class="train-body">
          <span class="status ${cls}">${t.review_status}</span>
          <p>Model said: <b>${esc(guess)}</b></p>
          <p class="muted">Uploaded by ${esc(t.user_name)}</p>
          <select class="filter-select train-label">
            <option value="">Select correct species...</option>
            ${d.labels.map((l) => `<option ${l === chosen ? "selected" : ""}>${esc(l)}</option>`).join("")}
          </select>
          <div class="user-actions">
            <button class="edit" data-review="approved">Approve</button>
            <button class="delete" data-review="rejected">Reject</button>
          </div>
        </div>
      </div>`;
        })
        .join("") || `<p class="muted">Nothing here.</p>`;
  } catch (e) {
    fail(e);
  }
}
$("trainFilter").addEventListener("change", loadTraining);

$("trainGrid").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-review]");
  if (!btn) return;
  const card = btn.closest(".train-card");
  try {
    const r = await api("/api/admin/training/" + card.dataset.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: btn.dataset.review,
        actual_species: card.querySelector(".train-label").value,
      }),
    });
    showToast(r.message);
    loadTraining();
  } catch (err) {
    fail(err);
  }
});

$("detTable").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-candidate]");
  if (!btn) return;
  try {
    await api(`/api/admin/predictions/${btn.dataset.candidate}/candidate`, {
      method: "POST",
    });
    showToast("Added to training review");
    btn.outerHTML = `<span class="status pending">pending</span>`; // no reload, no scroll jump
  } catch (err) {
    fail(err);
  }
});

/* ---------- model management ---------- */
async function loadModels() {
  try {
    const ms = (await api("/api/admin/models")).models;
    const act = ms.find((m) => m.status === "active");
    $("currentModel").innerHTML = act
      ? `
      <h2>Current Model: WildLens ${esc(act.version_name)}</h2>
      <p class="muted" style="margin:8px 0">Status: <span class="status active">Active</span>
        · since ${esc(fmtDate(act.activated_at || act.created_at))}</p>
      <p>Stage 1 accuracy ${pct(act.stage1_accuracy)} · Stage 2 mAP50 ${act.map50 ?? "-"} · mAP50-95 ${act.map50_95 ?? "-"}</p>`
      : `<p class="muted">No active model.</p>`;

    $("modelTable").innerHTML = ms
      .map((m) => {
        const cls =
          m.status === "active"
            ? "active"
            : m.status === "archived"
              ? "inactive"
              : "pending";
        let action = "-";
        if (m.status === "draft")
          action = `<button class="action-btn edit-btn" data-model="${m.model_id}" data-to="validated">Mark validated</button>`;
        else if (m.status === "validated" || m.status === "archived")
          action = `<button class="action-btn edit-btn" data-model="${m.model_id}" data-to="active" data-name="${esc(m.version_name)}">Activate</button>`;
        return `<tr>
        <td>${esc(m.version_name)}</td><td><span class="status ${cls}">${m.status}</span></td>
        <td>${esc(m.dataset_version || "-")}</td><td>${pct(m.stage1_accuracy)}</td>
        <td>${m.map50 ?? "-"}</td><td>${m.map50_95 ?? "-"}</td><td>${action}</td></tr>`;
      })
      .join("");
  } catch (e) {
    fail(e);
  }
}

$("modelTable").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-model]");
  if (!btn) return;
  if (btn.dataset.to === "active") {
    const ok = await showConfirm(
      `Activate ${btn.dataset.name}? New predictions will be recorded against it.`,
      "Activate",
    );
    if (!ok) return;
  }
  try {
    const r = await api(`/api/admin/models/${btn.dataset.model}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: btn.dataset.to }),
    });
    showToast(r.message);
    loadModels();
    loadModel();
  } catch (err) {
    fail(err);
  }
});
/* ---------- boot: the server decides who is an admin ---------- */
(async function init() {
  let me;
  try {
    me = (await api("/api/me")).user;
  } catch (e) {
    return;
  }
  if (me.role !== "admin") {
    window.location.href = "user-dashboard.html";
    return;
  }

  $("adminName").textContent = me.name;
  $("welcomeAdmin").textContent = me.name;
  // $("adminEmail").textContent = me.email;

  loadStats();
  loadUsers();
  loadRecent();
  loadModel();
})();
