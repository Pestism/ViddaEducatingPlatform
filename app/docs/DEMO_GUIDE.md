# Vidda Solutions — Demo Guide
## AI-Powered Governance Training Platform

---

## What This Product Does

Vidda Solutions is a **human-in-the-loop compliance training platform** for AML (Anti-Money Laundering) teams. It does not just generate content — it generates **governed, explainable, role-specific training** with full traceability.

The product proves that:
- Training is role-specific, not generic
- Every module has a documented "why" (linked to AMLR regulation)
- A human reviewer approves every AI output before it reaches an employee
- Employee reasoning is evaluated for audit-readiness after training

The audience is a bank's Head of Compliance, MLRO, or L&D Manager.

---

## System Architecture

```
Browser (Next.js App Router)
        │
        ├── app/page.tsx          — 7-step multi-stage UI
        ├── components/
        │   ├── TrainingMaterialGenerator.tsx  — Step 5 module content
        │   └── MLROScenarioSimulation.tsx     — Step 7 scenario/test
        │
        ├── pages/api/            — Server-side API routes (Pages Router)
        │   ├── roles/import.ts              — Step 1: role import
        │   ├── analysis/run.ts              — Step 2: RAG + AI analysis
        │   ├── analysis/[id].ts             — Fetch analysis + modules
        │   ├── training-path/generate.ts    — Step 4: curriculum via OpenRouter
        │   ├── training/material.ts         — Step 5: module content via OpenRouter
        │   ├── training/evaluate.ts         — Step 7: AI justification evaluation
        │   ├── training/decision.ts         — Step 7: audit log write
        │   └── rag/article.ts               — On-demand AMLR article RAG evidence
        │
        └── lib/
            ├── ragMcp.ts                — RAG MCP client (bluetext.dev)
            ├── ragArticleEvidence.ts    — AMLR article evidence fetcher
            ├── analysisGenerator.ts     — Claude / fallback analysis builder
            ├── openRouterTrainingGenerator.ts  — Training path via OpenRouter
            ├── scenarios.ts             — MLRO scenario data (single source of truth)
            ├── audit.ts                 — Audit log utility
            └── db.ts                    — Prisma client singleton
```

**Database:** PostgreSQL via Prisma ORM — 4 models: `AuditLog`, `Role`, `AnalysisRun`, `Module`.

---

## Environment Variables

| Variable | Used By | Effect if Missing |
|---|---|---|
| `DATABASE_URL` | All DB operations | App will crash at startup |
| `RAG_TOKEN` | `lib/ragMcp.ts` | Analysis fails (no RAG context) |
| `ANTHROPIC_API_KEY` | `lib/analysisGenerator.ts` | Falls back to deterministic mock |
| `OPENROUTER_API_KEY` | Training path, material, evaluate | Falls back to deterministic mock |
| `ANTHROPIC_MODEL` | Analysis generator | Defaults to `claude-sonnet-4-5-20250929` |

> **Demo tip:** The app is fully usable without `RAG_TOKEN` or `ANTHROPIC_API_KEY`. Every AI-dependent path has a deterministic mock that produces realistic output. The governance flow — approval, audit trail, evaluation — works identically with mocked content.

---

## The 7-Step Demo Flow

---

### STEP 1 — Select Role

**What happens in the UI:**
The manager selects one of 5 pre-loaded roles from the landing screen.

**Available roles:**
| Role | Band | Key Risk |
|---|---|---|
| MLRO (Money Laundering Reporting Officer) | 5 | Personal criminal liability for SAR decisions |
| KYC Analyst | G | Detection failures enable illegitimate customers |
| Transaction Monitoring Analyst | F | Missed alerts enable layering |
| Customer Advisor | F | Weak onboarding is the first line of defence |
| AML DDI Manager | H | Third-party partner risk propagation |

