import React, { useState, useEffect, useRef } from "react";
import {
  Shield, Search, Brain, MessageSquare, FileText, TrendingUp, TrendingDown,
  AlertTriangle, Target, Send, Loader2, CheckCircle2, Sparkles, GraduationCap,
  Briefcase, ArrowRight, ChevronRight, RotateCcw, Radio, Sun, Moon, Zap,
  Bell, BarChart3, MapPin, Clock3, ShieldCheck, Wand2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Data pulled straight from the CareerShield project brief            */
/* ------------------------------------------------------------------ */

const COMPANIES = [
  { name: "TCS", cuts: "23,400", driver: "AI productivity compression", status: "Confirmed", x: 68, y: 30, size: 26 },
  { name: "Oracle (India units)", cuts: "~12,000", driver: "Global restructuring", status: "Confirmed", x: 26, y: 24, size: 19 },
  { name: "Startups (Q1, aggregate)", cuts: "~1,700", driver: "AI-led lean teams", status: "Reported", x: 63, y: 70, size: 12 },
  { name: "Flipkart", cuts: "~500", driver: "Annual performance review", status: "Reported", x: 20, y: 63, size: 9 },
  { name: "Zupee", cuts: "~200", driver: "Regulatory disruption", status: "Reported", x: 44, y: 47, size: 7 },
];

const STATS = [
  { label: "IT jobs at risk, 2026", value: "35,000", Icon: AlertTriangle, tone: "amber" },
  { label: "AI-skill shortfall by 2026", value: "14L", Icon: Brain, tone: "cyan" },
  { label: "YoY overall IT hiring", value: "-3%", Icon: TrendingDown, tone: "red" },
  { label: "YoY AI-role hiring", value: "+16%", Icon: TrendingUp, tone: "green" },
];

const DOMAINS = [
  "AI/ML Engineer", "Full-Stack Developer", "Data Analyst", "Cloud/DevOps Engineer",
  "Mechanical Engineer", "Civil Engineer", "Electronics Engineer", "Marketing / Sales", "Finance / Accounting",
];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];
const MAX_Q = 4;

const SECTOR_IMPACT = [
  { sector: "IT Services & Consulting", impact: 78 },
  { sector: "Product Startups", impact: 52 },
  { sector: "E-commerce & Retail Tech", impact: 45 },
  { sector: "EdTech & FinTech", impact: 38 },
  { sector: "BPO / ITES", impact: 61 },
];

const REGION_HOTSPOTS = [
  { city: "Bengaluru", risk: "High" },
  { city: "Chennai", risk: "High" },
  { city: "Hyderabad", risk: "Medium" },
  { city: "Pune", risk: "Medium" },
  { city: "NCR / Gurugram", risk: "Medium" },
  { city: "Kolkata", risk: "Low" },
];

const INTERVIEW_EXPECTATIONS = [
  "4 questions, mixed technical + behavioral",
  "Instant AI feedback after every answer",
  "A final readiness score you can act on",
];

const TABS = [
  { id: "overview", label: "Overview", Icon: Shield },
  { id: "radar", label: "Layoff Radar", Icon: Search },
  { id: "skills", label: "Skill Gap Analyzer", Icon: Brain },
  { id: "interview", label: "Mock Interview", Icon: MessageSquare },
  { id: "resume", label: "Resume Checker", Icon: FileText },
];

/* ------------------------------------------------------------------ */
/* Claude API helper                                                   */
/* ------------------------------------------------------------------ */

