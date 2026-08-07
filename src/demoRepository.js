import {
  courses,
  courseSkills,
  people,
  personProjects,
  personSkills,
  projects,
  projectSkills,
  roleRequirements,
  roles,
  skills
} from "./demoData.js";

const skillById = new Map(skills.map((skill) => [skill.id, skill]));
const roleById = new Map(roles.map((role) => [role.id, role]));
const courseById = new Map(courses.map((course) => [course.id, course]));
const projectById = new Map(projects.map((project) => [project.id, project]));

export function createDemoRepository() {
  return {
    mode: "demo",
    async close() {},
    async health() {
      return { ok: true, mode: "demo", message: "Using built-in demo graph data." };
    },
    async getReferenceData() {
      return { roles, skills };
    },
    async getRoleMap() {
      return roles.map((role) => ({
        ...role,
        requiredSkills: (roleRequirements[role.id] || []).map((id) => skillById.get(id))
      }));
    },
    async getRecommendations({ currentSkillIds, targetRoleId }) {
      const owned = new Set(currentSkillIds);
      const target = roleById.get(targetRoleId) || roles[0];
      const requiredIds = roleRequirements[target.id] || [];
      const missingIds = requiredIds.filter((id) => !owned.has(id));

      const courseMatches = courses
        .map((course) => {
          const teaches = courseSkills[course.id] || [];
          const covered = teaches.filter((id) => missingIds.includes(id));
          return {
            ...course,
            skills: covered.map((id) => skillById.get(id)),
            covers: covered.length
          };
        })
        .filter((course) => course.covers > 0)
        .sort((a, b) => b.covers - a.covers || a.hours - b.hours)
        .slice(0, 4);

      const mentorMatches = people
        .map((person) => {
          const expertIds = personSkills[person.id] || [];
          const overlap = expertIds.filter((id) => requiredIds.includes(id));
          return {
            ...person,
            overlap: overlap.length,
            skills: overlap.map((id) => skillById.get(id)),
            projects: (personProjects[person.id] || []).map((id) => projectById.get(id))
          };
        })
        .filter((person) => person.overlap >= 2)
        .sort((a, b) => b.overlap - a.overlap)
        .slice(0, 4);

      const bridgeProjects = projects
        .map((project) => {
          const builtWith = projectSkills[project.id] || [];
          const covers = builtWith.filter((id) => missingIds.includes(id));
          return { ...project, skills: covers.map((id) => skillById.get(id)), covers: covers.length };
        })
        .filter((project) => project.covers > 0)
        .sort((a, b) => b.covers - a.covers)
        .slice(0, 4);

      return {
        targetRole: target,
        missingSkills: missingIds.map((id) => skillById.get(id)),
        knownSkills: requiredIds.filter((id) => owned.has(id)).map((id) => skillById.get(id)),
        courses: courseMatches,
        mentors: mentorMatches,
        projects: bridgeProjects
      };
    },
    async getGraph({ targetRoleId, currentSkillIds }) {
      const recommendation = await this.getRecommendations({ targetRoleId, currentSkillIds });
      const nodes = [];
      const links = [];
      const seen = new Set();
      const addNode = (node) => {
        if (!node || seen.has(node.id)) return;
        seen.add(node.id);
        nodes.push(node);
      };
      addNode({ id: recommendation.targetRole.id, label: recommendation.targetRole.title, type: "Role" });
      [...recommendation.knownSkills, ...recommendation.missingSkills].forEach((skill) => {
        addNode({ id: skill.id, label: skill.name, type: "Skill" });
        links.push({ source: recommendation.targetRole.id, target: skill.id, label: "REQUIRES" });
      });
      recommendation.courses.forEach((course) => {
        addNode({ id: course.id, label: course.title, type: "Course" });
        course.skills.forEach((skill) => links.push({ source: course.id, target: skill.id, label: "TEACHES" }));
      });
      recommendation.projects.forEach((project) => {
        addNode({ id: project.id, label: project.name, type: "Project" });
        project.skills.forEach((skill) => links.push({ source: project.id, target: skill.id, label: "BUILT_WITH" }));
      });
      recommendation.mentors.forEach((person) => {
        addNode({ id: person.id, label: person.name, type: "Person" });
        person.skills.forEach((skill) => links.push({ source: person.id, target: skill.id, label: "HAS_SKILL" }));
      });
      return { nodes, links };
    }
  };
}