**What fires under the hood:**
1. `POST /api/roles/import` with `{ role_key }` (e.g. `"mlro"`)
2. The API looks up the role definition (title, responsibilities[], exposures[]) from a hardcoded map
3. Creates a `Role` record in PostgreSQL
4. Writes an `AuditLog` entry: `role_imported`
5. Returns `role_id` and `role_title`
6. UI stores `roleId`, `roleTitle`, `selectedRoleKey` in React state
7. Advances to Step 2

**Key code:** `pages/api/roles/import.ts` → `lib/db.ts` → `lib/audit.ts`

---

### STEP 2 — Analyse

**What happens in the UI:**
A "Run ViddaGPT Analysis" button triggers the RAG-backed AI analysis. A loading spinner shows "ViddaGPT is retrieving role and AMLR evidence from RAG..."

**What fires under the hood:**

#### Phase A — RAG Document Retrieval (requires `RAG_TOKEN`)

`POST /api/analysis/run` is called with `{ role_id }`.

Two parallel RAG queries are sent to the external MCP server at `https://rag.bluetext.dev/mcp/`:

**Query 1 — Role Evidence:**
```
Compliance training analysis for role: MLRO
Responsibilities: [list of role responsibilities]
Risk exposures: [list of risk exposures]
Find relevant AML, KYC, financial crime, governance, regulatory obligation,
competency, and training evidence.
```

**Query 2 — AMLR Article Evidence:**
```
Vidda Solutions Learning Program Generation AMLR 1624 articles
Retrieve the AMLR article text and training obligations for Articles 9-20.
Role context: MLRO
Responsibilities needing article mapping: [list]
```

Each query follows the **MCP (Model Context Protocol)** handshake:
1. `initialize` — negotiates protocol version, gets `mcp-session-id`
2. `notifications/initialized` — confirms session
3. `tools/call` → `search_docs` — executes the semantic search
4. Returns `content[]` or `structuredContent.result[]` blocks

#### Phase B — AI Analysis Generation

The RAG context is passed to `lib/analysisGenerator.ts` → `generateAnalysisFromRag()`:

- **If `ANTHROPIC_API_KEY` is set:** Calls Claude (`claude-sonnet-4-5-20250929`) with a structured prompt asking for a 7-step framework and a training curriculum in JSON format. Max 12,000 tokens.
- **If `ANTHROPIC_API_KEY` is NOT set:** `buildFallbackAnalysis()` runs — a deterministic function that maps responsibilities and exposures to AMLR articles using keyword matching. Still produces full `framework_steps` and `curriculum` output.

**Output shape:**
```json
{
  "role_profile": { "title": "MLRO", "department": "Risk and Compliance", ... },
  "framework_steps": {
    "1": { "title": "Role Function Analysis", "summary": "...", "details": [...] },
    "2": { "title": "Main Responsibilities Identified", "details": [...] },
    "3": { "title": "Inherent AML Risk Assessment", "details": [..., badge: "CRITICAL"] },
    "4": { "title": "Risk Themes Extraction", "details": [...] },
    "5": { "title": "Regulatory Obligations Mapped", "details": [..., articles: [9, 11]] },
    "6": { "title": "Competencies Framework (K/S/J)", "details": [...] },
    "7": { "title": "Training Focus & Curriculum Structure", "details": [...] }
  },
  "curriculum": [ { "module": "...", "quarter": "Q1", "amlr_articles": [9, 12], ... } ],
  "generation_mode": "CLAUDE_RAG" | "DETERMINISTIC_RAG_FALLBACK"
}
```

Each `detail` object can carry:
- `articles: number[]` — AMLR article numbers (triggers clickable buttons in UI)
- `article_excerpts: [{article, text}]` — inline article text snippets
- `badge: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"` — risk severity
- `evidence: string` — raw RAG text source

#### Phase C — Database Write

- `AnalysisRun` record created with `status: "processing"`, updated to `status: "completed"`
- All curriculum modules written as individual `Module` rows
- Multiple `AuditLog` entries: `analysis_started`, `rag_search_completed`, `analysis_completed`