async function askClaude(prompt) {
  // Calls our own serverless function (api/claude.js) so the Anthropic
  // API key stays on the server and is never exposed to the browser.
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await response.json();
  if (!response.ok) {
    const msg =
      (data && data.error && (data.error.message || data.error)) ||
      JSON.stringify(data) ||
      `HTTP ${response.status}`;
    throw new Error(`Backend error: ${msg}`);
  }
  const text = (data.content || []).map((b) => b.text || "").join("\n");
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Could not parse AI response: ${cleaned.slice(0, 200)}`);
  }
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function Eyebrow({ children }) {
  return <div className="eyebrow">{children}</div>;
}

function Gauge({ score, label }) {
  const s = Math.max(0, Math.min(100, score || 0));
  return (
    <div className="gauge-wrap">
      <div
        className="gauge"
        style={{ background: `conic-gradient(var(--cyan) ${s * 3.6}deg, var(--panel-2) 0deg)` }}
      >
        <div className="gauge-inner">
          <span className="gauge-num">{s}</span>
          <span className="gauge-pct">/100</span>
        </div>
      </div>
      {label && <div className="gauge-label">{label}</div>}
    </div>
  );
}

function ErrorNote({ msg }) {
  if (!msg) return null;
  return (
    <div className="error-note">
      <AlertTriangle size={15} /> {msg}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Radar visualization (signature element)                             */
/* ------------------------------------------------------------------ */

function RadarViz() {
  const [active, setActive] = useState(null);
  return (
    <div className="radar-viz">
      <div className="radar-ring r3" />
      <div className="radar-ring r2" />
      <div className="radar-ring r1" />
      <div className="radar-sweep" />
      <div className="radar-cross radar-cross-h" />
      <div className="radar-cross radar-cross-v" />
      {COMPANIES.map((c) => (
        <div
          key={c.name}
          className="blip-hit"
          style={{ left: `${c.x}%`, top: `${c.y}%` }}
          onMouseEnter={() => setActive(c.name)}
          onMouseLeave={() => setActive(null)}
          onClick={() => setActive(active === c.name ? null : c.name)}
        >
          <span
            className="blip-ping"
            style={{ width: c.size, height: c.size, background: c.status === "Confirmed" ? "var(--red)" : "var(--amber)" }}
          />
          <span
            className="blip-dot"
            style={{ width: c.size * 0.5, height: c.size * 0.5, background: c.status === "Confirmed" ? "var(--red)" : "var(--amber)" }}
          />
          {active === c.name && (
            <div className="blip-tag">
              <strong>{c.name}</strong>
              <span>{c.cuts} roles &middot; {c.driver}</span>
            </div>
          )}
        </div>
      ))}
      <div className="radar-center">
        <Shield size={22} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview tab                                                        */
/* ------------------------------------------------------------------ */

function OverviewTab({ goTo }) {
  return (
    <div className="tab-pane overview">
      <section className="hero">
        <div className="hero-copy">
          <Eyebrow>PROJECT EXPO 2026 &middot; LIVE DEMO</Eyebrow>
          <h1>The shift nobody warned them about.</h1>
          <p className="hero-sub">
            India's IT sector is being reshaped by AI faster than its workforce can adapt.
            CareerShield tracks the layoffs, scores the gap, and gets you ready before it's your turn.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => goTo("radar")}>
              Scan the Radar <ArrowRight size={16} />
            </button>
            <button className="btn btn-ghost" onClick={() => goTo("skills")}>
              Check my AI-Ready score
            </button>
          </div>
        </div>
        <RadarViz />
      </section>

      <section className="command-strip">
        <div className="command-status"><span className="status-dot" /> CAREERSHIELD INTELLIGENCE ONLINE</div>
        <div className="command-meta"><Clock3 size={13} /> Updated for 2026 hiring signals</div>
        <div className="command-meta"><ShieldCheck size={13} /> Privacy-first career tools</div>
      </section>

      <section className="stat-grid">
        {STATS.map((s) => (
          <div className={`stat-card tone-${s.tone}`} key={s.label}>
            <div className="stat-icon"><s.Icon size={18} /></div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="quick-grid">
        <div className="quick-card quick-feature">
          <div className="quick-icon"><Zap size={19} /></div>
          <div>
            <div className="quick-kicker">THIS WEEK</div>
            <div className="quick-title">Your career action list</div>
            <div className="quick-copy">Scan market risk → close one AI skill gap → rehearse one interview answer.</div>
          </div>
        </div>
        <button className="quick-card" onClick={() => goTo("skills")}>
          <div className="quick-icon"><BarChart3 size={19} /></div>
          <div><div className="quick-kicker">01</div><div className="quick-title">Score yourself</div><div className="quick-copy">Get an AI-Ready Index in seconds.</div></div>
          <ArrowRight size={17} />
        </button>
        <button className="quick-card" onClick={() => goTo("resume")}>
          <div className="quick-icon"><Wand2 size={19} /></div>
          <div><div className="quick-kicker">02</div><div className="quick-title">Polish your resume</div><div className="quick-copy">Improve ATS match + your professional summary.</div></div>
          <ArrowRight size={17} />
        </button>
      </section>

      <section className="paradox">
        <Eyebrow>THE PARADOX</Eyebrow>
        <h2>Shrinking overall, surging in AI.</h2>
        <p className="muted">Same industry, two opposite hiring curves — that gap is exactly what CareerShield helps people cross.</p>
        <div className="bar-compare">
          <div className="bar-row">
            <span className="bar-name">Overall IT hiring</span>
            <div className="bar-track"><div className="bar-fill bar-neg" style={{ width: "20%" }} /></div>
            <span className="bar-val neg">-3%</span>
          </div>
          <div className="bar-row">
            <span className="bar-name">AI-specific roles</span>
            <div className="bar-track"><div className="bar-fill bar-pos" style={{ width: "88%" }} /></div>
            <span className="bar-val pos">+16%</span>
          </div>
        </div>
      </section>

      <section className="loop">
        <Eyebrow>THE SOLUTION</Eyebrow>
        <h2>One platform, full loop.</h2>
        <p className="muted">Every feature feeds the next — detect risk, close the gap, prove you're ready.</p>
        <div className="loop-row">
          {[
            { id: "radar", Icon: Search, title: "Layoff Radar", desc: "Surfaces company-wise cuts in real time" },
            { id: "skills", Icon: Brain, title: "Skill Gap Analyzer", desc: "Scores your profile, ranks what to learn first" },
            { id: "interview", Icon: MessageSquare, title: "AI Mock Interview", desc: "Technical + HR practice with instant feedback" },
            { id: "resume", Icon: FileText, title: "Resume Checker", desc: "Scores your resume against AI-role ATS filters" },
          ].map((f, i) => (
            <React.Fragment key={f.id}>
              <button className="loop-card" onClick={() => goTo(f.id)}>
                <f.Icon size={20} />
                <div className="loop-title">{f.title}</div>
                <div className="loop-desc">{f.desc}</div>
              </button>
              {i < 3 && <ChevronRight className="loop-arrow" size={18} />}
            </React.Fragment>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Layoff Radar tab                                                    */
/* ------------------------------------------------------------------ */

function LayoffRadarTab() {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const rows = COMPANIES.filter((c) =>
    (filter === "All" || c.status === filter) &&
    c.name.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <div className="tab-pane">
      <Eyebrow>LAYOFF RADAR</Eyebrow>
      <h2>Who's cutting, who's hiring.</h2>
      <p className="muted">Curated from recent industry reporting — the platform auto-refreshes this table from a live news feed.</p>

      <div className="radar-toolbar">
        <div className="filter-row">
          {["All", "Confirmed", "Reported"].map((f) => (
            <button key={f} className={`chip ${filter === f ? "chip-active" : ""}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <div className="search-box">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search company…" />
        </div>
      </div>

      <div className="table-wrap">
        <table className="radar-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Jobs cut</th>
              <th>Driver</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.name}>
                <td className="cell-name">{c.name}</td>
                <td className="cell-num">{c.cuts}</td>
                <td className="muted">{c.driver}</td>
                <td>
                  <span className={`status-pill ${c.status === "Confirmed" ? "status-red" : "status-amber"}`}>
                    <Radio size={11} /> {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="sub-section">
        <Eyebrow>SECTOR IMPACT</Eyebrow>
        <h2>Where the pressure is highest.</h2>
        <p className="muted">How exposed each part of the industry is to AI-driven restructuring right now.</p>
        <div className="sector-list">
          {SECTOR_IMPACT.map((s) => (
            <div className="sector-row" key={s.sector}>
              <span className="sector-name">{s.sector}</span>
              <div className="bar-track"><div className="bar-fill bar-neg" style={{ width: `${s.impact}%` }} /></div>
              <span className="sector-val">{s.impact}%</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sub-section">
        <Eyebrow>REGIONAL HOTSPOTS</Eyebrow>
        <h2>Which cities feel it first.</h2>
        <p className="muted">IT hub cities ranked by current layoff exposure, based on recent industry reporting.</p>
        <div className="hotspot-grid">
          {REGION_HOTSPOTS.map((r) => (
            <div className={`hotspot-card risk-${r.risk.toLowerCase()}`} key={r.city}>
              <span className="hotspot-city">{r.city}</span>
              <span className="hotspot-risk">{r.risk} risk</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skill Gap Analyzer tab                                              */
/* ------------------------------------------------------------------ */

function SkillGapTab() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const prompt = `You are the AI Skill Gap Analyzer inside CareerShield, a career-protection platform for India's IT workforce navigating the AI-driven hiring shift of 2026. A user submitted this skills profile:
"""
${input}
"""
Score how ready this profile is for AI-era IT roles in India right now, and identify the top priorities. Also sketch a short 3-phase learning roadmap, estimate the average AI-Ready score of a typical mid-level IT professional in India for comparison, recommend 2-3 relevant certifications, and suggest 2 alternate career paths this profile could realistically pivot into. Be honest and specific, not generic. Return ONLY minified JSON, no markdown, in exactly this shape:
{"score": <integer 0-100, AI-Ready Index>, "summary": "<one or two direct sentences on where they stand>", "topSkills": [{"skill": "<skill name>", "reason": "<why it matters now, one sentence>"}, {"skill": "...", "reason": "..."}, {"skill": "...", "reason": "..."}], "strengths": ["<existing strength>", "<existing strength>"], "roadmap": [{"phase": "<e.g. Weeks 1-2>", "action": "<concrete action>"}, {"phase": "<e.g. Weeks 3-6>", "action": "<concrete action>"}, {"phase": "<e.g. Weeks 7-12>", "action": "<concrete action>"}], "marketBenchmark": <integer 0-100, typical peer average>, "certifications": [{"name": "<certification name>", "reason": "<why it helps, one sentence>"}, {"name": "...", "reason": "..."}], "alternatePaths": [{"role": "<alternate role title>", "reason": "<why it's a realistic pivot, one sentence>"}, {"role": "...", "reason": "..."}]}`;
      const res = await askClaude(prompt);
      setResult(res);
    } catch (e) {
      setError(e.message || "Couldn't reach the AI engine. Check your connection and try again.");
    }
    setLoading(false);
  };

  return (
    <div className="tab-pane">
      <Eyebrow>CORE FEATURE</Eyebrow>
      <h2>AI Skill Gap Analyzer.</h2>
      <p className="muted">Paste your current skills or a resume snippet — Claude compares it against live AI-era market demand and scores it.</p>

      <div className="panel">
        <textarea
          className="textarea"
          placeholder="e.g. Java, Spring Boot, manual QA testing, SQL, 3 years experience in banking domain..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={5}
        />
        <div className="panel-actions">
          <span className="hint">{input.length} characters</span>
          <button className="btn btn-primary" onClick={analyze} disabled={loading || !input.trim()}>
            {loading ? <><Loader2 size={16} className="spin" /> Analyzing…</> : <><Sparkles size={16} /> Get my AI-Ready Score</>}
          </button>
        </div>
        <ErrorNote msg={error} />
      </div>

      {result && (
        <div className="result-grid">
          <div className="panel result-score">
            <Gauge score={result.score} label="AI-READY INDEX" />
            <p className="result-summary">{result.summary}</p>
            {Array.isArray(result.strengths) && result.strengths.length > 0 && (
              <div className="chip-row">
                {result.strengths.map((s, i) => (
                  <span className="chip chip-static" key={i}><CheckCircle2 size={13} /> {s}</span>
                ))}
              </div>
            )}
          </div>
          <div className="panel result-priorities">
            <div className="panel-title"><Target size={16} /> Close these gaps first</div>
            {(result.topSkills || []).map((s, i) => (
              <div className="priority-row" key={i}>
                <span className="priority-num">{i + 1}</span>
                <div>
                  <div className="priority-skill">{s.skill}</div>
                  <div className="priority-reason muted">{s.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && Array.isArray(result.roadmap) && result.roadmap.length > 0 && (
        <section className="sub-section">
          <Eyebrow>YOUR ROADMAP</Eyebrow>
          <h2>A 90-day plan to close the gap.</h2>
          <div className="roadmap-track">
            {result.roadmap.map((r, i) => (
              <div className="roadmap-step" key={i}>
                <div className="roadmap-dot">{i + 1}</div>
                <div className="roadmap-phase">{r.phase}</div>
                <div className="roadmap-action muted">{r.action}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {result && typeof result.marketBenchmark === "number" && (
        <section className="sub-section">
          <Eyebrow>HOW YOU COMPARE</Eyebrow>
          <h2>You vs the market average.</h2>
          <p className="muted">Benchmarked against a typical mid-level IT professional in India right now.</p>
          <div className="bar-compare">
            <div className="bar-row">
              <span className="bar-name">You</span>
              <div className="bar-track"><div className="bar-fill bar-pos" style={{ width: `${result.score}%` }} /></div>
              <span className="bar-val pos">{result.score}</span>
            </div>
            <div className="bar-row">
              <span className="bar-name">Market average</span>
              <div className="bar-track"><div className="bar-fill bar-neg" style={{ width: `${result.marketBenchmark}%` }} /></div>
              <span className="bar-val neg">{result.marketBenchmark}</span>
            </div>
          </div>
        </section>
      )}

      {result && Array.isArray(result.certifications) && result.certifications.length > 0 && (
        <section className="sub-section">
          <Eyebrow>WORTH GETTING CERTIFIED</Eyebrow>
          <h2>Certifications that move the needle.</h2>
          <div className="cert-grid">
            {result.certifications.map((c, i) => (
              <div className="cert-card" key={i}>
                <GraduationCap size={18} />
                <div className="cert-name">{c.name}</div>
                <div className="cert-reason muted">{c.reason}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {result && Array.isArray(result.alternatePaths) && result.alternatePaths.length > 0 && (
        <section className="sub-section">
          <Eyebrow>OR PIVOT ENTIRELY</Eyebrow>
          <h2>Alternate paths worth considering.</h2>
          <div className="cert-grid">
            {result.alternatePaths.map((p, i) => (
              <div className="cert-card" key={i}>
                <ArrowRight size={18} />
                <div className="cert-name">{p.role}</div>
                <div className="cert-reason muted">{p.reason}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mock Interview tab                                                   */
/* ------------------------------------------------------------------ */

function InterviewTab() {
  const [domain, setDomain] = useState(null);
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [history, setHistory] = useState([]);
  const [qNum, setQNum] = useState(0);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history, question]);

  const start = async (d) => {
    setDomain(d);
    setLoading(true);
    setError("");
    try {
      const prompt = `You are the AI interviewer inside CareerShield, running a ${difficulty}-level mock interview for a "${d}" role at an Indian company in the current AI-hiring climate. Ask the first question — a warm but substantive opener, technical or behavioral, calibrated to ${difficulty} level. Return ONLY minified JSON: {"question": "<question text>"}`;
      const res = await askClaude(prompt);
      setQuestion(res.question);
      setStarted(true);
    } catch (e) {
      setError(e.message || "Couldn't start the interview. Check your connection and try again.");
    }
    setLoading(false);
  };

  const submit = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    setError("");
    try {
      const isLast = qNum + 1 >= MAX_Q;
      const priorText = history.map((h) => `Q: ${h.question}\nA: ${h.answer}`).join("\n\n") || "None yet";
      const prompt = `You are the AI interviewer inside CareerShield, mid ${difficulty}-level mock-interview for a "${domain}" role. This is question ${qNum + 1} of ${MAX_Q}.
Prior Q&A:
${priorText}

Current question: "${question}"
Candidate's answer: "${answer}"

Give specific, constructive feedback in 2-3 sentences and a score from 1-10. ${isLast ? "This was the final question — do not include a next question." : "Then ask exactly one natural next interview question (mix technical and HR)."}
Return ONLY minified JSON: {"feedback": "<feedback>", "score": <1-10 integer>, "nextQuestion": ${isLast ? "null" : '"<next question>"'}}`;
      const res = await askClaude(prompt);
      const entry = { question, answer, feedback: res.feedback, score: res.score };
      const newHistory = [...history, entry];
      setHistory(newHistory);
      setQNum(qNum + 1);
      setAnswer("");
      if (res.nextQuestion) {
        setQuestion(res.nextQuestion);
      } else {
        setFinished(true);
      }
    } catch (e) {
      setError(e.message || "Couldn't reach the AI engine. Check your connection and try again.");
    }
    setLoading(false);
  };

  const reset = () => {
    setDomain(null); setStarted(false); setQuestion(""); setAnswer("");
    setHistory([]); setQNum(0); setFinished(false); setError("");
  };

  const avgScore = history.length ? Math.round((history.reduce((a, h) => a + (h.score || 0), 0) / history.length) * 10) : 0;

  return (
    <div className="tab-pane">
      <Eyebrow>PLACEMENT READINESS</Eyebrow>
      <h2>Practice before it counts.</h2>
      <p className="muted">Technical + HR rounds, domain-specific, with instant AI feedback on every answer.</p>

      {!started && (
        <>
          <div className="panel expect-panel">
            <div className="panel-title">What to expect</div>
            <ul className="expect-list">
              {INTERVIEW_EXPECTATIONS.map((e, i) => (
                <li key={i}><CheckCircle2 size={14} /> {e}</li>
              ))}
            </ul>
          </div>

          <div className="panel domain-pick">
            <div className="panel-title">Difficulty</div>
            <div className="filter-row">
              {DIFFICULTIES.map((d) => (
                <button key={d} className={`chip ${difficulty === d ? "chip-active" : ""}`} onClick={() => setDifficulty(d)}>
                  {d}
                </button>
              ))}
            </div>

            <div className="panel-title" style={{ marginTop: 18 }}>Choose a track</div>
            <div className="domain-grid">
              {DOMAINS.map((d) => (
                <button key={d} className="domain-btn" onClick={() => start(d)} disabled={loading}>
                  <Briefcase size={16} /> {d}
                </button>
              ))}
            </div>
            {loading && <div className="hint"><Loader2 size={14} className="spin" /> Preparing your first question…</div>}
            <ErrorNote msg={error} />
          </div>
        </>
      )}

      {started && (
        <div className="interview-shell">
          <div className="interview-meta">
            <span>{domain} &middot; {difficulty}</span>
            <span>Question {Math.min(qNum + 1, MAX_Q)} of {MAX_Q}</span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, (qNum / MAX_Q) * 100)}%` }} /></div>

          <div className="chat-log">
            {history.map((h, i) => (
              <div className="chat-block" key={i}>
                <div className="chat-q"><MessageSquare size={14} /> {h.question}</div>
                <div className="chat-a">{h.answer}</div>
                <div className="chat-feedback">
                  <span className="feedback-score">{h.score}/10</span>
                  {h.feedback}
                </div>
              </div>
            ))}
            {!finished && (
              <div className="chat-block active">
                <div className="chat-q"><MessageSquare size={14} /> {question}</div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {!finished ? (
            <div className="panel">
              <textarea
                className="textarea"
                rows={3}
                placeholder="Type your answer…"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
              <div className="panel-actions">
                <span className="hint">Be specific — the AI scores substance, not length.</span>
                <button className="btn btn-primary" onClick={submit} disabled={loading || !answer.trim()}>
                  {loading ? <><Loader2 size={16} className="spin" /> Reviewing…</> : <><Send size={16} /> Submit answer</>}
                </button>
              </div>
              <ErrorNote msg={error} />
            </div>
          ) : (
            <div className="panel result-score">
              <Gauge score={avgScore} label="INTERVIEW READINESS" />
              <p className="result-summary">
                {avgScore >= 70 ? "Strong session — you're close to placement-ready." : avgScore >= 45 ? "Decent foundation, but a few answers need more depth." : "Keep practicing — focus on specificity in your answers."}
              </p>
              <button className="btn btn-ghost" onClick={reset}><RotateCcw size={15} /> Start a new interview</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Resume Checker tab                                                   */
/* ------------------------------------------------------------------ */

function ResumeTab({ goTo }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedHeadline, setCopiedHeadline] = useState(false);
  const fileRef = useRef(null);

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setInput(String(ev.target.result || ""));
    reader.readAsText(file);
  };

  const copyRewrite = async () => {
    if (!result || !result.rewrittenSummary) return;
    try {
      await navigator.clipboard.writeText(result.rewrittenSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      /* clipboard not available — ignore silently */
    }
  };

  const copyHeadline = async () => {
    if (!result || !result.linkedinHeadline) return;
    try {
      await navigator.clipboard.writeText(result.linkedinHeadline);
      setCopiedHeadline(true);
      setTimeout(() => setCopiedHeadline(false), 2000);
    } catch (e) {
      /* clipboard not available — ignore silently */
    }
  };

  const check = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const prompt = `You are the AI Resume Checker inside CareerShield, scoring resumes against ATS filters tuned for AI-era IT roles in India in 2026. Resume text:
"""
${input}
"""
Also rewrite the candidate's professional summary/opening into one punchy, AI-era-relevant paragraph (2-3 sentences) they could paste at the top of their resume. Separately, score the resume's formatting/readability quality (structure, clarity, length) out of 100. Also write one punchy LinkedIn headline (under 15 words) based on this resume. Finally, suggest one specific interview topic this candidate should practice, based on gaps in the resume. Return ONLY minified JSON, no markdown, in exactly this shape:
{"atsScore": <integer 0-100>, "formatScore": <integer 0-100>, "verdict": "<one direct line on where it stands>", "missingKeywords": ["<keyword>", "<keyword>", "<keyword>"], "suggestions": ["<concrete, line-level fix>", "<fix>", "<fix>"], "rewrittenSummary": "<the rewritten 2-3 sentence opening paragraph>", "linkedinHeadline": "<punchy headline under 15 words>", "interviewTip": "<one specific topic to practice, one sentence>"}`;
      const res = await askClaude(prompt);
      setResult(res);
    } catch (e) {
      setError(e.message || "Couldn't reach the AI engine. Check your connection and try again.");
    }
    setLoading(false);
  };

  return (
    <div className="tab-pane">
      <Eyebrow>PLACEMENT READINESS</Eyebrow>
      <h2>AI Resume Checker.</h2>
      <p className="muted">Scores your resume against ATS filters, flags missing AI-role keywords, and suggests concrete fixes.</p>

      <div className="panel">
        <input
          type="file"
          accept=".txt,.md"
          ref={fileRef}
          onChange={onFile}
          style={{ display: "none" }}
        />
        <button className="btn btn-ghost upload-btn" onClick={() => fileRef.current && fileRef.current.click()}>
          <FileText size={15} /> Upload resume (.txt)
        </button>
        <textarea
          className="textarea"
          placeholder="Paste your resume text here… or upload a .txt file above"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
          style={{ marginTop: 12 }}
        />
        <div className="panel-actions">
          <span className="hint">{input.length} characters</span>
          <button className="btn btn-primary" onClick={check} disabled={loading || !input.trim()}>
            {loading ? <><Loader2 size={16} className="spin" /> Scanning…</> : <><FileText size={16} /> Check my resume</>}
          </button>
        </div>
        <ErrorNote msg={error} />
      </div>

      {result && (
        <div className="result-grid">
          <div className="panel result-score">
            <div className="dual-gauge">
              <Gauge score={result.atsScore} label="ATS MATCH" />
              {typeof result.formatScore === "number" && <Gauge score={result.formatScore} label="FORMAT SCORE" />}
            </div>
            <p className="result-summary">{result.verdict}</p>
          </div>
          <div className="panel result-priorities">
            <div className="panel-title"><AlertTriangle size={16} /> Missing keywords</div>
            <div className="chip-row">
              {(result.missingKeywords || []).map((k, i) => (
                <span className="chip chip-static chip-warn" key={i}>{k}</span>
              ))}
            </div>
            <div className="panel-title" style={{ marginTop: 16 }}><Sparkles size={16} /> Fix these</div>
            {(result.suggestions || []).map((s, i) => (
              <div className="priority-row" key={i}>
                <span className="priority-num">{i + 1}</span>
                <div className="priority-skill" style={{ fontWeight: 400 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && result.rewrittenSummary && (
        <section className="sub-section">
          <Eyebrow>REWRITTEN FOR YOU</Eyebrow>
          <h2>A stronger opening line.</h2>
          <div className="panel rewrite-panel">
            <p className="rewrite-text">{result.rewrittenSummary}</p>
            <button className="btn btn-ghost" onClick={copyRewrite}>
              {copied ? <><CheckCircle2 size={15} /> Copied</> : <><FileText size={15} /> Copy to clipboard</>}
            </button>
          </div>
        </section>
      )}

      {result && result.linkedinHeadline && (
        <section className="sub-section">
          <Eyebrow>BONUS</Eyebrow>
          <h2>A LinkedIn headline to match.</h2>
          <div className="panel rewrite-panel">
            <p className="rewrite-text">"{result.linkedinHeadline}"</p>
            <button className="btn btn-ghost" onClick={copyHeadline}>
              {copiedHeadline ? <><CheckCircle2 size={15} /> Copied</> : <><FileText size={15} /> Copy headline</>}
            </button>
          </div>
        </section>
      )}

      {result && result.interviewTip && (
        <section className="sub-section">
          <Eyebrow>NEXT STEP</Eyebrow>
          <h2>Practice this before your next round.</h2>
          <div className="panel cta-panel">
            <p className="result-summary" style={{ textAlign: "left" }}>{result.interviewTip}</p>
            {goTo && (
              <button className="btn btn-primary" onClick={() => goTo("interview")}>
                <MessageSquare size={16} /> Go to Mock Interview
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App shell                                                           */
/* ------------------------------------------------------------------ */

export default function CareerShieldApp() {
  const [tab, setTab] = useState("overview");
  const [lightMode, setLightMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("careershield-theme");
    if (saved === "light") setLightMode(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("careershield-theme", lightMode ? "light" : "dark");
  }, [lightMode]);

  return (
    <div className={`app ${lightMode ? "light-mode" : ""}`}>
      <style>{CSS}</style>

      <nav className="navbar">
        <div className="brand">
          <Shield size={20} />
          <span>CareerShield</span>
        </div>
        <div className="nav-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`nav-tab ${tab === t.id ? "nav-tab-active" : ""}`} onClick={() => setTab(t.id)}>
              <t.Icon size={15} />
              <span>{t.label}</span>
            </button>
          ))}
          <button
            className="theme-btn"
            title={lightMode ? "Switch to dark mode" : "Switch to light mode"}
            onClick={() => setLightMode((v) => !v)}
          >
            {lightMode ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </div>
      </nav>

      <main className="main">
        {tab === "overview" && <OverviewTab goTo={setTab} />}
        {tab === "radar" && <LayoffRadarTab />}
        {tab === "skills" && <SkillGapTab />}
        {tab === "interview" && <InterviewTab />}
        {tab === "resume" && <ResumeTab goTo={setTab} />}
      </main>

      <button className="floating-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} title="Back to top">
        <ArrowRight size={16} />
      </button>

      <footer className="footer">
        <div className="footer-brand"><Shield size={16} /> CareerShield</div>
        <div className="footer-pills">Layoff Radar &middot; Skill Gap Analyzer &middot; AI Mock Interview &middot; Resume Checker</div>
        <div className="footer-note">Built for smarter career moves.</div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap');

:root{
  --bg:#0F1B2E; --panel:#16243B; --panel-2:#1D2E4A; --border:#2A3B57;
  --text:#E8EDF5; --dim:#93A3BE;
  --amber:#E8A33D; --cyan:#4FC3D9; --red:#FF6B5C; --green:#3ECF8E;
}
*{box-sizing:border-box;}
.app{ background:radial-gradient(1200px 600px at 80% -10%, #17294550 0%, transparent 60%), var(--bg);
  min-height:100vh; color:var(--text); font-family:'DM Sans',sans-serif; }
h1,h2{ font-family:'Sora',sans-serif; margin:0 0 10px; line-height:1.15; letter-spacing:-0.01em; }
h1{ font-size:clamp(30px,4vw,44px); }
h2{ font-size:clamp(22px,2.6vw,28px); }
p{ margin:0; }
.muted{ color:var(--dim); font-size:14.5px; line-height:1.6; }
.eyebrow{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.14em; color:var(--cyan); margin-bottom:10px; }

.navbar{ position:sticky; top:0; z-index:20; display:flex; align-items:center; justify-content:space-between;
  padding:14px 28px; background:#0F1B2Ecc; backdrop-filter:blur(10px); border-bottom:1px solid var(--border); flex-wrap:wrap; gap:10px; }
.brand{ display:flex; align-items:center; gap:8px; font-family:'Sora',sans-serif; font-weight:700; font-size:17px; color:var(--cyan); }
.nav-tabs{ display:flex; gap:4px; flex-wrap:wrap; }
.nav-tab{ display:flex; align-items:center; gap:6px; background:transparent; border:1px solid transparent; color:var(--dim);
  font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500; padding:8px 12px; border-radius:8px; cursor:pointer; transition:.15s; }
.nav-tab:hover{ color:var(--text); background:var(--panel); }
.nav-tab-active{ color:var(--bg); background:var(--cyan); }
.nav-tab-active:hover{ color:var(--bg); background:var(--cyan); }


.app{
  position:relative;
  overflow-x:hidden;
}
.app::before{
  content:"";
  position:fixed;
  width:520px;
  height:520px;
  border-radius:50%;
  top:-240px;
  right:-180px;
  background:radial-gradient(circle, #4FC3D918 0%, transparent 68%);
  pointer-events:none;
}
.app::after{
  content:"";
  position:fixed;
  width:420px;
  height:420px;
  border-radius:50%;
  bottom:-220px;
  left:-180px;
  background:radial-gradient(circle, #E8A33D10 0%, transparent 68%);
  pointer-events:none;
}
.navbar{ box-shadow:0 12px 30px #00000018; }
.brand svg{ filter:drop-shadow(0 0 8px #4FC3D966); }
.theme-btn{
  display:flex; align-items:center; justify-content:center; width:34px; height:34px;
  border-radius:10px; border:1px solid var(--border); background:var(--panel);
  color:var(--text); cursor:pointer; transition:.2s;
}
.theme-btn:hover{ border-color:var(--cyan); transform:translateY(-1px); }
.command-strip{
  display:flex; align-items:center; gap:18px; flex-wrap:wrap;
  margin:0 0 20px; padding:11px 14px; border:1px solid var(--border);
  border-radius:12px; background:linear-gradient(90deg,#16243Bcc,#1D2E4A66);
  box-shadow:0 10px 30px #00000012;
}
.command-status,.command-meta{
  display:flex; align-items:center; gap:7px; font-size:10.5px;
  letter-spacing:.07em; color:var(--dim);
}
.command-status{ color:var(--green); font-family:'IBM Plex Mono',monospace; }
.status-dot{
  width:7px; height:7px; border-radius:50%; background:var(--green);
  box-shadow:0 0 12px var(--green); animation:statusPulse 1.8s infinite;
}
@keyframes statusPulse{ 50%{ opacity:.4; transform:scale(.8); } }
.quick-grid{
  display:grid; grid-template-columns:1.4fr 1fr 1fr; gap:12px; margin:0 0 52px;
}
.quick-card{
  min-height:112px; display:flex; align-items:flex-start; gap:12px; text-align:left;
  background:linear-gradient(145deg,var(--panel),#132137);
  border:1px solid var(--border); border-radius:15px; padding:16px;
  color:var(--text); cursor:pointer; transition:.2s; box-shadow:0 10px 24px #00000012;
}
.quick-card:hover{ transform:translateY(-3px); border-color:#4FC3D966; box-shadow:0 14px 34px #00000022; }
.quick-card > svg:last-child{ margin-left:auto; color:var(--dim); }
.quick-feature{ cursor:default; }
.quick-feature:hover{ transform:none; }
.quick-icon{
  flex:0 0 auto; width:36px; height:36px; display:flex; align-items:center; justify-content:center;
  border-radius:10px; color:var(--cyan); background:#4FC3D914; border:1px solid #4FC3D926;
}
.quick-kicker{ font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:.12em; color:var(--cyan); }
.quick-title{ font-family:'Sora',sans-serif; font-size:13.5px; font-weight:700; margin-top:4px; }
.quick-copy{ color:var(--dim); font-size:12px; line-height:1.45; margin-top:5px; }
.stat-card{
  position:relative; overflow:hidden; transition:.2s;
  box-shadow:0 8px 22px #00000012;
}
.stat-card::after{
  content:""; position:absolute; width:90px; height:90px; right:-35px; bottom:-45px;
  border-radius:50%; background:currentColor; opacity:.035;
}
.stat-card:hover{ transform:translateY(-2px); border-color:#4FC3D944; }
.stat-icon{ width:34px; height:34px; display:flex; align-items:center; justify-content:center;
  border-radius:9px; background:#FFFFFF05; }
.search-box{
  display:flex; align-items:center; gap:8px; min-width:220px;
  background:var(--panel); border:1px solid var(--border); border-radius:20px; padding:7px 12px;
}
.search-box svg{ color:var(--dim); flex:0 0 auto; }
.search-box input{
  width:100%; border:0; outline:0; background:transparent; color:var(--text);
  font-family:'DM Sans',sans-serif; font-size:12.5px;
}
.radar-toolbar{ display:flex; justify-content:space-between; align-items:center; gap:14px; flex-wrap:wrap; }
.radar-toolbar .filter-row{ margin:20px 0 16px; }
.progress-track{ height:5px; border-radius:5px; background:var(--panel-2); overflow:hidden; margin:0 0 14px; }
.progress-fill{ height:100%; border-radius:5px; background:linear-gradient(90deg,var(--cyan),var(--green)); transition:width .35s ease; }
.floating-top{
  position:fixed; right:20px; bottom:20px; z-index:30;
  width:42px; height:42px; border-radius:50%; border:1px solid var(--border);
  background:var(--panel); color:var(--cyan); display:flex; align-items:center; justify-content:center;
  cursor:pointer; box-shadow:0 10px 30px #00000035; transform:rotate(-90deg); transition:.2s;
}
.floating-top:hover{ transform:rotate(-90deg) translateY(-3px); border-color:var(--cyan); }
.footer-note{ color:var(--dim); font-size:11px; }
.light-mode{
  --bg:#F5F8FC; --panel:#FFFFFF; --panel-2:#EDF3F8; --border:#D7E1EB;
  --text:#142033; --dim:#62738A; --cyan:#087E9B; --red:#D94B3D; --amber:#B56B00; --green:#148454;
  background:radial-gradient(900px 500px at 80% -10%, #DDF4F850 0%, transparent 60%), var(--bg);
}
.light-mode .navbar{ background:#F5F8FCdd; }
.light-mode .command-strip{ background:linear-gradient(90deg,#FFFFFF,#EDF7FA); }
.light-mode .quick-card{ background:linear-gradient(145deg,#FFFFFF,#F4F8FB); }
.light-mode .radar-viz{ background:radial-gradient(circle at center,#EAF8FB 0%,#F4F7FA 75%); }
.light-mode .radar-center{ background:#FFFFFF; }
.light-mode .gauge-inner{ background:var(--panel); }
.light-mode .btn-primary{ color:#fff; }
.light-mode .chip-active{ color:#fff; }
.light-mode .app::before{ background:radial-gradient(circle,#087E9B12 0%,transparent 68%); }
.light-mode .app::after{ background:radial-gradient(circle,#B56B0010 0%,transparent 68%); }
@media(max-width:820px){
  .quick-grid{ grid-template-columns:1fr 1fr; }
  .quick-feature{ grid-column:1/-1; }
}

.main{ max-width:1080px; margin:0 auto; padding:40px 28px 80px; }
.tab-pane h2{ margin-top:2px; }

.hero{ display:flex; align-items:center; justify-content:space-between; gap:40px; padding:20px 0 44px; flex-wrap:wrap; }
.hero-copy{ flex:1 1 420px; max-width:560px; }
.hero-sub{ color:var(--dim); font-size:16px; line-height:1.65; margin-top:12px; }
.hero-actions{ display:flex; gap:12px; margin-top:26px; flex-wrap:wrap; }

.btn{ display:inline-flex; align-items:center; gap:8px; font-family:'DM Sans',sans-serif; font-weight:600; font-size:14px;
  padding:12px 20px; border-radius:10px; border:1px solid transparent; cursor:pointer; transition:.15s; white-space:nowrap; }
.btn:disabled{ opacity:.5; cursor:not-allowed; }
.btn-primary{ background:var(--cyan); color:#08151F; }
.btn-primary:hover:not(:disabled){ background:#6ad3e6; }
.btn-ghost{ background:transparent; border-color:var(--border); color:var(--text); }
.btn-ghost:hover{ background:var(--panel); }

/* Radar viz */
.radar-viz{ position:relative; width:260px; height:260px; flex:0 0 260px; border-radius:50%;
  background:radial-gradient(circle at center, #123049 0%, #0D1930 75%); border:1px solid var(--border); overflow:hidden; }
.radar-ring{ position:absolute; border:1px solid #2A3B5780; border-radius:50%; top:50%; left:50%; transform:translate(-50%,-50%); }
.r1{ width:62%; height:62%; } .r2{ width:84%; height:84%; } .r3{ width:100%; height:100%; }
.radar-cross{ position:absolute; background:#2A3B5780; }
.radar-cross-h{ width:100%; height:1px; top:50%; left:0; }
.radar-cross-v{ width:1px; height:100%; top:0; left:50%; }
.radar-sweep{ position:absolute; inset:0; border-radius:50%;
  background:conic-gradient(from 0deg, #4FC3D955 0deg, transparent 60deg, transparent 360deg);
  animation:sweep 4s linear infinite; }
@keyframes sweep{ to{ transform:rotate(360deg); } }
.radar-center{ position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:var(--cyan);
  background:#0D1930; border:1px solid var(--border); border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; }
.blip-hit{ position:absolute; transform:translate(-50%,-50%); cursor:pointer; display:flex; align-items:center; justify-content:center; }
.blip-ping{ position:absolute; border-radius:50%; opacity:.5; animation:ping 2.2s ease-out infinite; }
@keyframes ping{ 0%{ transform:scale(.6); opacity:.55; } 100%{ transform:scale(2); opacity:0; } }
.blip-dot{ position:relative; border-radius:50%; box-shadow:0 0 8px currentColor; }
.blip-tag{ position:absolute; bottom:120%; left:50%; transform:translateX(-50%); background:#0D1930; border:1px solid var(--border);
  border-radius:8px; padding:8px 10px; font-size:11.5px; white-space:nowrap; display:flex; flex-direction:column; gap:2px; z-index:5; }
.blip-tag strong{ font-family:'Sora',sans-serif; font-size:12.5px; }
.blip-tag span{ color:var(--dim); }

.stat-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:14px; margin-bottom:52px; }
.stat-card{ background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:18px; }
.stat-value{ font-family:'IBM Plex Mono',monospace; font-size:26px; font-weight:600; margin-top:10px; }
.stat-label{ color:var(--dim); font-size:12.5px; margin-top:4px; }
.tone-amber svg{ color:var(--amber); } .tone-cyan svg{ color:var(--cyan); }
.tone-red svg{ color:var(--red); } .tone-green svg{ color:var(--green); }

.paradox{ margin-bottom:52px; }
.bar-compare{ margin-top:22px; display:flex; flex-direction:column; gap:14px; }
.bar-row{ display:grid; grid-template-columns:150px 1fr 56px; align-items:center; gap:14px; }
.bar-name{ font-size:13.5px; color:var(--dim); }
.bar-track{ height:10px; background:var(--panel-2); border-radius:6px; overflow:hidden; }
.bar-fill{ height:100%; border-radius:6px; }
.bar-neg{ background:var(--red); } .bar-pos{ background:var(--green); }
.bar-val{ font-family:'IBM Plex Mono',monospace; font-size:13.5px; font-weight:600; text-align:right; }
.bar-val.neg{ color:var(--red); } .bar-val.pos{ color:var(--green); }

.loop{ margin-bottom:20px; }
.loop-row{ display:flex; align-items:center; gap:8px; margin-top:22px; flex-wrap:wrap; }
.loop-card{ flex:1 1 200px; text-align:left; background:var(--panel); border:1px solid var(--border); border-radius:14px;
  padding:18px; cursor:pointer; color:var(--text); transition:.15s; }
.loop-card:hover{ border-color:var(--cyan); background:var(--panel-2); }
.loop-card svg{ color:var(--cyan); }
.loop-title{ font-family:'Sora',sans-serif; font-weight:600; margin-top:10px; font-size:15px; }
.loop-desc{ color:var(--dim); font-size:12.5px; margin-top:4px; line-height:1.5; }
.loop-arrow{ color:var(--border); flex:0 0 auto; }

.filter-row{ display:flex; gap:8px; margin:20px 0 16px; }
.chip{ font-family:'DM Sans',sans-serif; font-size:12.5px; font-weight:500; padding:7px 13px; border-radius:20px;
  border:1px solid var(--border); background:transparent; color:var(--dim); cursor:pointer; transition:.15s; }
.chip:hover{ color:var(--text); }
.chip-active{ background:var(--cyan); color:#08151F; border-color:var(--cyan); }
.chip-static{ display:inline-flex; align-items:center; gap:5px; cursor:default; color:var(--text); background:var(--panel-2); }
.chip-static svg{ color:var(--green); }
.chip-warn{ color:var(--amber); border-color:#E8A33D55; }
.chip-row{ display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }

.table-wrap{ background:var(--panel); border:1px solid var(--border); border-radius:14px; overflow:hidden; margin-top:6px; }
.radar-table{ width:100%; border-collapse:collapse; font-size:13.5px; }
.radar-table th{ text-align:left; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; color:var(--dim);
  padding:13px 16px; border-bottom:1px solid var(--border); font-weight:500; }
.radar-table td{ padding:13px 16px; border-bottom:1px solid #22314A; }
.radar-table tr:last-child td{ border-bottom:none; }
.cell-name{ font-weight:600; } .cell-num{ font-family:'IBM Plex Mono',monospace; }
.status-pill{ display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:600; padding:4px 9px; border-radius:20px; }
.status-red{ background:#FF6B5C22; color:var(--red); } .status-amber{ background:#E8A33D22; color:var(--amber); }

.panel{ background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:20px; margin-top:18px; }
.panel-title{ display:flex; align-items:center; gap:8px; font-family:'Sora',sans-serif; font-weight:600; font-size:14.5px; margin-bottom:12px; }
.textarea{ width:100%; background:var(--panel-2); border:1px solid var(--border); border-radius:10px; color:var(--text);
  font-family:'DM Sans',sans-serif; font-size:14px; padding:13px; resize:vertical; outline:none; }
.textarea:focus{ border-color:var(--cyan); }
.panel-actions{ display:flex; align-items:center; justify-content:space-between; margin-top:12px; gap:12px; flex-wrap:wrap; }
.hint{ color:var(--dim); font-size:12px; display:flex; align-items:center; gap:6px; }
.error-note{ display:flex; align-items:center; gap:7px; color:var(--red); font-size:13px; margin-top:10px; }
.spin{ animation:spin 1s linear infinite; } @keyframes spin{ to{ transform:rotate(360deg); } }

.result-grid{ display:grid; grid-template-columns:280px 1fr; gap:16px; margin-top:16px; }
@media(max-width:720px){ .result-grid{ grid-template-columns:1fr; } }
.result-score{ display:flex; flex-direction:column; align-items:center; text-align:center; gap:14px; }
.result-summary{ color:var(--dim); font-size:13.5px; line-height:1.6; }
.gauge-wrap{ display:flex; flex-direction:column; align-items:center; gap:8px; }
.gauge{ width:130px; height:130px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
.gauge-inner{ width:100px; height:100px; border-radius:50%; background:var(--panel); display:flex; flex-direction:column;
  align-items:center; justify-content:center; }
.gauge-num{ font-family:'IBM Plex Mono',monospace; font-size:28px; font-weight:600; }
.gauge-pct{ font-size:11px; color:var(--dim); }
.gauge-label{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.1em; color:var(--dim); }
.priority-row{ display:flex; gap:12px; align-items:flex-start; padding:10px 0; border-top:1px solid #22314A; }
.priority-row:first-of-type{ border-top:none; }
.priority-num{ font-family:'IBM Plex Mono',monospace; color:var(--cyan); font-size:13px; padding-top:1px; }
.priority-skill{ font-weight:600; font-size:14px; } .priority-reason{ margin-top:2px; }

.domain-pick{ text-align:left; }
.domain-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:10px; }
.domain-btn{ display:flex; align-items:center; gap:9px; background:var(--panel-2); border:1px solid var(--border); color:var(--text);
  padding:13px 14px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; transition:.15s; }
.domain-btn:hover:not(:disabled){ border-color:var(--cyan); }
.domain-btn svg{ color:var(--cyan); }

.interview-shell{ margin-top:16px; }
.interview-meta{ display:flex; justify-content:space-between; font-family:'IBM Plex Mono',monospace; font-size:11.5px;
  color:var(--dim); letter-spacing:.05em; margin-bottom:10px; }
.chat-log{ display:flex; flex-direction:column; gap:14px; max-height:420px; overflow-y:auto; padding-right:4px; }
.chat-block{ background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:14px 16px; }
.chat-block.active{ border-color:#4FC3D955; }
.chat-q{ display:flex; gap:8px; font-weight:600; font-size:14px; color:var(--cyan); }
.chat-a{ margin-top:10px; font-size:13.5px; color:var(--text); background:var(--panel-2); border-radius:8px; padding:10px 12px; }
.chat-feedback{ margin-top:10px; font-size:12.5px; color:var(--dim); line-height:1.6; }
.feedback-score{ font-family:'IBM Plex Mono',monospace; color:var(--green); font-weight:600; margin-right:8px; }

.footer{ border-top:1px solid var(--border); padding:24px 28px; display:flex; justify-content:space-between;
  align-items:center; flex-wrap:wrap; gap:8px; color:var(--dim); font-size:12.5px; }
.footer-brand{ display:flex; align-items:center; gap:7px; color:var(--text); font-weight:600; font-family:'Sora',sans-serif; }

.sub-section{ margin-top:44px; padding-top:32px; border-top:1px solid var(--border); }

.sector-list{ display:flex; flex-direction:column; gap:12px; margin-top:20px; }
.sector-row{ display:grid; grid-template-columns:190px 1fr 46px; align-items:center; gap:14px; }
.sector-name{ font-size:13px; color:var(--text); }
.sector-val{ font-family:'IBM Plex Mono',monospace; font-size:13px; color:var(--red); text-align:right; }

.hotspot-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin-top:20px; }
.hotspot-card{ background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:14px 16px;
  display:flex; flex-direction:column; gap:6px; border-left:3px solid var(--border); }
.hotspot-city{ font-weight:600; font-size:14px; }
.hotspot-risk{ font-size:11.5px; color:var(--dim); font-family:'IBM Plex Mono',monospace; }
.risk-high{ border-left-color:var(--red); } .risk-high .hotspot-risk{ color:var(--red); }
.risk-medium{ border-left-color:var(--amber); } .risk-medium .hotspot-risk{ color:var(--amber); }
.risk-low{ border-left-color:var(--green); } .risk-low .hotspot-risk{ color:var(--green); }

.roadmap-track{ display:flex; flex-direction:column; gap:0; margin-top:22px; }
.roadmap-step{ display:grid; grid-template-columns:32px 140px 1fr; gap:16px; align-items:start; padding:16px 0;
  border-left:1px solid var(--border); margin-left:15px; padding-left:24px; position:relative; }
.roadmap-step:last-child{ border-left-color:transparent; }
.roadmap-dot{ position:absolute; left:-16px; top:16px; width:32px; height:32px; border-radius:50%; background:var(--cyan);
  color:#08151F; font-family:'IBM Plex Mono',monospace; font-weight:700; font-size:13px; display:flex;
  align-items:center; justify-content:center; }
.roadmap-phase{ font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--cyan); padding-top:6px; }
.roadmap-action{ font-size:13.5px; padding-top:6px; }
@media(max-width:640px){ .roadmap-step{ grid-template-columns:1fr; } }

.expect-panel{ margin-top:18px; }
.expect-list{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
.expect-list li{ display:flex; align-items:center; gap:9px; font-size:13.5px; color:var(--text); }
.expect-list li svg{ color:var(--green); flex:0 0 auto; }

.upload-btn{ font-size:13px; padding:9px 15px; }
.rewrite-panel{ margin-top:20px; }
.rewrite-text{ font-size:14.5px; line-height:1.7; color:var(--text); font-style:italic; margin-bottom:14px; }

.cert-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin-top:20px; }
.cert-card{ background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:16px; }
.cert-card svg{ color:var(--cyan); }
.cert-name{ font-family:'Sora',sans-serif; font-weight:600; font-size:14px; margin-top:10px; }
.cert-reason{ font-size:12.5px; margin-top:5px; line-height:1.5; }

.dual-gauge{ display:flex; gap:20px; align-items:center; justify-content:center; flex-wrap:wrap; }
.cta-panel{ display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-top:20px; }

@media(max-width:640px){
  .navbar{ padding:12px 16px; } .main{ padding:28px 16px 60px; }
  .radar-viz{ width:200px; height:200px; flex-basis:200px; }
  .nav-tab span{ display:none; } .nav-tab{ padding:9px; }
  .quick-grid{ grid-template-columns:1fr; }
  .quick-feature{ grid-column:auto; }
  .command-strip{ gap:10px; }
  .search-box{ width:100%; }
  .hero{ gap:24px; }
}
`;
