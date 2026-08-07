export const roles = [
  { id: "product-analyst", title: "Product Analyst", domain: "Analytics", seniority: "Mid" },
  { id: "data-scientist", title: "Data Scientist", domain: "AI & Data", seniority: "Mid" },
  { id: "ml-engineer", title: "Machine Learning Engineer", domain: "AI & Data", seniority: "Senior" },
  { id: "growth-pm", title: "Growth Product Manager", domain: "Product", seniority: "Senior" },
  { id: "graph-engineer", title: "Graph Data Engineer", domain: "Data Platform", seniority: "Senior" },
  { id: "ai-solutions-architect", title: "AI Solutions Architect", domain: "AI & Data", seniority: "Lead" }
];

export const skills = [
  { id: "sql", name: "SQL", category: "Data" },
  { id: "python", name: "Python", category: "Programming" },
  { id: "statistics", name: "Statistics", category: "Analytics" },
  { id: "experimentation", name: "Experimentation", category: "Product" },
  { id: "stakeholder-storytelling", name: "Stakeholder storytelling", category: "Communication" },
  { id: "machine-learning", name: "Machine learning", category: "AI" },
  { id: "feature-engineering", name: "Feature engineering", category: "AI" },
  { id: "mlops", name: "MLOps", category: "Infrastructure" },
  { id: "graph-modeling", name: "Graph modeling", category: "Data" },
  { id: "cypher", name: "Cypher", category: "Data" },
  { id: "cloud-architecture", name: "Cloud architecture", category: "Infrastructure" },
  { id: "prompt-engineering", name: "Prompt engineering", category: "AI" }
];

export const people = [
  { id: "maya", name: "Maya Chen", location: "Bengaluru", headline: "Product Analyst turned Data Scientist" },
  { id: "arjun", name: "Arjun Rao", location: "Mumbai", headline: "Graph platform engineer" },
  { id: "leah", name: "Leah Brooks", location: "Remote", headline: "AI solutions lead" },
  { id: "nora", name: "Nora Singh", location: "Delhi", headline: "Growth PM with experimentation depth" },
  { id: "ibrahim", name: "Ibrahim Khan", location: "Hyderabad", headline: "MLOps specialist" },
  { id: "zoe", name: "Zoe Patel", location: "Pune", headline: "Data scientist in marketplace ranking" }
];

export const courses = [
  { id: "cypher-paths", title: "Cypher for Connected Data", provider: "Graph Academy", hours: 10 },
  { id: "mlops-bootcamp", title: "Production MLOps Bootcamp", provider: "CloudLab", hours: 18 },
  { id: "experiments", title: "Practical Experiment Design", provider: "Measure School", hours: 7 },
  { id: "applied-ml", title: "Applied Machine Learning", provider: "Open Learning", hours: 24 },
  { id: "solution-design", title: "AI Solution Design Patterns", provider: "ArchGuild", hours: 12 }
];

export const projects = [
  { id: "churn-model", name: "Churn Prediction Model", outcome: "Reduced churn by 9%" },
  { id: "recommendation-graph", name: "Recommendation Graph", outcome: "Improved cold-start discovery" },
  { id: "ab-testing-platform", name: "A/B Testing Platform", outcome: "Standardized experiment reads" },
  { id: "rag-assistant", name: "RAG Support Assistant", outcome: "Cut first-response time by 31%" },
  { id: "feature-store", name: "Feature Store Migration", outcome: "Reusable model features" }
];

export const roleRequirements = {
  "product-analyst": ["sql", "statistics", "experimentation", "stakeholder-storytelling"],
  "data-scientist": ["sql", "python", "statistics", "machine-learning", "feature-engineering"],
  "ml-engineer": ["python", "machine-learning", "feature-engineering", "mlops", "cloud-architecture"],
  "growth-pm": ["experimentation", "statistics", "stakeholder-storytelling", "sql"],
  "graph-engineer": ["python", "graph-modeling", "cypher", "cloud-architecture"],
  "ai-solutions-architect": ["cloud-architecture", "prompt-engineering", "machine-learning", "stakeholder-storytelling"]
};

export const personSkills = {
  maya: ["sql", "python", "statistics", "machine-learning", "feature-engineering"],
  arjun: ["python", "graph-modeling", "cypher", "cloud-architecture", "sql"],
  leah: ["cloud-architecture", "prompt-engineering", "machine-learning", "stakeholder-storytelling"],
  nora: ["experimentation", "statistics", "stakeholder-storytelling", "sql"],
  ibrahim: ["python", "machine-learning", "feature-engineering", "mlops", "cloud-architecture"],
  zoe: ["sql", "python", "statistics", "machine-learning", "experimentation"]
};

export const projectSkills = {
  "churn-model": ["python", "statistics", "machine-learning", "feature-engineering"],
  "recommendation-graph": ["graph-modeling", "cypher", "python", "machine-learning"],
  "ab-testing-platform": ["sql", "statistics", "experimentation", "stakeholder-storytelling"],
  "rag-assistant": ["prompt-engineering", "cloud-architecture", "python", "machine-learning"],
  "feature-store": ["feature-engineering", "mlops", "cloud-architecture", "python"]
};

export const courseSkills = {
  "cypher-paths": ["cypher", "graph-modeling"],
  "mlops-bootcamp": ["mlops", "cloud-architecture"],
  experiments: ["experimentation", "statistics"],
  "applied-ml": ["python", "machine-learning", "feature-engineering"],
  "solution-design": ["prompt-engineering", "cloud-architecture", "stakeholder-storytelling"]
};

export const personProjects = {
  maya: ["churn-model"],
  arjun: ["recommendation-graph"],
  leah: ["rag-assistant"],
  nora: ["ab-testing-platform"],
  ibrahim: ["feature-store"],
  zoe: ["churn-model", "ab-testing-platform"]
};