#### Phase D — UI State Update

Back in `handleRunAnalysis()`:
- Fetches `GET /api/analysis/{id}` to get modules
- Sets `roleData` (role-specific exposures per selected role key)
- Sets `generatedSteps` from `viddagpt_output.framework_steps`
- Advances to Step 3

**Key code:** `pages/api/analysis/run.ts` → `lib/ragMcp.ts` → `lib/analysisGenerator.ts`

---

### STEP 3 — Validate (Human-in-the-Loop)

**What happens in the UI:**
The manager sees 7 expandable governance checkpoints. Each maps to one of the 7 framework steps from the AI output. The manager must **Approve**, **Modify**, or **Reject** each step before advancing.

**The 7 checkpoints:**
| # | Checkpoint | Content |
|---|---|---|
| 1 | Role Function | Job title, primary function, department |
| 2 | Main Responsibilities | All responsibilities extracted from the role definition |
| 3 | Inherent AML Risk | Risk exposures with CRITICAL/HIGH/MEDIUM/LOW badges |
| 4 | Risk Themes | Thematic grouping of risk dimensions |
| 5 | Regulatory Obligations | AMLR Articles 9–15 mapped to this role |
| 6 | Competencies (K/S/J) | Knowledge, Skills, Judgment framework |
| 7 | Training Focus | Q1–Q4 curriculum structure overview |

**Content priority (what `getStepContent()` returns):**
1. If step has been manually edited and saved → returns the edited version
2. If AI generated `framework_steps` → returns AI content (includes `articles[]`, article excerpts)
3. Fallback → hardcoded defaults per role

**RAG Article Evidence feature (live in Step 3):**
When steps contain `articles: [9, 11, ...]`, blue "AMLR Article 9" buttons appear. Clicking one:
1. Calls `GET /api/rag/article?article=9&context=[step summary]`
2. API calls `lib/ragArticleEvidence.ts` → `getRagArticleEvidence(9, context)`
3. Searches the RAG corpus for the AMLR 1624 document
4. Filters hits to only AMLR source documents (not role descriptions)
5. Fetches the full document via `getRagDocument(document_id)` to get highlighted text
6. Returns `{ hits[], document: { text, highlights[] } }`
7. UI shows inline snippet; clicking "Show evidence" expands the hit
8. If a full document is returned, a floating `<aside>` panel opens on the right side showing the full AMLR article text with yellow highlights at the matched sentences

**Modify flow:**
- Click "Modify" → step enters edit mode
- Manager edits field values or risk badge dropdowns
- Click "Save Changes" → saves to local `stepData` state (not to database)
- Step shows "MODIFIED" badge
- Step can then be Approved

**Governance gate:** All 7 steps must be Approved to proceed. The "Next: View Training Path →" button is disabled until all 7 are green.

**Key code:** `app/page.tsx` (getStepContent, handleApproveStep, handleArticleClick) → `pages/api/rag/article.ts` → `lib/ragArticleEvidence.ts`

---

### STEP 4 — Training Path

**What happens in the UI:**
A full curriculum is displayed — typically 12–22 modules across Q1–Q4. Quarter filter tabs allow narrowing. Clicking any module expands its explainability panel.

**How the training path is generated:**
When all 7 steps are approved and the manager clicks "Next: View Training Path →", `handleGenerateTrainingPath()` fires:

1. Collects all 7 approved step contents (modified or original)
2. Calls `POST /api/training-path/generate` with `{ analysis_id, approved_steps }`
3. API calls `lib/openRouterTrainingGenerator.ts` → `generateTrainingModulesWithOpenRouter()`
4. Sends approved step data to OpenRouter (Claude) with a focused prompt asking only for the curriculum array
5. Saves generated modules to database (`Module` records, overwriting previous ones)
6. Returns modules with full explainability metadata

