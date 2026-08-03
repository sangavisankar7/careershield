import React, { useState, useEffect, useRef } from "react";
import {
  Shield, Search, Brain, MessageSquare, FileText, TrendingUp, TrendingDown,
  AlertTriangle, Target, Send, Loader2, CheckCircle2, Sparkles,
  Briefcase, ArrowRight, ChevronRight, RotateCcw, Radio, Upload, Copy, Check,
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
  "Mechanical Engineer", "Civil Engineer", "Electronics Engineer", "Marketing / Sales",
  "Finance / Accounting", "HR / Management", "MBA / General Management",
];
const MAX_Q = 4;

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
/* File-to-text helpers (PDF / DOCX upload for Resume Checker)         */
/* Loaded from CDN on demand so no new npm packages / build steps       */
/* are required.                                                        */
/* ------------------------------------------------------------------ */

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Couldn't load a required library. Check your connection and try again."));
    document.body.appendChild(script);
  });
}

async function extractTextFromFile(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    const pdfjsLib = window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it) => it.str).join(" ") + "\n";
    }
    return text.trim();
  }

  if (name.endsWith(".docx")) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  }

  if (name.endsWith(".txt")) {
    return (await file.text()).trim();
  }

  throw new Error("Please upload a PDF, DOCX, or TXT file.");
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function Eyebrow({ children, live }) {
  return (
    <div className="eyebrow">
      {live && <span className="live-dot" />}
      {children}
    </div>
  );
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
          <Eyebrow live>PROJECT EXPO 2026 &middot; LIVE DEMO</Eyebrow>
          <h1>The shift nobody <span className="grad-text">warned</span> them about.</h1>
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

      <section className="stat-grid">
        {STATS.map((s) => (
          <div className={`stat-card tone-${s.tone}`} key={s.label}>
            <div className="stat-icon"><s.Icon size={18} /></div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
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
  const rows = COMPANIES.filter((c) => filter === "All" || c.status === filter);
  return (
    <div className="tab-pane">
      <Eyebrow>LAYOFF RADAR</Eyebrow>
      <h2>Who's cutting, who's hiring.</h2>
      <p className="muted">Curated from recent industry reporting — the platform auto-refreshes this table from a live news feed.</p>

      <div className="filter-row">
        {["All", "Confirmed", "Reported"].map((f) => (
          <button key={f} className={`chip ${filter === f ? "chip-active" : ""}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
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
Score how ready this profile is for AI-era IT roles in India right now, and identify the top priorities. Be honest and specific, not generic. Return ONLY minified JSON, no markdown, in exactly this shape:
{"score": <integer 0-100, AI-Ready Index>, "summary": "<one or two direct sentences on where they stand>", "topSkills": [{"skill": "<skill name>", "reason": "<why it matters now, one sentence>"}, {"skill": "...", "reason": "..."}, {"skill": "...", "reason": "..."}], "strengths": ["<existing strength>", "<existing strength>"]}`;
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
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mock Interview tab                                                   */
/* ------------------------------------------------------------------ */

function InterviewTab() {
  const [domain, setDomain] = useState(null);
  const [customDomain, setCustomDomain] = useState("");
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
      const prompt = `You are the AI interviewer inside CareerShield, running a placement mock interview for a "${d}" role/track in India, in the current job market. Tailor questions to what this specific field actually expects a fresher or early-career candidate to know. Ask the first question — a warm but substantive opener, technical or behavioral. Return ONLY minified JSON: {"question": "<question text>"}`;
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
      const prompt = `You are the AI interviewer inside CareerShield, mid mock-interview for a "${domain}" role. This is question ${qNum + 1} of ${MAX_Q}.
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
      <p className="muted">Technical + HR rounds, tailored to your field, with instant AI feedback on every answer.</p>

      {!started && (
        <div className="panel domain-pick">
          <div className="panel-title">Choose a track</div>
          <div className="domain-grid">
            {DOMAINS.map((d) => (
              <button key={d} className="domain-btn" onClick={() => start(d)} disabled={loading}>
                <Briefcase size={16} /> {d}
              </button>
            ))}
          </div>

          <div className="custom-domain-row">
            <span className="hint">Don't see your field? Type it below.</span>
            <div className="custom-domain-input">
              <input
                type="text"
                className="text-input"
                placeholder="e.g. Pharmacy, Journalism, Textile Engineering, BCom..."
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && customDomain.trim()) start(customDomain.trim()); }}
                disabled={loading}
              />
              <button
                className="btn btn-primary"
                onClick={() => customDomain.trim() && start(customDomain.trim())}
                disabled={loading || !customDomain.trim()}
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {loading && <div className="hint"><Loader2 size={14} className="spin" /> Preparing your first question…</div>}
          <ErrorNote msg={error} />
        </div>
      )}

      {started && (
        <div className="interview-shell">
          <div className="interview-meta">
            <span>{domain}</span>
            <span>Question {Math.min(qNum + 1, MAX_Q)} of {MAX_Q}</span>
          </div>

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

function ResumeTab() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

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
Return ONLY minified JSON, no markdown, in exactly this shape:
{"atsScore": <integer 0-100>, "verdict": "<one direct line on where it stands>", "missingKeywords": ["<keyword>", "<keyword>", "<keyword>"], "suggestions": ["<concrete, line-level fix>", "<fix>", "<fix>"], "improvedResume": "<the full resume rewritten to be more professional — stronger action verbs, quantified achievements where the original plausibly supports it, cleaner structure, missing keywords woven in naturally. Stay truthful to the original facts; do not invent employers, titles, or numbers. Use \\n for line breaks between sections/lines.>"}`;
      const res = await askClaude(prompt);
      setResult(res);
    } catch (e) {
      setError(e.message || "Couldn't reach the AI engine. Check your connection and try again.");
    }
    setLoading(false);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setExtracting(true);
    setFileName(file.name);
    try {
      const text = await extractTextFromFile(file);
      if (!text) throw new Error("Couldn't find any readable text in that file.");
      setInput(text);
    } catch (err) {
      setError(err.message || "Couldn't read that file. Try pasting the text instead.");
      setFileName("");
    }
    setExtracting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const copyImproved = () => {
    if (!result?.improvedResume) return;
    navigator.clipboard.writeText(result.improvedResume);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="tab-pane">
      <Eyebrow>PLACEMENT READINESS</Eyebrow>
      <h2>AI Resume Checker.</h2>
      <p className="muted">Upload or paste your resume — Claude scores it against ATS filters, flags missing AI-role keywords, and rewrites it to be stronger.</p>

      <div className="panel">
        <div className="upload-row">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={extracting}
          >
            {extracting ? <><Loader2 size={16} className="spin" /> Reading file…</> : <><Upload size={16} /> Upload PDF / DOCX</>}
          </button>
          {fileName && !extracting && <span className="hint">{fileName}</span>}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            style={{ display: "none" }}
            onChange={handleFile}
          />
        </div>
        <textarea
          className="textarea"
          placeholder="Paste your resume text here… or upload a file above"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
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
        <>
          <div className="result-grid">
            <div className="panel result-score">
              <Gauge score={result.atsScore} label="ATS MATCH SCORE" />
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

          {result.improvedResume && (
            <div className="panel" style={{ marginTop: 16 }}>
              <div className="panel-actions" style={{ marginTop: 0, marginBottom: 12 }}>
                <div className="panel-title" style={{ marginBottom: 0 }}><Sparkles size={16} /> Improved Resume</div>
                <button className="btn btn-ghost" onClick={copyImproved}>
                  {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy text</>}
                </button>
              </div>
              <pre className="improved-resume">{result.improvedResume}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App shell                                                           */
/* ------------------------------------------------------------------ */

export default function CareerShieldApp() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="app">
      <style>{CSS}</style>
      <div className="bg-grid" aria-hidden="true" />

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
        </div>
      </nav>

      <main className="main">
        {tab === "overview" && <OverviewTab goTo={setTab} />}
        {tab === "radar" && <LayoffRadarTab />}
        {tab === "skills" && <SkillGapTab />}
        {tab === "interview" && <InterviewTab />}
        {tab === "resume" && <ResumeTab />}
      </main>

      <footer className="footer">
        <div className="footer-brand"><Shield size={16} /> CareerShield</div>
        <div className="footer-pills">Layoff Radar &middot; Skill Gap Analyzer &middot; AI Mock Interview &middot; Resume Checker</div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');

:root{
  --bg:#0A1220; --panel:#111D31; --panel-2:#16233B; --border:#243755;
  --text:#EAF0FA; --dim:#8CA0C4;
  --amber:#F5A623; --cyan:#4FD8E8; --violet:#8B7CF6; --red:#FF5C5C; --green:#34D399;
}
*{box-sizing:border-box;}
.app{ position:relative; background:
    radial-gradient(1100px 620px at 84% -8%, #1B3B5540 0%, transparent 62%),
    radial-gradient(900px 500px at -10% 40%, #2A2A5A2e 0%, transparent 55%),
    var(--bg);
  min-height:100vh; color:var(--text); font-family:'Inter',sans-serif; isolation:isolate; }
.bg-grid{ position:fixed; inset:0; z-index:0; pointer-events:none;
  background-image:
    linear-gradient(rgba(79,216,232,.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(79,216,232,.05) 1px, transparent 1px);
  background-size:46px 46px;
  -webkit-mask-image:radial-gradient(ellipse 75% 55% at 50% 0%, black 0%, transparent 72%);
          mask-image:radial-gradient(ellipse 75% 55% at 50% 0%, black 0%, transparent 72%); }
.navbar,.main,.footer{ position:relative; z-index:1; }
h1,h2{ font-family:'Space Grotesk',sans-serif; margin:0 0 10px; line-height:1.14; letter-spacing:-0.015em; }
h1{ font-size:clamp(32px,4.6vw,52px); }
h2{ font-size:clamp(22px,2.6vw,28px); }
p{ margin:0; }
.muted{ color:var(--dim); font-size:14.5px; line-height:1.6; }
.eyebrow{ display:flex; align-items:center; gap:8px; font-family:'JetBrains Mono',monospace; font-size:11.5px;
  letter-spacing:.14em; color:var(--cyan); margin-bottom:10px; }
.live-dot{ width:6px; height:6px; border-radius:50%; background:var(--cyan); flex:0 0 auto;
  box-shadow:0 0 0 0 rgba(79,216,232,.6); animation:livepulse 2s infinite; }
@keyframes livepulse{ 0%{ box-shadow:0 0 0 0 rgba(79,216,232,.55); } 70%{ box-shadow:0 0 0 8px rgba(79,216,232,0); } 100%{ box-shadow:0 0 0 0 rgba(79,216,232,0); } }
.grad-text{ background:linear-gradient(90deg, var(--cyan), var(--violet)); -webkit-background-clip:text; background-clip:text; color:transparent; }

.navbar{ position:sticky; top:0; z-index:20; display:flex; align-items:center; justify-content:space-between;
  padding:14px 28px; background:#0A1220cc; backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
  border-bottom:1px solid var(--border); flex-wrap:wrap; gap:10px; }
.brand{ display:flex; align-items:center; gap:8px; font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:17px; color:var(--cyan); }
.nav-tabs{ display:flex; gap:4px; flex-wrap:wrap; }
.nav-tab{ display:flex; align-items:center; gap:6px; background:transparent; border:1px solid transparent; color:var(--dim);
  font-family:'Inter',sans-serif; font-size:13px; font-weight:500; padding:8px 12px; border-radius:8px; cursor:pointer; transition:.18s ease; }
.nav-tab:hover{ color:var(--text); background:var(--panel); }
.nav-tab-active{ color:var(--bg); background:var(--cyan); box-shadow:0 6px 18px -6px rgba(79,216,232,.55); }
.nav-tab-active:hover{ color:var(--bg); background:var(--cyan); }

.main{ max-width:1080px; margin:0 auto; padding:40px 28px 80px; }
.tab-pane h2{ margin-top:2px; }

.hero{ display:flex; align-items:center; justify-content:space-between; gap:40px; padding:20px 0 44px; flex-wrap:wrap; }
.hero-copy{ flex:1 1 420px; max-width:580px; animation:fadeUp .65s ease both; }
.hero-sub{ color:var(--dim); font-size:16px; line-height:1.65; margin-top:12px; }
.hero-actions{ display:flex; gap:12px; margin-top:26px; flex-wrap:wrap; }
@keyframes fadeUp{ from{ opacity:0; transform:translateY(16px); } to{ opacity:1; transform:none; } }
@keyframes fadeIn{ from{ opacity:0; transform:scale(.94); } to{ opacity:1; transform:none; } }

.btn{ display:inline-flex; align-items:center; gap:8px; font-family:'Inter',sans-serif; font-weight:600; font-size:14px;
  padding:12px 20px; border-radius:10px; border:1px solid transparent; cursor:pointer; transition:.18s ease; white-space:nowrap; }
.btn:disabled{ opacity:.5; cursor:not-allowed; }
.btn-primary{ background:var(--cyan); color:#08151F; box-shadow:0 0 0 rgba(79,216,232,0); }
.btn-primary:hover:not(:disabled){ background:#6ee3f0; box-shadow:0 10px 28px -8px rgba(79,216,232,.55); transform:translateY(-1px); }
.btn-ghost{ background:transparent; border-color:var(--border); color:var(--text); }
.btn-ghost:hover{ background:var(--panel); border-color:var(--cyan); }

/* Radar viz */
.radar-viz{ position:relative; width:260px; height:260px; flex:0 0 260px; border-radius:50%;
  background:radial-gradient(circle at center, #123049 0%, #0D1930 75%); border:1px solid var(--border); overflow:hidden;
  box-shadow:0 0 70px -12px rgba(79,216,232,.3), inset 0 0 40px -10px rgba(79,216,232,.15);
  animation:fadeIn .8s ease .1s both; }
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
.blip-tag strong{ font-family:'Space Grotesk',sans-serif; font-size:12.5px; }
.blip-tag span{ color:var(--dim); }

.stat-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:14px; margin-bottom:52px; }
.stat-card{ background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:18px; transition:.2s ease; }
.stat-card:hover{ transform:translateY(-3px); border-color:#4FD8E866; box-shadow:0 14px 30px -14px rgba(0,0,0,.5); }
.stat-icon{ width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center;
  background:var(--panel-2); border:1px solid var(--border); }
.stat-value{ font-family:'JetBrains Mono',monospace; font-size:27px; font-weight:600; margin-top:12px; }
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
.bar-val{ font-family:'JetBrains Mono',monospace; font-size:13.5px; font-weight:600; text-align:right; }
.bar-val.neg{ color:var(--red); } .bar-val.pos{ color:var(--green); }

.loop{ margin-bottom:20px; }
.loop-row{ display:flex; align-items:center; gap:8px; margin-top:22px; flex-wrap:wrap; }
.loop-card{ flex:1 1 200px; text-align:left; background:var(--panel); border:1px solid var(--border); border-radius:14px;
  padding:18px; cursor:pointer; color:var(--text); transition:.2s ease; }
.loop-card:hover{ border-color:var(--cyan); background:var(--panel-2); transform:translateY(-2px);
  box-shadow:0 14px 30px -16px rgba(79,216,232,.35); }
.loop-card svg{ color:var(--cyan); }
.loop-title{ font-family:'Space Grotesk',sans-serif; font-weight:600; margin-top:10px; font-size:15px; }
.loop-desc{ color:var(--dim); font-size:12.5px; margin-top:4px; line-height:1.5; }
.loop-arrow{ color:var(--border); flex:0 0 auto; }

.filter-row{ display:flex; gap:8px; margin:20px 0 16px; }
.chip{ font-family:'Inter',sans-serif; font-size:12.5px; font-weight:500; padding:7px 13px; border-radius:20px;
  border:1px solid var(--border); background:transparent; color:var(--dim); cursor:pointer; transition:.15s; }
.chip:hover{ color:var(--text); }
.chip-active{ background:var(--cyan); color:#08151F; border-color:var(--cyan); }
.chip-static{ display:inline-flex; align-items:center; gap:5px; cursor:default; color:var(--text); background:var(--panel-2); }
.chip-static svg{ color:var(--green); }
.chip-warn{ color:var(--amber); border-color:#E8A33D55; }
.chip-row{ display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }

.table-wrap{ background:var(--panel); border:1px solid var(--border); border-radius:14px; overflow:hidden; margin-top:6px; }
.radar-table{ width:100%; border-collapse:collapse; font-size:13.5px; }
.radar-table th{ text-align:left; font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.08em; color:var(--dim);
  padding:13px 16px; border-bottom:1px solid var(--border); font-weight:500; }
.radar-table td{ padding:13px 16px; border-bottom:1px solid #22314A; }
.radar-table tr:last-child td{ border-bottom:none; }
.cell-name{ font-weight:600; } .cell-num{ font-family:'JetBrains Mono',monospace; }
.status-pill{ display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:600; padding:4px 9px; border-radius:20px; }
.status-red{ background:#FF6B5C22; color:var(--red); } .status-amber{ background:#E8A33D22; color:var(--amber); }

.panel{ position:relative; background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:20px;
  margin-top:18px; overflow:hidden; }
.panel::before{ content:""; position:absolute; top:0; left:0; right:0; height:2px;
  background:linear-gradient(90deg, transparent, var(--cyan), transparent); opacity:.55; }
.panel-title{ display:flex; align-items:center; gap:8px; font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:14.5px; margin-bottom:12px; }
.textarea{ width:100%; background:var(--panel-2); border:1px solid var(--border); border-radius:10px; color:var(--text);
  font-family:'Inter',sans-serif; font-size:14px; padding:13px; resize:vertical; outline:none; }
.textarea:focus{ border-color:var(--cyan); }
.panel-actions{ display:flex; align-items:center; justify-content:space-between; margin-top:12px; gap:12px; flex-wrap:wrap; }
.hint{ color:var(--dim); font-size:12px; display:flex; align-items:center; gap:6px; }
.error-note{ display:flex; align-items:center; gap:7px; color:var(--red); font-size:13px; margin-top:10px; }
.spin{ animation:spin 1s linear infinite; } @keyframes spin{ to{ transform:rotate(360deg); } }

.upload-row{ display:flex; align-items:center; gap:12px; margin-bottom:14px; flex-wrap:wrap; }
.improved-resume{ white-space:pre-wrap; font-family:'Inter',sans-serif; font-size:13.5px; line-height:1.7; color:var(--text);
  background:var(--panel-2); border-radius:10px; padding:16px; max-height:520px; overflow-y:auto; margin:0; }

.result-grid{ display:grid; grid-template-columns:280px 1fr; gap:16px; margin-top:16px; }
@media(max-width:720px){ .result-grid{ grid-template-columns:1fr; } }
.result-score{ display:flex; flex-direction:column; align-items:center; text-align:center; gap:14px; }
.result-summary{ color:var(--dim); font-size:13.5px; line-height:1.6; }
.gauge-wrap{ display:flex; flex-direction:column; align-items:center; gap:8px; }
.gauge{ width:130px; height:130px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
.gauge-inner{ width:100px; height:100px; border-radius:50%; background:var(--panel); display:flex; flex-direction:column;
  align-items:center; justify-content:center; }
.gauge-num{ font-family:'JetBrains Mono',monospace; font-size:28px; font-weight:600; }
.gauge-pct{ font-size:11px; color:var(--dim); }
.gauge-label{ font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.1em; color:var(--dim); }
.priority-row{ display:flex; gap:12px; align-items:flex-start; padding:10px 0; border-top:1px solid #22314A; }
.priority-row:first-of-type{ border-top:none; }
.priority-num{ font-family:'JetBrains Mono',monospace; color:var(--cyan); font-size:13px; padding-top:1px; }
.priority-skill{ font-weight:600; font-size:14px; } .priority-reason{ margin-top:2px; }

.domain-pick{ text-align:left; }
.domain-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:10px; }
.domain-btn{ display:flex; align-items:center; gap:9px; background:var(--panel-2); border:1px solid var(--border); color:var(--text);
  padding:13px 14px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; transition:.15s; }
.domain-btn:hover:not(:disabled){ border-color:var(--cyan); }
.domain-btn svg{ color:var(--cyan); }
.custom-domain-row{ margin-top:18px; padding-top:16px; border-top:1px solid var(--border); }
.custom-domain-input{ display:flex; gap:8px; margin-top:8px; }
.text-input{ flex:1; background:var(--panel-2); border:1px solid var(--border); border-radius:10px; color:var(--text);
  font-family:'Inter',sans-serif; font-size:14px; padding:11px 13px; outline:none; }
.text-input:focus{ border-color:var(--cyan); }
.custom-domain-input .btn{ padding:11px 16px; }

.interview-shell{ margin-top:16px; }
.interview-meta{ display:flex; justify-content:space-between; font-family:'JetBrains Mono',monospace; font-size:11.5px;
  color:var(--dim); letter-spacing:.05em; margin-bottom:10px; }
.chat-log{ display:flex; flex-direction:column; gap:14px; max-height:420px; overflow-y:auto; padding-right:4px; }
.chat-block{ background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:14px 16px; }
.chat-block.active{ border-color:#4FC3D955; }
.chat-q{ display:flex; gap:8px; font-weight:600; font-size:14px; color:var(--cyan); }
.chat-a{ margin-top:10px; font-size:13.5px; color:var(--text); background:var(--panel-2); border-radius:8px; padding:10px 12px; }
.chat-feedback{ margin-top:10px; font-size:12.5px; color:var(--dim); line-height:1.6; }
.feedback-score{ font-family:'JetBrains Mono',monospace; color:var(--green); font-weight:600; margin-right:8px; }

.footer{ border-top:1px solid var(--border); padding:24px 28px; display:flex; justify-content:space-between;
  align-items:center; flex-wrap:wrap; gap:8px; color:var(--dim); font-size:12.5px; }
.footer-brand{ display:flex; align-items:center; gap:7px; color:var(--text); font-weight:600; font-family:'Space Grotesk',sans-serif; }

@media(max-width:640px){
  .navbar{ padding:12px 16px; } .main{ padding:28px 16px 60px; }
  .radar-viz{ width:200px; height:200px; flex-basis:200px; }
  .nav-tab span{ display:none; } .nav-tab{ padding:9px; }
}

@media(prefers-reduced-motion:reduce){
  *{ animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important; }
}
`;
