import neo4j from "neo4j-driver";
import { DatabaseUnavailableError } from "./errors.js";

function recordList(records, key) {
  return records.map((record) => record.get(key));
}

// Helper to convert Neo4j's weird custom Integer objects to native JS numbers.
// Otherwise the frontend gets confused by the resulting JSON.
function asNative(value) {
  if (neo4j.isInt(value)) return value.toNumber();
  if (Array.isArray(value)) return value.map(asNative);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, asNative(item)]));
  }
  return value;
}

async function read(driver, cypher, params = {}) {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.executeRead((tx) => tx.run(cypher, params));
    return result.records;
  } catch (error) {
    throw new DatabaseUnavailableError(error.message);
  } finally {
    await session.close();
  }
}

export function createGraphRepository({ uri, user, password }) {
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

  return {
    mode: "cognodb",
    async close() {
      await driver.close();
    },
    async health() {
      try {
        // console.log("Checking Neo4j connection...");
        const records = await read(driver, "RETURN 'ok' AS status");
        return { ok: records[0]?.get("status") === "ok", mode: "cognodb" };
      } catch (error) {
        // FIXME: sometimes this throws a weird auth error on first boot
        return { ok: false, mode: "cognodb", message: error.message };
      }
    },
    async getReferenceData() {
      const [roleRecords, skillRecords] = await Promise.all([
        read(
          driver,
          `
          MATCH (role:Role)
          RETURN role { .id, .title, .domain, .seniority } AS role
          ORDER BY role.title
          `
        ),
        read(
          driver,
          `
          MATCH (skill:Skill)
          RETURN skill { .id, .name, .category } AS skill
          ORDER BY skill.category, skill.name
          `
        )
      ]);

      return {
        roles: recordList(roleRecords, "role"),
        skills: recordList(skillRecords, "skill")
      };
    },
    async getRoleMap() {
      const records = await read(
        driver,
        `
        MATCH (role:Role)-[:REQUIRES]->(skill:Skill)
        WITH role, collect(skill { .id, .name, .category }) AS requiredSkills
        RETURN role { .id, .title, .domain, .seniority, requiredSkills: requiredSkills } AS role
        ORDER BY role.title
        `
      );
      return recordList(records, "role");
    },
    async getRecommendations({ currentSkillIds, targetRoleId }) {
      const roleRecords = await read(
        driver,
        `
        MATCH (target:Role {id: $targetRoleId})-[:REQUIRES]->(skill:Skill)
        RETURN target { .id, .title, .domain, .seniority } AS targetRole,
               collect(skill { .id, .name, .category }) AS requiredSkills
        `,
        { targetRoleId }
      );

      if (roleRecords.length === 0) {
        return { targetRole: null, knownSkills: [], missingSkills: [], courses: [], mentors: [], projects: [] };
      }

      const roleRecord = roleRecords[0];
      const requiredSkills = asNative(roleRecord.get("requiredSkills"));
      const current = new Set(currentSkillIds);
      const knownSkills = requiredSkills.filter((skill) => current.has(skill.id));
      const missingSkills = requiredSkills.filter((skill) => !current.has(skill.id));

      const [courseRecords, mentorRecords, projectRecords] = await Promise.all([
        // Find courses that teach any of the skills the user is missing
        // Note: we order by covers DESC to surface the most relevant courses first
        read(
          driver,
          `
          MATCH (:Role {id: $targetRoleId})-[:REQUIRES]->(missing:Skill)<-[:TEACHES]-(course:Course)
          WHERE NOT missing.id IN $currentSkillIds
          WITH course, collect(DISTINCT missing { .id, .name, .category }) AS skills
          WITH course, skills, size(skills) AS covers
          RETURN course { .id, .title, .provider, .hours, covers: covers, skills: skills } AS course
          ORDER BY covers DESC, course.hours ASC
          LIMIT 4
          `,
          { currentSkillIds, targetRoleId }
        ),
        // Find mentors who have at least 2 skills the user needs to learn
        read(
          driver,
          `
          MATCH (:Role {id: $targetRoleId})-[:REQUIRES]->(skill:Skill)<-[:HAS_SKILL]-(person:Person)
          OPTIONAL MATCH (person)-[:BUILT]->(project:Project)
          WITH person,
               collect(DISTINCT skill { .id, .name, .category }) AS skills,
               collect(DISTINCT project { .id, .name, .outcome }) AS projects
          WITH person, skills, projects, size(skills) AS overlap
          WHERE overlap >= 2
          RETURN person { .id, .name, .location, .headline, overlap: overlap, skills: skills, projects: projects } AS person
          ORDER BY overlap DESC, person.name ASC
          LIMIT 4
          `,
          { targetRoleId }
        ),
        read(
          driver,
          `
          MATCH (:Role {id: $targetRoleId})-[:REQUIRES]->(missing:Skill)<-[:BUILT_WITH]-(project:Project)
          WHERE NOT missing.id IN $currentSkillIds
          WITH project, collect(DISTINCT missing { .id, .name, .category }) AS skills
          WITH project, skills, size(skills) AS covers
          RETURN project { .id, .name, .outcome, covers: covers, skills: skills } AS project
          ORDER BY covers DESC, project.name ASC
          LIMIT 4
          `,
          { currentSkillIds, targetRoleId }
        )
      ]);

      return {
        targetRole: asNative(roleRecord.get("targetRole")),
        knownSkills,
        missingSkills,
        courses: asNative(recordList(courseRecords, "course")),
        mentors: asNative(recordList(mentorRecords, "person")),
        projects: asNative(recordList(projectRecords, "project"))
      };
    },
    async getGraph({ currentSkillIds, targetRoleId }) {
      const recommendation = await this.getRecommendations({ currentSkillIds, targetRoleId });
      if (!recommendation.targetRole) return { nodes: [], links: [] };

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