**Each module shows:**
- Name, quarter, duration, content type (E-learning / Workshop / Case Study)
- Objective
- `reason_assigned` — plain-English explanation of why this module exists for this role
- `risk_alignment[]` — which risk dimensions it addresses
- `amlr_articles[]` — which AMLR articles it is mapped to
- `competencies: { knowledge[], skills[], judgment[] }` — K/S/J model

**Why this matters for the demo:** Every module is traceable. The system can defend why each module exists. This is governance, not content generation.

**Key code:** `pages/api/training-path/generate.ts` → `lib/openRouterTrainingGenerator.ts`

---

### STEP 5 — Generate Training Material

**What happens in the UI:**
The manager selects one module from a dropdown list. Clicking "Generate Material" calls the AI. The generated study material appears with all sections. The manager can Approve or Regenerate. The "Next: Assign to LMS →" button is gated behind at least one approved material.

**What fires under the hood:**
1. Manager selects a module from the training path
2. Clicks "Generate Training Material"
3. `POST /api/training/material` is called with the selected module's metadata:
   - `role_title`, `module_name`, `module_objective`, `module_quarter`, `module_duration`
   - `module_amlr_articles[]`, `module_risk_alignment[]`, `module_competencies`
4. API calls OpenRouter (`claude-sonnet-4.5`, temp 0.3, max 700 tokens)
5. Returns structured `TrainingMaterial` object

**TrainingMaterial shape:**
```json
{
  "title": "MLRO: Beneficial Ownership Review — MLRO edition",
  "estimatedStudyTime": "3 hour(s)",
  "learningObjectives": ["...", "...", "..."],
  "plainEnglishSummary": "2-4 sentence plain-English overview",
  "keyConcepts": ["UBO documentation", "Article 9 CDD", ...],
  "roleSpecificExample": "As an MLRO, you encounter a case where...",
  "regulatoryTraceability": ["AMLR Article 9 — CDD", "AMLR Article 11 — Compliance"],
  "knowledgeCheck": [
    { "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "A", "explanation": "..." }
  ],
  "managerReviewNote": "Verify the role-specific example matches your institution's policies."
}
```

**Fallback:** If `OPENROUTER_API_KEY` is missing or the call fails, `buildMockMaterial()` produces the same shape using the module's own metadata — deterministic, realistic, never crashes.

**Manager approval:** Clicking "Approve" stores the module ID in `approvedMaterialIds` (React state). The gating button to Step 6 checks `approvedMaterialIds.size > 0`.

**Key code:** `pages/api/training/material.ts` → `components/TrainingMaterialGenerator.tsx`

---

### STEP 6 — LMS Assignment

**What happens in the UI:**
The manager sees a summary of the training path (total modules, mandatory count, total hours, AMLR article range). They enter an employee email address and click "Assign Training Path".

**What fires under the hood:**
- Email is validated client-side (`/^\S+@\S+\.\S+$/`)
- On click: `employeeEmail` state is set, advances to Step 7
- The email is passed to `MLROScenarioSimulation` in Step 7 and included in all subsequent audit logs

**Audit trail shown:** A mock complete audit trail is displayed for demo purposes, showing all prior events (role_imported → analysis_started → all steps approved → assigned).

**Note:** The `Enrollment` database model exists for full LMS persistence, but in the hackathon MVP, assignment is session-state only (no DB write at this step).

**Key code:** `app/page.tsx` (Step 6 JSX, `employeeEmail` state)

---

### STEP 7 — Monitor Training Activity

Step 7 has two completely separate views rendered on the same screen:
- **Top panel** — Manager's real-time learner dashboard (read-only, updates automatically)
- **Bottom panel** — Employee's scenario simulation (interactive, drives the dashboard)

---

#### Part A — Learner Dashboard (Manager View)

The manager sees this panel from the moment they arrive at Step 7. It starts empty and fills in as the employee works through the scenario.

