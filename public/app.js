const state = {
  roles: [],
  skills: [],
  selectedRoleId: "",
  selectedSkillIds: new Set()
};

const elements = {
  status: document.querySelector("#status"),
  modeNote: document.querySelector("#modeNote"),
  targetRole: document.querySelector("#targetRole"),
  skillList: document.querySelector("#skillList"),
  runSearch: document.querySelector("#runSearch"),
  clearSkills: document.querySelector("#clearSkills"),
  knownCount: document.querySelector("#knownCount"),
  missingCount: document.querySelector("#missingCount"),
  pathCount: document.querySelector("#pathCount"),
  graphTitle: document.querySelector("#graphTitle"),
  graph: document.querySelector("#graph"),
  graphEmpty: document.querySelector("#graphEmpty"),
  missingSkills: document.querySelector("#missingSkills"),
  courses: document.querySelector("#courses"),
  mentors: document.querySelector("#mentors"),
  projects: document.querySelector("#projects"),
  toast: document.querySelector("#toast")
};

async function api(path) {
  // TODO: handle network timeouts and retries
  const response = await fetch(path);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || body.error || "Request failed");
  }
  return response.json();
}

function showToast(message) {
  // elements.toast.innerText = `Error: ${message}`;
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 5200);
}

function setStatus(status) {
  elements.status.className = `status ${status.ok ? "ok" : "error"}`;
  elements.status.querySelector("span:last-child").textContent = status.ok
    ? status.mode === "demo"
      ? "Demo graph"
      : "CognoDB connected"
    : "Graph offline";

  elements.modeNote.className = `mode-note ${status.ok ? (status.mode === "demo" ? "demo" : "live") : "offline"}`;
  elements.modeNote.querySelector("span").textContent = status.ok
    ? status.mode === "demo"
      ? "Using built-in sample data. Add CognoDB credentials and restart without USE_DEMO_DATA=true for live database mode."
      : "Using your CognoDB instance through the Neo4j Bolt driver."
    : "Could not reach the graph database. Check your .env credentials and instance status.";
}

function renderReference() {
  if (state.roles.length === 0 || state.skills.length === 0) {
    elements.targetRole.innerHTML = '<option value="">No roles found</option>';
    elements.targetRole.disabled = true;
    elements.skillList.innerHTML = '<p class="empty-copy">CognoDB is connected, but this database has no seed data yet.</p>';
    elements.runSearch.disabled = true;
    elements.graphEmpty.textContent = "Database is empty. Run npm run seed, restart the app, then refresh this page.";
    listOrEmpty(elements.missingSkills, [], () => "", "Run npm run seed to load roles and skills.");
    listOrEmpty(elements.courses, [], () => "", "Courses appear here after seeding.");
    listOrEmpty(elements.mentors, [], () => "", "Mentor matches appear here after seeding.");
    listOrEmpty(elements.projects, [], () => "", "Project paths appear here after seeding.");
    return;
  }

  elements.targetRole.disabled = false;
  elements.runSearch.disabled = false;
  elements.targetRole.innerHTML = state.roles
    .map((role) => `<option value="${role.id}">${role.title}</option>`)
    .join("");

  elements.skillList.innerHTML = state.skills
    .map(
      (skill) => `
        <label class="skill-toggle">
          <input type="checkbox" value="${skill.id}" />
          <span>${skill.name}</span>
        </label>
      `
    )
    .join("");

  state.selectedRoleId = state.roles[0]?.id || "";
}

function listOrEmpty(container, items, renderItem, emptyText) {
  container.innerHTML = items.length ? items.map(renderItem).join("") : `<p class="list-meta">${emptyText}</p>`;
}

function renderRecommendations(data) {
  elements.knownCount.textContent = data.knownSkills.length;
  elements.missingCount.textContent = data.missingSkills.length;
  elements.pathCount.textContent = data.courses.length + data.mentors.length + data.projects.length;
  elements.graphTitle.textContent = data.targetRole ? `${data.targetRole.title} readiness graph` : "Role readiness graph";

  listOrEmpty(
    elements.missingSkills,
    data.missingSkills,
    (skill) => `<span class="pill">${skill.name}</span>`,
    "You already cover the required skill set."
  );

  listOrEmpty(
    elements.courses,
    data.courses,
    (course) => `
      <div class="list-item">
        <p class="list-title">${course.title}</p>
        <p class="list-meta">${course.provider} · ${course.hours} hours · covers ${course.covers} gap${course.covers === 1 ? "" : "s"}</p>
      </div>
    `,
    "No course bridge found for the current gap."
  );

  listOrEmpty(
    elements.mentors,
    data.mentors,
    (person) => `
      <div class="list-item">
        <p class="list-title">${person.name}</p>
        <p class="list-meta">${person.headline} · ${person.location} · ${person.overlap} shared target skills</p>
      </div>
    `,
    "No strong mentor overlap found."
  );

  listOrEmpty(
    elements.projects,
    data.projects,
    (project) => `
      <div class="list-item">
        <p class="list-title">${project.name}</p>
        <p class="list-meta">${project.outcome} · practices ${project.covers} missing skill${project.covers === 1 ? "" : "s"}</p>
      </div>
    `,
    "No project bridge found for the selected gaps."
  );
}

