// Reference data for selectors
MATCH (role:Role)
RETURN role { .id, .title, .domain, .seniority } AS role
ORDER BY role.title;

MATCH (skill:Skill)
RETURN skill { .id, .name, .category } AS skill
ORDER BY skill.category, skill.name;

// Multi-hop bridge query:
// target role -> missing skill <- course / project / person
// Parameters:
//   $targetRoleId: string
//   $currentSkillIds: list<string>
MATCH (target:Role {id: $targetRoleId})
MATCH (target)-[:REQUIRES]->(required:Skill)
WITH target, collect(required) AS requiredSkills, $currentSkillIds AS currentSkillIds
WITH target,
     [skill IN requiredSkills WHERE skill.id IN currentSkillIds] AS knownSkills,
     [skill IN requiredSkills WHERE NOT skill.id IN currentSkillIds] AS missingSkills,
     [skill IN requiredSkills | skill.id] AS requiredSkillIds
CALL {
  WITH missingSkills
  UNWIND missingSkills AS missing
  MATCH (course:Course)-[:TEACHES]->(missing)
  WITH course, collect(DISTINCT missing { .id, .name, .category }) AS skills
  RETURN collect(course { .id, .title, .provider, .hours, covers: size(skills), skills: skills })[0..4] AS courses
}
CALL {
  WITH requiredSkillIds
  MATCH (person:Person)-[:HAS_SKILL]->(skill:Skill)
  WHERE skill.id IN requiredSkillIds
  OPTIONAL MATCH (person)-[:BUILT]->(project:Project)
  WITH person,
       collect(DISTINCT skill { .id, .name, .category }) AS skills,
       collect(DISTINCT project { .id, .name, .outcome }) AS projects
  WHERE size(skills) >= 2
  RETURN collect(person { .id, .name, .location, .headline, overlap: size(skills), skills: skills, projects: projects })[0..4] AS mentors
}
CALL {
  WITH missingSkills
  UNWIND missingSkills AS missing
  MATCH (project:Project)-[:BUILT_WITH]->(missing)
  WITH project, collect(DISTINCT missing { .id, .name, .category }) AS skills
  RETURN collect(project { .id, .name, .outcome, covers: size(skills), skills: skills })[0..4] AS projects
}
RETURN target { .id, .title, .domain, .seniority } AS targetRole,
       [skill IN knownSkills | skill { .id, .name, .category }] AS knownSkills,
       [skill IN missingSkills | skill { .id, .name, .category }] AS missingSkills,
       courses,
       mentors,
       projects;

// Awkward-in-relational query:
// Find mentors who match at least two skills required by a target role,
// then surface projects they built that exercise those same skills.
MATCH (target:Role {id: $targetRoleId})-[:REQUIRES]->(skill:Skill)
MATCH (person:Person)-[:HAS_SKILL]->(skill)
OPTIONAL MATCH (person)-[:BUILT]->(project:Project)-[:BUILT_WITH]->(skill)
WITH person,
     collect(DISTINCT skill { .id, .name, .category }) AS matchedSkills,
     collect(DISTINCT project { .id, .name, .outcome }) AS proofProjects
WHERE size(matchedSkills) >= 2
RETURN person { .id, .name, .headline, .location } AS mentor,
       matchedSkills,
       proofProjects,
       size(matchedSkills) AS score
ORDER BY score DESC, mentor.name;
