const API = "";

const state = {
  token: localStorage.getItem("cpn_token"),
  user: JSON.parse(localStorage.getItem("cpn_user") || "null"),
  stages: [],
  current: null,
  currentDetail: null,
  path: [],
  savedRoadmaps: []
};

const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 1800);
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === id));
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.screen === id));
  const copy = {
    home: ["Home", "Login and choose your current academic status to begin."],
    explore: ["Explore", "Move step by step through career options from the database."],
    mindmap: ["Mindmap", "See the selected route in a tree-based visual structure."],
    roadmap: ["Roadmap PDF", "Generate and download your selected path as PDF."],
    compare: ["Compare", "Compare two saved roadmaps using database-backed data."]
  };
  $("screenTitle").textContent = copy[id][0];
  $("screenSubtitle").textContent = copy[id][1];
  if (id === "compare") loadRoadmaps();
}

function setUser(user, token) {
  state.user = user;
  state.token = token;
  localStorage.setItem("cpn_user", JSON.stringify(user));
  localStorage.setItem("cpn_token", token);
  renderUser();
}

function renderUser() {
  $("userName").textContent = state.user?.name || "Guest";
  $("userMeta").textContent = state.user
    ? `${state.user.academicStatus || "Student"} | ${state.user.goal || "Exploring"}`
    : "Register or login to save roadmaps";
}

async function loadStages() {
  state.stages = await api("/api/career/stages");
  $("registerStatus").innerHTML = state.stages.map((stage) => `<option value="${stage.id}">${stage.title}</option>`).join("");
  if (!state.current) {
    state.current = state.user?.academicStatus || state.stages[0]?.id;
    state.path = [state.current];
  }
}

async function loadCurrent() {
  if (!state.current) return;
  const detail = await api(`/api/career/options/${state.current}`);
  state.currentDetail = detail;
  renderExplore(detail);
  renderMindmap();
  renderRoadmap();
}

function renderExplore(detail) {
  $("crumbs").innerHTML = state.path.map((id, index) => {
    const label = id === detail.id ? detail.title : id.replaceAll("-", " ");
    return `<button class="crumb" data-crumb="${index}">${label}</button>`;
  }).join("");

  document.querySelectorAll("[data-crumb]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const index = Number(btn.dataset.crumb);
      state.path = state.path.slice(0, index + 1);
      state.current = state.path[state.path.length - 1];
      await loadCurrent();
    });
  });

  $("optionList").innerHTML = detail.children.length
    ? detail.children.map((item) => `
      <button class="option-btn" data-option="${item.id}">
        <strong>${item.title}</strong>
        <span>${item.short}</span>
      </button>
    `).join("")
    : `<p class="muted">This is a final route. Save it, generate a roadmap, compare it, or ask the chatbot.</p>`;

  document.querySelectorAll("[data-option]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      state.current = btn.dataset.option;
      state.path.push(state.current);
      await loadCurrent();
    });
  });

  $("detailPanel").innerHTML = `
    <h2 class="detail-title">${detail.title}</h2>
    <p class="muted">${detail.summary}</p>
    <div class="chips">
      <span class="chip teal">Duration: ${detail.duration}</span>
      <span class="chip orange">Cost: ${detail.cost}</span>
      <span class="chip">Difficulty: ${detail.difficulty}</span>
    </div>
    <div class="mini-card">
      <h4>Scope</h4>
      <p class="muted">${detail.scope}</p>
    </div>
    <div class="detail-columns">
      ${listCard("Eligibility", detail.eligibility)}
      ${listCard("Skills", detail.skills)}
      ${listCard("Opportunities", detail.opportunities)}
    </div>
  `;
}

function listCard(title, items) {
  return `
    <div class="mini-card">
      <h4>${title}</h4>
      <ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
  `;
}

