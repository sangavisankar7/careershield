import React, { useState, useEffect, useRef } from "react";
import {
  Shield, Search, Brain, MessageSquare, FileText, TrendingUp, TrendingDown,
  AlertTriangle, Target, Send, Loader2, CheckCircle2, Sparkles,
  Briefcase, ArrowRight, ChevronRight, RotateCcw, Radio,
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

const DOMAINS = ["AI/ML Engineer", "Full-Stack Developer", "Data Analyst", "Cloud/DevOps Engineer"];
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

      <section className="stat-grid">
        {STATS.map((s) => (
          <div className={`stat-card tone-${s.tone}`} key={s.label}>
            <s.Icon size={18} />
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
      const prompt = `You are the AI interviewer inside CareerShield, running a mock interview for a "${d}" role at an Indian IT company in the current AI-hiring climate. Ask the first question — a warm but substantive opener, technical or behavioral. Return ONLY minified JSON: {"question": "<question text>"}`;
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
      <p className="muted">Technical + HR rounds, domain-specific, with instant AI feedback on every answer.</p>

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
              <div cla