| Field | Initial state | After submission |
|---|---|---|
| Employee email | The address entered in Step 6 | Unchanged |
| Assigned role | Role selected in Step 1 | Unchanged |
| Training status | "Not started" (grey badge) | "In progress" → "Completed" |
| Modules completed | 0 / {total} | Increments by 1 per submission |
| Progress | 0% + empty bar | Fills proportionally |
| Last decision | — | The label the employee selected (e.g. "Escalate / File internal SAR") |
| Last justification | — | First ~80 characters of the submitted text in italics |
| Audit status | — | `scenario_decision logged at HH:MM:SS` |

**Status badge logic:**
```
modulesCompleted === 0             → "Not started"   (grey)
modulesCompleted >= totalModules   → "Completed"     (green)
otherwise                          → "In progress"   (blue)
```

**How the dashboard updates:** When the employee submits, the `onScenarioComplete` callback fires and sets four React state values in the parent (`app/page.tsx`): `modulesCompleted`, `lastDecisionLabel`, `lastJustification`, `lastAuditTimestamp`. React re-renders the dashboard panel immediately — no page reload, no API poll.

---

#### Part B — MLRO Scenario Simulation (Employee View)

**Scenario: "Suspicious Onboarding Review"**

**Who is Northwind Holdings Ltd?**
A newly applying corporate customer escalated from KYC to the MLRO for a final decision. It is a holding company with layered ownership across two secrecy jurisdictions, a vague source-of-funds narrative, and suspicious transaction activity within 48 hours of account opening.

---

##### The 5 Evidence Indicators

Each indicator is shown as a collapsed card. Clicking it expands the detail panel AND marks it as "Reviewed" (tracked by ID in `reviewedEvidenceIds` state).

**1. Incomplete Ultimate Beneficial Ownership documentation**
- Risk badge: **CRITICAL**
- What it says: UBO chain ends at a nominee shareholder in British Virgin Islands. No notarised declaration naming the natural person(s) with >25% control.
- Why it matters: AMLR Article 9 requires identification and verification of the natural persons who ultimately own or control the customer. A nominee endpoint with no UBO declaration fails this obligation outright.

**2. High-risk jurisdiction exposure**
- Risk badge: **HIGH**
- What it says: Two ownership-chain entities are in FATF increased-monitoring list jurisdictions. Operating bank accounts are in a third high-risk country.
- Why it matters: AMLR Article 10 requires enhanced due diligence where geographic risk is elevated. Multiple layered high-risk jurisdictions is a recognised money-laundering typology.

**3. Possible PEP match (confidence 78%)**
- Risk badge: **HIGH**
- What it says: Adverse-media screening flagged a possible match against a foreign political figure with known corruption allegations. The match is unresolved — neither confirmed nor dismissed.
- Why it matters: AMLR Article 9 mandates enhanced due diligence for Politically Exposed Persons and their associates. An unresolved 78% match must be formally confirmed or dismissed with documented rationale — leaving it open is not acceptable.

**4. Unusual inbound transaction pattern**
- Risk badge: **CRITICAL**
- What it says: Six inbound wires totalling EUR 1.4M arrived within 48 hours of account opening. Each wire was just below the EUR 250k internal review threshold. Stated business is dormant-stage advisory.
- Why it matters: Threshold-avoidance structuring (Smurfing) is a classic placement-stage indicator. Activity inconsistent with stated business profile is an explicit red flag under AMLR Article 9.

**5. Weak source-of-funds evidence**
- Risk badge: **HIGH**
- What it says: Source-of-funds narrative cites "private investment proceeds" with no supporting bank statements, tax records, or contracts. No source-of-wealth documentation provided.
- Why it matters: AMLR Article 9 requires the institution to take reasonable measures to establish source of funds and source of wealth. An unverifiable narrative cannot satisfy this duty.

---

##### The 4 Decision Options

| Key | Label | isRecommended |
|---|---|---|
| `approve` | Approve onboarding | No |
| `reject` | Reject onboarding | No |
| `request_info` | Request more information | No |
| `escalate` | Escalate / File internal SAR | **Yes** |

