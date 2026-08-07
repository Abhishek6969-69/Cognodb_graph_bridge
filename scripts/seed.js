import dotenv from "dotenv";
import neo4j from "neo4j-driver";
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
} from "../src/demoData.js";

dotenv.config();

const uri = process.env.COGNODB_URI;
const user = process.env.COGNODB_USER || "cognodb";
const password = process.env.COGNODB_PASSWORD;

if (!uri || !password) {
  console.error("Missing COGNODB_URI or COGNODB_PASSWORD. Copy .env.example to .env and add CognoDB credentials.");
  process.exit(1);
}

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

async function write(session, cypher, params = {}) {
  await session.executeWrite((tx) => tx.run(cypher, params));
}

function relationshipRows(mapping, sourceKey, targetKey) {
  return Object.entries(mapping).flatMap(([sourceId, targetIds]) =>
    targetIds.map((targetId) => ({ [sourceKey]: sourceId, [targetKey]: targetId }))
  );
}

async function main() {
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });

  try {
    await write(session, "CREATE CONSTRAINT role_id IF NOT EXISTS FOR (role:Role) REQUIRE role.id IS UNIQUE");
    await write(session, "CREATE CONSTRAINT skill_id IF NOT EXISTS FOR (skill:Skill) REQUIRE skill.id IS UNIQUE");
    await write(session, "CREATE CONSTRAINT person_id IF NOT EXISTS FOR (person:Person) REQUIRE person.id IS UNIQUE");
    await write(session, "CREATE CONSTRAINT course_id IF NOT EXISTS FOR (course:Course) REQUIRE course.id IS UNIQUE");
    await write(session, "CREATE CONSTRAINT project_id IF NOT EXISTS FOR (project:Project) REQUIRE project.id IS UNIQUE");

    await write(
      session,
      `
      UNWIND $roles AS item
      MERGE (role:Role {id: item.id})
      SET role.title = item.title, role.domain = item.domain, role.seniority = item.seniority
      `,
      { roles }
    );
    await write(
      session,
      `
      UNWIND $skills AS item
      MERGE (skill:Skill {id: item.id})
      SET skill.name = item.name, skill.category = item.category
      `,
      { skills }
    );
    await write(
      session,
      `
      UNWIND $people AS item
      MERGE (person:Person {id: item.id})
      SET person.name = item.name, person.location = item.location, person.headline = item.headline
      `,
      { people }
    );
    await write(
      session,
      `
      UNWIND $courses AS item
      MERGE (course:Course {id: item.id})
      SET course.title = item.title, course.provider = item.provider, course.hours = item.hours
      `,
      { courses }
    );
    await write(
      session,
      `
      UNWIND $projects AS item
      MERGE (project:Project {id: item.id})
      SET project.name = item.name, project.outcome = item.outcome
      `,
      { projects }
    );

    await write(
      session,
      `
      UNWIND $rows AS row
      MATCH (role:Role {id: row.roleId})
      MATCH (skill:Skill {id: row.skillId})
      MERGE (role)-[:REQUIRES]->(skill)
      `,
      { rows: relationshipRows(roleRequirements, "roleId", "skillId") }
    );
    await write(
      session,
      `
      UNWIND $rows AS row
      MATCH (person:Person {id: row.personId})
      MATCH (skill:Skill {id: row.skillId})
      MERGE (person)-[:HAS_SKILL]->(skill)
      `,
      { rows: relationshipRows(personSkills, "personId", "skillId") }
    );
    await write(
      session,
      `
      UNWIND $rows AS row
      MATCH (course:Course {id: row.courseId})
      MATCH (skill:Skill {id: row.skillId})
      MERGE (course)-[:TEACHES]->(skill)
      `,
      { rows: relationshipRows(courseSkills, "courseId", "skillId") }
    );
    await write(
      session,
      `
      UNWIND $rows AS row
      MATCH (project:Project {id: row.projectId})
      MATCH (skill:Skill {id: row.skillId})
      MERGE (project)-[:BUILT_WITH]->(skill)
      `,
      { rows: relationshipRows(projectSkills, "projectId", "skillId") }
    );
    await write(
      session,
      `
      UNWIND $rows AS row
      MATCH (person:Person {id: row.personId})
      MATCH (project:Project {id: row.projectId})
      MERGE (person)-[:BUILT]->(project)
      `,
      { rows: relationshipRows(personProjects, "personId", "projectId") }
    );

    console.log("Seed complete: SkillBridge graph loaded into CognoDB.");
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(async (error) => {
  console.error(error.message);
  await driver.close();
  process.exit(1);
});
