const state = {
  roles: [],
  skills: [],
  selectedRoleId: "",
  selectedSkillIds: new Set()
};

const elements = {
  status: document.querySelector("#status"),
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
  const response = await fetch(path);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || body.error || "Request failed");
  }
  return response.json();
}

function showToast(message) {
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
}

function renderReference() {
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

function nodePosition(node, index, count) {
  const lanes = {
    Role: { x: 110, y: 215 },
    Skill: { x: 360, y: 215 },
    Course: { x: 650, y: 92 },
    Person: { x: 660, y: 220 },
    Project: { x: 650, y: 345 }
  };
  const sameTypeCount = count[node.type] || 1;
  const offset = (index[node.type] - (sameTypeCount - 1) / 2) * 56;
  const base = lanes[node.type] || { x: 450, y: 215 };
  return { x: base.x, y: Math.max(44, Math.min(390, base.y + offset)) };
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
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("class", "edge");
    line.setAttribute("x1", source.x);
    line.setAttribute("y1", source.y);
    line.setAttribute("x2", target.x);
    line.setAttribute("y2", target.y);
    fragment.append(line);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("class", "edge-label");
    label.setAttribute("x", (source.x + target.x) / 2);
    label.setAttribute("y", (source.y + target.y) / 2 - 7);
    label.setAttribute("text-anchor", "middle");
    label.textContent = link.label;
    fragment.append(label);
  });

  graph.nodes.forEach((node) => {
    const position = positions.get(node.id);
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", `node ${node.type}`);
    circle.setAttribute("cx", position.x);
    circle.setAttribute("cy", position.y);
    circle.setAttribute("r", node.type === "Role" ? 18 : 13);
    group.append(circle);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("class", "node-label");
    text.setAttribute("x", position.x + 22);
    text.setAttribute("y", position.y + 4);
    text.textContent = node.label.length > 28 ? `${node.label.slice(0, 25)}...` : node.label;
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
