import { sampleJobs } from "../jobs/sampleJobs";

export const EU_COUNTRIES = [
  "Austria",
  "Belgium",
  "Czechia",
  "Germany",
  "Luxembourg",
  "Netherlands",
  "Slovakia",
];

const greenhouseBoards = ["collibra"];
const leverSites = [];

const countryAliases = {
  Austria: ["austria", "vienna", "wien"],
  Belgium: ["belgium", "brussels", "bruxelles", "antwerp", "ghent"],
  Czechia: ["czechia", "czech republic", "prague", "praha", "brno"],
  Germany: ["germany", "berlin", "munich", "münchen", "hamburg", "cologne", "frankfurt"],
  Luxembourg: ["luxembourg"],
  Netherlands: ["netherlands", "amsterdam", "rotterdam", "utrecht", "eindhoven"],
  Slovakia: ["slovakia", "bratislava", "košice", "kosice"],
};

const skillVocabulary = [
  "React", "TypeScript", "JavaScript", "Python", "Java", "Kotlin", "Go", "C#", "SQL",
  "AWS", "Azure", "Kubernetes", "Docker", "Terraform", "PostgreSQL", "Machine Learning",
  "PyTorch", "Figma", "Analytics", "Security", "APIs", "SaaS", "CI/CD",
];

function stripHtml(value = "") {
  const documentNode = new DOMParser().parseFromString(value, "text/html");
  return documentNode.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function detectCountry(location = "") {
  const normalized = location.toLowerCase();
  return EU_COUNTRIES.find((country) =>
    countryAliases[country].some((alias) => normalized.includes(alias)),
  );
}

function detectRole(title = "") {
  const normalized = title.toLowerCase();
  if (/data|machine learning|analyst|scientist/.test(normalized)) return "Data";
  if (/design|ux|ui/.test(normalized)) return "Design";
  if (/product manager|product owner/.test(normalized)) return "Product";
  if (/sales|account|customer|solution/.test(normalized)) return "Customer Success";
  if (/market|content|brand|growth/.test(normalized)) return "Marketing";
  return "Engineering";
}

function detectSkills(text = "") {
  const normalized = text.toLowerCase();
  return skillVocabulary.filter((skill) => normalized.includes(skill.toLowerCase())).slice(0, 5);
}

function detectSponsorship(text = "") {
  const normalized = text.toLowerCase();
  if (/no (visa )?sponsorship|unable to sponsor|must have.*right to work/.test(normalized)) return false;
  return /visa|relocation|sponsor|immigration/.test(normalized);
}

async function fetchGreenhouse(board) {
  const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`);
  if (!response.ok) throw new Error(`Greenhouse ${board}: ${response.status}`);
  const { jobs } = await response.json();

  return jobs.map((job) => {
    const description = stripHtml(job.content);
    const location = job.location?.name ?? "Location not listed";
    return {
      id: `greenhouse-${board}-${job.id}`,
      title: job.title,
      company: board.charAt(0).toUpperCase() + board.slice(1),
      location,
      country: detectCountry(location),
      description: description.slice(0, 240),
      skills: detectSkills(`${job.title} ${description}`),
      role: detectRole(job.title),
      sponsorship: detectSponsorship(description),
      remote: /remote|hybrid/i.test(location),
      postedAt: job.updated_at,
      url: job.absolute_url,
      source: "Greenhouse",
    };
  });
}

async function fetchLever(site) {
  const response = await fetch(`https://api.lever.co/v0/postings/${site}?mode=json`);
  if (!response.ok) throw new Error(`Lever ${site}: ${response.status}`);
  const jobs = await response.json();

  return jobs.map((job) => {
    const description = stripHtml(`${job.descriptionPlain ?? ""} ${job.additionalPlain ?? ""}`);
    const location = job.categories?.location ?? "Location not listed";
    return {
      id: `lever-${site}-${job.id}`,
      title: job.text,
      company: site.charAt(0).toUpperCase() + site.slice(1),
      location,
      country: detectCountry(location),
      description: description.slice(0, 240),
      skills: detectSkills(`${job.text} ${description}`),
      role: detectRole(job.text),
      sponsorship: detectSponsorship(description),
      remote: /remote|hybrid/i.test(location) || job.workplaceType === "remote",
      postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : null,
      url: job.hostedUrl,
      source: "Lever",
    };
  });
}

async function fetchArbeitnow() {
  const response = await fetch("https://www.arbeitnow.com/api/job-board-api");
  if (!response.ok) throw new Error(`Arbeitnow: ${response.status}`);
  const { data: jobs } = await response.json();

  return jobs.map((job) => {
    const description = stripHtml(job.description);
    const location = job.location || "Location not listed";
    return {
      id: `arbeitnow-${job.slug}`,
      title: job.title,
      company: job.company_name,
      location,
      country: detectCountry(location),
      description: description.slice(0, 240),
      skills: detectSkills(`${job.title} ${job.tags?.join(" ") ?? ""} ${description}`),
      role: detectRole(job.title),
      sponsorship: Boolean(job.visa_sponsorship),
      remote: Boolean(job.remote),
      postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : null,
      url: job.url,
      source: "Arbeitnow",
    };
  });
}

export async function fetchJobs() {
  const requests = [
    ...greenhouseBoards.map(fetchGreenhouse),
    ...leverSites.map(fetchLever),
    fetchArbeitnow(),
  ];
  const results = await Promise.allSettled(requests);
  const liveJobs = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value)
    .filter((job) => job.country);

  const uniqueJobs = new Map([...liveJobs, ...sampleJobs].map((job) => [job.id, job]));
  return {
    jobs: [...uniqueJobs.values()],
    liveCount: liveJobs.length,
    failedSources: results.filter((result) => result.status === "rejected").length,
  };
}