Note: `isRecommended` is stored in `lib/scenarios.ts` but not shown as a hint in the UI — the employee must decide without guidance.

---

##### Submit Rules (canSubmit gate)

The "Submit decision" button is **disabled** unless ALL three conditions are met:

1. At least one evidence indicator has been opened (expanded/reviewed)
2. A decision has been selected
3. The justification text is at least 10 characters long

These constraints are intentional: they ensure the audit log always contains meaningful data — an employee cannot submit without looking at evidence and writing a rationale.

---

##### What Happens When Submit Is Clicked

Two API calls fire sequentially (decision first, then evaluation):

---

**API Call 1 — `POST /api/training/decision`**

Payload sent:
```json
{
  "employee_email": "jane.smith@bank.com",
  "role_title": "Money Laundering Reporting Officer (MLRO)",
  "scenario_id": "mlro-onboarding-001",
  "evidence_reviewed": ["ev-ubo", "ev-jurisdiction", "ev-transactions"],
  "decision": "escalate",
  "justification": "The UBO chain terminates at a nominee with no declaration..."
}
```

What the server does:
1. Looks up the scenario by `scenario_id` from `lib/scenarios.ts` (server-side — cannot be tampered by client)
2. Looks up `feedbackByDecision[decision]` — gets the pre-defined verdict, explanation, AMLR articles, and competency
3. Writes one `AuditLog` row to PostgreSQL:

```json
{
  "eventType": "scenario_decision",
  "actor": "jane.smith@bank.com",
  "details": {
    "role_title": "MLRO",
    "scenario_id": "mlro-onboarding-001",
    "scenario_title": "Suspicious Onboarding Review",
    "evidence_reviewed": ["ev-ubo", "ev-jurisdiction", "ev-transactions"],
    "decision": "escalate",
    "justification": "The UBO chain terminates at a nominee...",
    "verdict": "correct",
    "amlr_articles": [9, 10, 11],
    "competency_tested": { "area": "Judgment", "detail": "Recognising the suspicion threshold..." },
    "timestamp": "2026-05-21T14:32:11.000Z"
  }
}
```

Response returned to client:
```json
{
  "logged": true,
  "timestamp": "2026-05-21T14:32:11.000Z",
  "feedback": { ...full ScenarioFeedback object... }
}
```

---

**The Explainability Panel (shown immediately after submit)**

The `feedback` object returned drives a panel that appears below the scenario. It shows:
- **Verdict badge** — CORRECT (green) / ACCEPTABLE (amber) / INCORRECT (red)
- **Explanation** — a paragraph explaining whether the decision was right and why
- **Recommended action** — what the employee should have done (or confirmed they did correctly)
- **AMLR article tags** — blue badges for each article number relevant to this decision
- **Competency tested** — which K/S/J area was being assessed and what specifically
- **Consequence if wrong** — what would happen in reality if the wrong decision were made

**Verdict per decision for this scenario:**

| Decision | Verdict | Why |
|---|---|---|
| `escalate` | **CORRECT** | Unresolved UBO + PEP + structuring + weak SoF together clearly cross the suspicion threshold. MLRO has the duty and authority to act. |
| `reject` | **ACCEPTABLE** | Prevents onboarding, which is defensible. But silently declining without filing an internal SAR misses the regulatory duty to report suspicion, which is independent of the commercial decision. |
| `request_info` | **ACCEPTABLE** | Reasonable where suspicion is not yet fully formed. However, the structuring pattern already constitutes reportable suspicion, and tipping-off rules constrain what can be asked of the customer. |
| `approve` | **INCORRECT** | None of the AMLR Article 9 preconditions are satisfied. Approving would be a clear CDD failure and exposes the MLRO to personal criminal liability. |

---

**API Call 2 — `POST /api/training/evaluate`**

Fires immediately after the decision call returns. Evaluates whether the employee's written justification would survive a regulatory audit.