// Magic numbers for SVG positioning, don't touch unless you want to break the layout
function nodePosition(node, index, count) {
  const lanes = {
    Role: { x: 100, y: 260, spacing: 70 },
    Skill: { x: 390, y: 260, spacing: 74 },
    Course: { x: 820, y: 100, spacing: 70 },
    Person: { x: 820, y: 265, spacing: 70 },
    Project: { x: 820, y: 420, spacing: 70 }
  };
  const sameTypeCount = count[node.type] || 1;
  const base = lanes[node.type] || { x: 560, y: 260, spacing: 70 };
  const offset = (index[node.type] - (sameTypeCount - 1) / 2) * base.spacing;
  return { x: base.x, y: Math.max(50, Math.min(470, base.y + offset)) };
}

function labelPosition(node, position) {
  if (node.type === "Role") return { x: position.x + 30, y: position.y + 5, anchor: "start" };
  if (node.type === "Skill") return { x: position.x + 30, y: position.y + 5, anchor: "start" };
  return { x: position.x + 30, y: position.y + 5, anchor: "start" };
}

function truncateLabel(label, maxLength = 30) {
  return label.length > maxLength ? `${label.slice(0, maxLength - 3)}...` : label;
}

function renderGraph(graph) {
  elements.graph.innerHTML = "";
  elements.graphEmpty.hidden = graph.nodes.length > 0;

  const typeCounts = graph.nodes.reduce((counts, node) => {
    counts[node.type] = (counts[node.type] || 0) + 1;
    return counts;
  }, {});
  const typeIndexes = {};
  const positions = new Map();
  graph.nodes.forEach((node) => {
    typeIndexes[node.type] = typeIndexes[node.type] || 0;
    positions.set(node.id, nodePosition(node, typeIndexes, typeCounts));
    typeIndexes[node.type] += 1;
  });

  const fragment = document.createDocumentFragment();

  graph.links.forEach((link) => {
    const source = positions.get(link.source);
    const target = positions.get(link.target);
    if (!source || !target) return;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const bend = Math.max(80, Math.abs(target.x - source.x) * 0.45);
    path.setAttribute("class", `edge edge-${link.label.toLowerCase().replace("_", "-")}`);
    path.setAttribute("d", `M ${source.x + 16} ${source.y} C ${source.x + bend} ${source.y}, ${target.x - bend} ${target.y}, ${target.x - 16} ${target.y}`);
    fragment.append(path);
  });

  graph.nodes.forEach((node) => {
    const position = positions.get(node.id);
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "node-group");
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", `node ${node.type}`);
    circle.setAttribute("cx", position.x);
    circle.setAttribute("cy", position.y);
    circle.setAttribute("r", node.type === "Role" ? 19 : 14);
    group.append(circle);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    const label = labelPosition(node, position);
    text.setAttribute("class", "node-label");
    text.setAttribute("x", label.x);
    text.setAttribute("y", label.y);
    text.setAttribute("text-anchor", label.anchor);
    text.textContent = truncateLabel(node.label, node.type === "Skill" ? 24 : 32);
    group.append(text);
    fragment.append(group);
  });

  elements.graph.append(fragment);
}

function currentSkillQuery() {
  return [...state.selectedSkillIds].join(",");
}

async function runSearch() {
  if (!state.selectedRoleId) return;
  elements.runSearch.disabled = true;
  elements.runSearch.textContent = "Finding paths...";

  try {
    const query = `targetRoleId=${encodeURIComponent(state.selectedRoleId)}&currentSkills=${encodeURIComponent(currentSkillQuery())}`;
    const [recommendations, graph] = await Promise.all([
      api(`/api/recommendations?${query}`),
      api(`/api/graph?${query}`)
    ]);
    renderRecommendations(recommendations);
    renderGraph(graph);
  } catch (error) {
    showToast(error.message);
  } finally {
    elements.runSearch.disabled = false;
    elements.runSearch.textContent = "Find bridge paths";
  }
}

elements.targetRole.addEventListener("change", (event) => {
  state.selectedRoleId = event.target.value;
  runSearch();
});

elements.skillList.addEventListener("change", (event) => {
  if (event.target.type !== "checkbox") return;
  if (event.target.checked) {
    state.selectedSkillIds.add(event.target.value);
  } else {
    state.selectedSkillIds.delete(event.target.value);
  }
  runSearch();
});

elements.clearSkills.addEventListener("click", () => {
  state.selectedSkillIds.clear();
  elements.skillList.querySelectorAll("input").forEach((input) => {
    input.checked = false;
  });
  runSearch();
});

elements.runSearch.addEventListener("click", runSearch);

async function boot() {
  console.log('App booting...');
  try {
    const [health, reference] = await Promise.all([api("/api/health"), api("/api/reference")]);
    setStatus(health);
    state.roles = reference.roles;
    state.skills = reference.skills;
    renderReference();
    ["sql", "python", "statistics"].forEach((id) => state.selectedSkillIds.add(id));
    elements.skillList.querySelectorAll("input").forEach((input) => {
      input.checked = state.selectedSkillIds.has(input.value);
    });
    await runSearch();
  } catch (error) {
    setStatus({ ok: false });
    showToast(error.message);
  }
}

boot();
