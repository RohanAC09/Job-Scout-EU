import { useDeferredValue, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  FileText,
  Filter,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { EU_COUNTRIES, fetchJobs } from "./services/jobs";
import { extractResumeText, scoreJob } from "./utils/resume";

const roles = ["All roles", "Engineering", "Backend", "Full Stack", "Product", "Customer Success", "Application Support"];
const skillOptions = ["React", "TypeScript", "JavaScript", "Python", "Java", "AWS", "Kubernetes", "SQL", "Figma", "Machine Learning"];

function formatDate(date) {
  if (!date) return "Recently added";
  const days = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function ResumePanel({ resume, uploadState, error, onUpload, onRemove }) {
  const inputRef = useRef(null);

  return (
    <aside className="resume-panel" aria-labelledby="resume-title">
      <div className="panel-heading">
        <span className="icon-tile"><Sparkles size={17} /></span>
        <div>
          <p className="eyebrow">Match intelligence</p>
          <h2 id="resume-title">Your resume</h2>
        </div>
      </div>

      {resume ? (
        <div className="resume-ready">
          <div className="file-row">
            <span className="file-icon"><FileText size={20} /></span>
            <div className="file-copy">
              <strong>{resume.name}</strong>
              <span>{Math.ceil(resume.size / 1024)} KB · Ready to match</span>
            </div>
            <button className="icon-button" onClick={onRemove} aria-label="Remove resume" title="Remove resume">
              <X size={17} />
            </button>
          </div>
          <div className="success-note"><Check size={15} /> Jobs are ranked for your experience</div>
        </div>
      ) : (
        <button className="upload-zone" onClick={() => inputRef.current?.click()} disabled={uploadState === "reading"}>
          {uploadState === "reading" ? <LoaderCircle className="spin" size={25} /> : <Upload size={25} />}
          <strong>{uploadState === "reading" ? "Reading resume..." : "Upload your resume"}</strong>
          <span>PDF, DOCX or TXT · max 5 MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0])}
      />
      {error && <p className="upload-error">{error}</p>}

      <div className="privacy-note">
        <ShieldCheck size={16} />
        <p><strong>Private by design</strong><span>Parsing and matching happen in your browser.</span></p>
      </div>
      <div className="match-legend">
        <p>Match score</p>
        <div><span className="legend-dot high" /> 80–100 Strong</div>
        <div><span className="legend-dot medium" /> 60–79 Good</div>
        <div><span className="legend-dot low" /> Below 60 Explore</div>
      </div>
    </aside>
  );
}

function JobCard({ job, match, saved, onSave }) {
  const initials = job.company.slice(0, 2).toUpperCase();
  const scoreClass = match?.score >= 80 ? "high" : match?.score >= 60 ? "medium" : "low";

  return (
    <article className="job-card">
      <div className="job-card-main">
        <div className={`company-mark mark-${job.company.length % 4}`}>{initials}</div>
        <div className="job-content">
          <div className="job-heading-row">
            <div>
              <div className="source-line"><span>{job.source}</span> · {formatDate(job.postedAt)}</div>
              <h3>{job.title}</h3>
              <p className="company-name">{job.company}</p>
            </div>
            {match && (
              <div className={`match-score ${scoreClass}`} aria-label={`${match.score} percent resume match`}>
                <strong>{match.score}%</strong><span>match</span>
              </div>
            )}
          </div>
          <div className="job-meta">
            <span><MapPin size={15} /> {job.location}</span>
            {job.remote && <span className="meta-chip">Remote friendly</span>}
            {job.sponsorship && <span className="visa-chip"><ShieldCheck size={14} /> Visa support</span>}
          </div>
          <p className="job-description">{job.description || "View the full role description on the company job page."}</p>
          <div className="skill-row">
            {(job.skills.length ? job.skills : [job.role]).slice(0, 4).map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
            {match?.matchedSkills.length > 0 && <em>{match.matchedSkills.length} skill match{match.matchedSkills.length > 1 ? "es" : ""}</em>}
          </div>
        </div>
      </div>
      <div className="card-actions">
        <button className={`save-button ${saved ? "saved" : ""}`} onClick={() => onSave(job.id)} aria-label={saved ? "Remove saved job" : "Save job"} title={saved ? "Remove saved job" : "Save job"}>
          <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        <a className="apply-button" href={job.url} target="_blank" rel="noreferrer">View job <ArrowUpRight size={17} /></a>
      </div>
    </article>
  );
}

function App() {
  const [jobs, setJobs] = useState([]);
  const [status, setStatus] = useState("loading");
  const [sourceInfo, setSourceInfo] = useState({ liveCount: 0, failedSources: 0 });
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [country, setCountry] = useState("All countries");
  const [role, setRole] = useState("All roles");
  const [skills, setSkills] = useState([]);
  const [visaOnly, setVisaOnly] = useState(false);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sort, setSort] = useState("newest");
  const [resume, setResume] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [uploadState, setUploadState] = useState("idle");
  const [uploadError, setUploadError] = useState("");
  const [savedJobs, setSavedJobs] = useState(() => JSON.parse(localStorage.getItem("rolescout-saved") || "[]"));
  const [filtersOpen, setFiltersOpen] = useState(false);

  async function loadJobs() {
    setStatus("loading");
    try {
      const result = await fetchJobs();
      setJobs(result.jobs);
      setSourceInfo(result);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => { loadJobs(); }, []);
  useEffect(() => { localStorage.setItem("rolescout-saved", JSON.stringify(savedJobs)); }, [savedJobs]);

  async function handleResume(file) {
    setUploadError("");
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("That file is over the 5 MB limit.");
      return;
    }
    setUploadState("reading");
    try {
      const text = await extractResumeText(file);
      if (text.trim().length < 40) throw new Error("We could not find enough readable text in that resume.");
      setResume(file);
      setResumeText(text);
      setSort("relevance");
      setUploadState("ready");
    } catch (error) {
      setUploadState("error");
      setUploadError(error.message);
    }
  }

  function toggleSkill(skill) {
    setSkills((current) => current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]);
  }

  function clearFilters() {
    setSearch("");
    setCountry("All countries");
    setRole("All roles");
    setSkills([]);
    setVisaOnly(false);
    setRemoteOnly(false);
  }

  const query = deferredSearch.trim().toLowerCase();
  const visibleJobs = jobs
    .map((job) => ({ ...job, match: scoreJob(job, resumeText) }))
    .filter((job) => !query || `${job.title} ${job.company} ${job.description} ${job.skills.join(" ")}`.toLowerCase().includes(query))
    .filter((job) => country === "All countries" || job.country === country)
    .filter((job) => role === "All roles" || job.role === role)
    .filter((job) => skills.length === 0 || skills.every((skill) => job.skills.includes(skill)))
    .filter((job) => !visaOnly || job.sponsorship)
    .filter((job) => !remoteOnly || job.remote)
    .sort((first, second) => {
      if (sort === "relevance") return (second.match?.score ?? 0) - (first.match?.score ?? 0);
      if (sort === "title") return first.title.localeCompare(second.title);
      return new Date(second.postedAt || 0) - new Date(first.postedAt || 0);
    });

  const activeFilterCount = [country !== "All countries", role !== "All roles", skills.length > 0, visaOnly, remoteOnly].filter(Boolean).length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="RoleScout home"><span className="brand-mark"><BriefcaseBusiness size={20} /></span><strong>RoleScout</strong><small>EU</small></a>
        <div className="header-status"><span className={status === "loading" ? "pulse" : ""} /> {status === "loading" ? "Syncing job boards" : `${sourceInfo.liveCount} live roles synced`}</div>
        <button className="saved-link"><Bookmark size={17} /> Saved <span>{savedJobs.length}</span></button>
      </header>

      <section className="intro" id="top">
        <div>
          <p className="eyebrow">Seven countries · One focused search</p>
          <h1>Find work that fits<br /><em>where you’re going.</em></h1>
        </div>
        <p className="intro-copy">Fresh roles from trusted job boards across Europe, ranked against the experience you already have.</p>
      </section>

      <main className="workspace">
        <section className="search-area" aria-label="Job search">
          <div className="search-bar">
            <Search size={20} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles, skills or companies" aria-label="Search jobs" />
            {search && <button className="icon-button" onClick={() => setSearch("")} aria-label="Clear search"><X size={17} /></button>}
            <div className="country-select"><MapPin size={16} /><select value={country} onChange={(event) => setCountry(event.target.value)} aria-label="Country"><option>All countries</option>{EU_COUNTRIES.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={15} /></div>
            <button className="mobile-filter-button" onClick={() => setFiltersOpen(!filtersOpen)}><Filter size={17} /> Filters {activeFilterCount > 0 && <span>{activeFilterCount}</span>}</button>
          </div>

          <div className={`filters ${filtersOpen ? "open" : ""}`}>
            <div className="filter-block">
              <label htmlFor="role">Role</label>
              <div className="select-wrap"><select id="role" value={role} onChange={(event) => setRole(event.target.value)}>{roles.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={15} /></div>
            </div>
            <div className="filter-block skills-filter">
              <label>Skills</label>
              <div className="skill-options">{skillOptions.map((skill) => <button key={skill} className={skills.includes(skill) ? "active" : ""} onClick={() => toggleSkill(skill)}>{skill}{skills.includes(skill) && <X size={13} />}</button>)}</div>
            </div>
            <div className="filter-block toggles">
              <label>Preferences</label>
              <button className={`toggle ${visaOnly ? "on" : ""}`} onClick={() => setVisaOnly(!visaOnly)} role="switch" aria-checked={visaOnly}><span /> Visa support</button>
              <button className={`toggle ${remoteOnly ? "on" : ""}`} onClick={() => setRemoteOnly(!remoteOnly)} role="switch" aria-checked={remoteOnly}><span /> Remote friendly</button>
            </div>
            {activeFilterCount > 0 && <button className="clear-button" onClick={clearFilters}>Clear filters</button>}
          </div>
        </section>

        <div className="content-grid">
          <ResumePanel resume={resume} uploadState={uploadState} error={uploadError} onUpload={handleResume} onRemove={() => { setResume(null); setResumeText(""); setUploadState("idle"); setSort("newest"); }} />
          <section className="results" aria-live="polite">
            <div className="results-toolbar">
              <div><h2>{status === "loading" ? "Finding roles..." : `${visibleJobs.length} roles found`}</h2><p>{sourceInfo.failedSources > 0 ? "Live results plus verified fallback listings" : "Live results from connected job boards"}</p></div>
              <label>Sort by <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="relevance" disabled={!resume}>Resume match</option><option value="title">Job title</option></select><ChevronDown size={14} /></label>
            </div>

            {status === "loading" && <div className="loading-state"><LoaderCircle className="spin" /><p>Gathering jobs from across Europe</p></div>}
            {status === "error" && <div className="empty-state"><h3>We couldn’t load the job feed.</h3><p>Check your connection and try once more.</p><button onClick={loadJobs}><RefreshCw size={16} /> Retry</button></div>}
            {status === "ready" && visibleJobs.length === 0 && <div className="empty-state"><h3>No exact matches yet.</h3><p>Try removing a skill or widening your country selection.</p><button onClick={clearFilters}>Clear filters</button></div>}
            {status === "ready" && visibleJobs.map((job) => <JobCard key={job.id} job={job} match={job.match} saved={savedJobs.includes(job.id)} onSave={(id) => setSavedJobs((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} />)}
          </section>
        </div>
      </main>

      <footer><span>RoleScout</span><p>Jobs remain subject to availability on each company’s career site.</p><a href="#top">Back to top</a></footer>
    </div>
  );
}

export default App;