Payload:
```json
{
  "employee_email": "jane.smith@bank.com",
  "role_title": "MLRO",
  "scenario_id": "mlro-onboarding-001",
  "decision": "escalate",
  "justification": "The UBO chain terminates at a nominee...",
  "evidence_reviewed": ["ev-ubo", "ev-jurisdiction", "ev-transactions"]
}
```

**AI path (when `OPENROUTER_API_KEY` is set):**
Calls `claude-sonnet-4.5` via OpenRouter with temperature 0.3, max 400 tokens. The prompt gives the model: scenario brief, all evidence labels, which evidence the employee reviewed, the employee's decision, the recommended action, and the justification text. The model returns a structured JSON evaluation.

**Mock path (when key is missing or call fails):**
`buildMockEvaluation()` runs entirely server-side using these heuristics:
- `referencesEvidence` — checks if the justification text contains words from the reviewed evidence labels (yes / partial if some, no if none)
- `mentionsRiskIndicators` — counts AML terminology hits: `risk`, `ubo`, `pep`, `sof`, `source of funds`, `structuring`, `sanction`, `jurisdiction`, `suspicious` (yes ≥ 2 hits, partial = 1, no = 0)
- `explainsDecision` — word count: yes ≥ 25 words, partial ≥ 12 words, no < 12
- `consistentWithRecommended` — yes unless `mentionsRiskIndicators` is `no`
- `auditReady` — yes if 3 or more of the above are "yes"
- `overallScore` — percentage of the 4 criteria that scored "yes"

**AI Evaluation panel (purple box, appears after evaluation returns):**

Shows the source tag ("Claude via OpenRouter" or "rule-based fallback"), then:

```
[Audit-ready: YES]   Overall score: 82/100

"Justification is broadly audit-ready. References key evidence and correctly
identifies the suspicion threshold."

┌─────────────────────────────────────┬──────────┐
│ References evidence                 │  YES     │
│ Explains decision                   │  YES     │
│ Mentions risk indicators            │  PARTIAL │
│ Consistent with recommended action  │  YES     │
└─────────────────────────────────────┴──────────┘

What is missing:
• Name at least one AML risk indicator using standard terminology (e.g. UBO, structuring).

Suggested improved justification:
"Based on the reviewed indicators (Incomplete UBO documentation; High-risk jurisdiction
exposure; Unusual inbound transaction pattern), the appropriate action is to escalate
and file an internal SAR. The combination of identified red flags meets the suspicion
threshold under AMLR Article 9, and the recommended course of action is to freeze
onboarding and document the rationale."
```

---

##### After Submission — State Changes

Once `onScenarioComplete` fires in the component, these React state updates happen in the parent (`app/page.tsx`):

```
modulesCompleted  += 1          → progress bar fills, badge may change to "Completed"
lastDecisionLabel  = "Escalate / File internal SAR"
lastJustification  = "The UBO chain terminates at a nominee..."
lastAuditTimestamp = "2026-05-21T14:32:11.000Z"
```

The green audit confirmation line at the bottom of the scenario panel also appears:
```
✓ scenario_decision logged at 14:32:11 — actor: jane.smith@bank.com
```

The evidence cards, decision buttons, justification field, and submit button all become read-only (the `submitted` flag disables interaction).

---

##### What Is Stored in the Database

Every submission writes one `AuditLog` record regardless of which decision was chosen. The record is permanent and immutable (append-only table). It contains:
- Who decided (`actor` = employee email, indexed)
- What scenario (`scenario_id`, `scenario_title`)
- What evidence they looked at (`evidence_reviewed[]`)
- What they decided (`decision`)
- What they wrote (`justification`)
- Whether it was correct (`verdict`)
- Which regulation applies (`amlr_articles[]`)
- Which competency was tested (`competency_tested`)
- When it happened (`timestamp`)

This is the audit artefact that answers a regulator's question: "Can you prove your employee was trained to recognise this scenario and understood why the correct action was required?"

---