async function renderMindmap() {
  if (!state.stages.length) {
    $("mindmap").innerHTML = `<p class="muted">No career stages found. Load data first.</p>`;
    return;
  }

  // Recursively build a tree structure
  async function buildTree(nodeId, depth = 0) {
    if (depth > 10) return ""; // Prevent infinite loops
    
    const node = nodeId ? await api(`/api/career/options/${nodeId}`) : { id: "root", title: "Career Stages", children: state.stages };
    if (!node) return "";

    const isActive = state.path.includes(node.id) || node.id === "root";
    const children = node.children || [];
    
    let html = `<div class="tree-node ${isActive ? "active" : ""}">
      <div class="tree-node-title ${node.id === "root" ? "root" : ""}" data-id="${node.id}">
        <span class="tree-toggle">${children.length ? (state.expandedNodes?.[node.id] ? "▼" : "▶") : "○"}</span>
        <strong>${node.title}</strong>
        ${node.short ? `<span class="tree-short">${node.short}</span>` : ""}
      </div>`;

    if (children.length && state.expandedNodes?.[node.id]) {
      html += `<div class="tree-children">`;
      for (let child of children) {
        html += await buildTree(child.id, depth + 1);
      }
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  state.expandedNodes = state.expandedNodes || {};
  
  // Always expand the current path
  for (let id of state.path) {
    state.expandedNodes[id] = true;
  }

  const treeHtml = await buildTree(null);
  $("mindmap").innerHTML = `<div class="tree-container">${treeHtml}</div>`;

  // Add event listeners for tree navigation
  document.querySelectorAll(".tree-node-title").forEach((titleEl) => {
    titleEl.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = titleEl.dataset.id;
      
      if (id === "root") return;
      
      // Toggle expand/collapse
      if (state.expandedNodes[id]) {
        delete state.expandedNodes[id];
      } else {
        state.expandedNodes[id] = true;
      }
      
      // Navigate to this node if it's in the tree
      const nodeData = await api(`/api/career/options/${id}`);
      if (nodeData) {
        // Find the root of this node and rebuild the path
        state.current = id;
        // Update path to include this node
        if (!state.path.includes(id)) {
          state.path.push(id);
        }
        await loadCurrent();
      }
      
      await renderMindmap();
    });

    const toggleEl = titleEl.querySelector(".tree-toggle");
    if (toggleEl) {
      toggleEl.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = titleEl.dataset.id;
        if (state.expandedNodes[id]) {
          delete state.expandedNodes[id];
        } else {
          state.expandedNodes[id] = true;
        }
        await renderMindmap();
      });
    }
  });
}

function roadmapSteps() {
  const final = state.currentDetail;
  const pathText = state.path.join(" -> ");
  return [
    ["Understand current stage", `Start from ${state.path[0]} and identify interests, budget, time and family expectations.`],
    ["Explore selected route", `Selected route: ${pathText}. Check eligibility and future outcomes before final decision.`],
    ["Build skills", `Focus on: ${final.skills.join(", ")}.`],
    ["Prepare for entry", "Track entrance exams, admission forms, portfolios, certificates or interviews depending on the route."],
    ["Move toward opportunities", `Target opportunities: ${final.opportunities.join(", ")}.`]
  ];
}

function renderRoadmap() {
  if (!state.currentDetail) return;
  $("roadmapSteps").innerHTML = roadmapSteps().map((step, index) => `
    <div class="step">
      <div class="step-no">${index + 1}</div>
      <div class="step-card">
        <h4>${step[0]}</h4>
        <p class="muted">${step[1]}</p>
      </div>
    </div>
  `).join("");
}

async function saveRoadmap() {
  if (!state.token) return toast("Login first to save roadmap.");
  const title = state.path.join(" -> ");
  const saved = await api("/api/roadmaps", {
    method: "POST",
    body: JSON.stringify({ title, pathIds: state.path, finalOptionId: state.current })
  });
  toast(`Saved roadmap: ${saved.finalOption.title}`);
  await loadRoadmaps();
}

async function loadRoadmaps() {
  if (!state.token) {
    $("savedRoadmaps").innerHTML = `<span class="saved-pill">Login to view saved roadmaps.</span>`;
    $("compareA").innerHTML = "";
    $("compareB").innerHTML = "";
    return;
  }
  state.savedRoadmaps = await api("/api/roadmaps");
  $("savedRoadmaps").innerHTML = state.savedRoadmaps.length
    ? state.savedRoadmaps.map((roadmap) => `<span class="saved-pill">${roadmap.title}</span>`).join("")
    : `<span class="saved-pill">No saved roadmaps yet.</span>`;

  const options = state.savedRoadmaps.map((roadmap) => `<option value="${roadmap.finalOptionId}">${roadmap.title}</option>`).join("");
  $("compareA").innerHTML = options;
  $("compareB").innerHTML = options;
  if (state.savedRoadmaps.length > 1) $("compareB").selectedIndex = 1;
}

