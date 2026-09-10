const ignoredWords = new Set([
  "about", "after", "also", "and", "are", "been", "but", "can", "for", "from", "have",
  "into", "more", "our", "that", "the", "their", "this", "through", "using", "was", "were",
  "will", "with", "work", "your", "years", "you",
]);

function tokenize(value) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9+#.\-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !ignoredWords.has(word)),
  );
}

export function scoreJob(job, resumeText) {
  if (!resumeText.trim()) return null;
  const resumeTokens = tokenize(resumeText);
  const titleTokens = tokenize(job.title);
  const skillTokens = tokenize(job.skills.join(" "));
  const descriptionTokens = tokenize(job.description);

  const matchedSkills = job.skills.filter((skill) => resumeText.toLowerCase().includes(skill.toLowerCase()));
  const titleMatches = [...titleTokens].filter((token) => resumeTokens.has(token)).length;
  const descriptionMatches = [...descriptionTokens].filter((token) => resumeTokens.has(token)).length;
  const skillMatches = [...skillTokens].filter((token) => resumeTokens.has(token)).length;
  const rawScore = skillMatches * 12 + titleMatches * 10 + Math.min(descriptionMatches, 8) * 3;

  return {
    score: Math.min(98, Math.max(18, 28 + rawScore)),
    matchedSkills,
  };
}

async function readPdf(file) {
  const pdfjs = await import("pdfjs-dist");
  const { default: workerSrc } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pages = await Promise.all(
    Array.from({ length: pdf.numPages }, async (_, index) => {
      const page = await pdf.getPage(index + 1);
      const content = await page.getTextContent();
      return content.items.map((item) => item.str).join(" ");
    }),
  );
  return pages.join(" ");
}

async function readDocx(file) {
  const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

export async function extractResumeText(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return readPdf(file);
  if (extension === "docx") return readDocx(file);
  if (extension === "txt") return file.text();
  throw new Error("Please upload a PDF, DOCX, or TXT resume.");
}