**Key code files for Step 7:**
- `lib/scenarios.ts` — single source of truth for scenario, evidence, decisions, and feedback per decision
- `components/MLROScenarioSimulation.tsx` — all UI logic, state, and API calls
- `pages/api/training/decision.ts` — audit log write + feedback lookup
- `pages/api/training/evaluate.ts` — AI justification evaluation + mock fallback
- `app/page.tsx` — Learner Dashboard rendering + `onScenarioComplete` callback

---

## RAG Integration Deep Dive

### What RAG Provides

The RAG (Retrieval-Augmented Generation) system is an external document corpus hosted at `https://rag.bluetext.dev/mcp/`. It contains:
- The AMLR 1624 (Anti-Money Laundering Regulation) full text
- Role description documents
- Hackathon information documents

RAG gives the AI grounded, real regulatory text rather than hallucinated summaries.

### The MCP Protocol

The RAG server implements MCP (Model Context Protocol). Every interaction requires:

```
POST https://rag.bluetext.dev/mcp/
Headers: Authorization: Bearer {RAG_TOKEN}
         Mcp-Session-Id: {session-id}   (after initialize)
```

**Session lifecycle:**
```
1. initialize  →  get mcp-session-id
2. notifications/initialized  →  confirm session
3. tools/call → search_docs  →  semantic search results
                get_document  →  full document text
```

**`search_docs` returns:**
- `structuredContent.result[]` — array of hits with `{ text, filename, score, document_id, label }`
- Each hit has a relevance `score` (0–1)

**`get_document` returns:**
- The full document text
- Used to fetch the complete AMLR article text for the document viewer

### How Article Evidence Works (Step 3)

```
User clicks "AMLR Article 9" button
    │
    ▼
GET /api/rag/article?article=9&context=[step summary]
    │
    ▼
lib/ragArticleEvidence.ts → getRagArticleEvidence(9, context)
    │
    ├── Build query: "AMLR 1624 Article 9 ... Exclude role descriptions"
    ├── searchRagDocuments(query) → RAG MCP search_docs
    ├── Filter hits to AMLR source only (not role/hackathon docs)
    ├── getFirstAmlrDocument(hits) → getRagDocument(document_id) → full doc
    ├── getArticleSection(docText, 9) → extract Article 9 text section
    └── getHighlightRanges(docText, hits) → character positions to highlight
    │
    ▼
Return { article: 9, hits[], document: { text, highlights[] } }
    │
    ▼
UI: inline snippet shown, <aside> opens with full highlighted document
```

The document viewer `<aside>` uses `renderHighlightedDocument()` to split the full document text into segments, wrapping matched sentences in `<mark>` (yellow highlight).

---

## Governance Model — The Core Value

The platform is built around 5 governance guarantees:

| Guarantee | How It's Implemented |
|---|---|
| **Role-specific** | Role exposures and responsibilities drive the AI prompt. Each module's `reason_assigned` explains why it exists for THIS role. |
| **Regulation-mapped** | Every module, every framework step, every scenario decision cites specific AMLR articles (9–15). |
| **Human-approved** | All 7 validation checkpoints must be approved before a training path is generated. Manager must approve generated material before assigning to employee. |
| **Explainable** | `reason_assigned`, `risk_alignment[]`, `amlr_articles[]`, and `competencies` are stored per module and shown in the UI. |
| **Auditable** | Every meaningful action writes to `AuditLog`: role import, analysis start/complete, RAG search, training path generation, training material approval, scenario decision, justification evaluation. |

---

## Known Limitations (Hackathon MVP)

- RAG evidence requires `RAG_TOKEN` — without it, article buttons won't fetch live evidence but the rest of the flow works
- The MLRO scenario is the only built scenario — other roles show the MLRO scenario for the demo
- LMS assignment writes to session state only (no DB enrollment record created)
- Training material is generated per session (not persisted in DB)
- Modules in the training path can differ between sessions if AI generates them (OpenRouter model is non-deterministic)
- The 22-module path is a curriculum plan — only one module's actual content is generated (vertical slice)