async function compareRoadmaps() {
  const optionA = $("compareA").value;
  const optionB = $("compareB").value;
  if (!optionA || !optionB) return toast("Save two roadmaps first.");
  const result = await api("/api/compare", {
    method: "POST",
    body: JSON.stringify({ optionA, optionB })
  });
  $("compareResult").innerHTML = `
    <table class="compare-table">
      <thead><tr><th>Factor</th><th>${result.a.title}</th><th>${result.b.title}</th></tr></thead>
      <tbody>
        ${result.factors.map((factor) => `<tr><td>${factor.label}</td><td>${factor.a}</td><td>${factor.b}</td></tr>`).join("")}
      </tbody>
    </table>
  `;
}

function downloadPdf() {
  if (!state.currentDetail) return;
  $("printSheet").innerHTML = `
    <h1>Career Path Navigator Roadmap</h1>
    <p><strong>Student:</strong> ${state.user?.name || "Guest"}</p>
    <p><strong>Selected path:</strong> ${state.path.join(" -> ")}</p>
    <p><strong>Final option:</strong> ${state.currentDetail.title}</p>
    <table>
      <thead><tr><th>Step</th><th>Action Plan</th></tr></thead>
      <tbody>${roadmapSteps().map((step, index) => `<tr><td>${index + 1}. ${step[0]}</td><td>${step[1]}</td></tr>`).join("")}</tbody>
    </table>
    <p><strong>Scope:</strong> ${state.currentDetail.scope}</p>
  `;
  window.print();
}

async function sendChat(question) {

  addMessage(question, "user");

  try {

    const data = await api("/api/chatbot", {
      method: "POST",
      body: JSON.stringify({
        question,
        currentOptionId: state.current
      })
    });

    addMessage(data.answer || "No response from AI", "bot");

  } catch (error) {

    console.error("Chatbot Error:", error);

    addMessage("AI chatbot not connected properly.", "bot");
  }
}

function addMessage(text, type) {
  const msg = document.createElement("div");
  msg.className = `msg ${type}`;
  msg.textContent = text;
  $("chatMessages").appendChild(msg);
  $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
}

document.querySelectorAll(".nav-btn").forEach((btn) => btn.addEventListener("click", () => showScreen(btn.dataset.screen)));
document.querySelectorAll(".auth-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach((tab) => tab.classList.toggle("active", tab === btn));
    document.querySelectorAll(".auth-form").forEach((form) => form.classList.remove("active"));
    $(`${btn.dataset.auth}Form`).classList.add("active");
  });
});

$("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    name: $("registerName").value,
    email: $("registerEmail").value,
    password: $("registerPassword").value,
    city: $("registerCity").value,
    goal: $("registerGoal").value,
    academicStatus: $("registerStatus").value
  };
  const data = await api("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
  setUser(data.user, data.token);
  state.current = data.user.academicStatus;
  state.path = [state.current];
  await loadCurrent();
  showScreen("explore");
  toast("Account created.");
});

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: $("loginEmail").value, password: $("loginPassword").value })
  });
  setUser(data.user, data.token);
  state.current = data.user.academicStatus || state.stages[0]?.id;
  state.path = [state.current];
  await loadCurrent();
  showScreen("explore");
  toast("Logged in.");
});

$("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("cpn_token");
  localStorage.removeItem("cpn_user");
  state.token = null;
  state.user = null;
  renderUser();
  showScreen("home");
  toast("Logged out.");
});

$("resetPathBtn").addEventListener("click", async () => {
  state.current = state.user?.academicStatus || state.stages[0]?.id || "after-10th";
  state.path = [state.current];
  await loadCurrent();
  toast("Path reset.");
});

$("saveRoadmapBtn").addEventListener("click", saveRoadmap);
$("compareBtn").addEventListener("click", compareRoadmaps);
$("downloadPdfBtn").addEventListener("click", downloadPdf);
$("chatOpen").addEventListener("click", () => $("chat").classList.add("open"));
$("chatClose").addEventListener("click", () => $("chat").classList.remove("open"));
$("chatForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = $("chatInput");
  const question = input.value.trim();
  if (!question) return;
  input.value = "";
  await sendChat(question);
});

async function init() {
  try {
    renderUser();
    addMessage("Hi. I can answer doubts about career paths, roadmaps, comparison and early earning options.", "bot");
    await loadStages();
    await loadCurrent();
    await loadRoadmaps();
  } catch (error) {
    toast(error.message);
    $("detailPanel").innerHTML = `<p class="muted">Backend/database not connected: ${error.message}</p>`;
  }
}

init();
