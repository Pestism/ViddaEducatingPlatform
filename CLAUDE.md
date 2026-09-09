@AGENTS.md

# Vidda Hackathon Project Context

## Product Goal

We are building a hackathon MVP for Vidda Solutions: an AI-powered, human-in-the-loop compliance training platform for AML training.

The product should show this flow:

1. Select a role
2. Analyze role responsibilities and AML risk exposure
3. Human reviewer validates role/risk/regulation/competency mapping
4. Generate a role-specific training path
5. Generate actual training material for one selected module
6. Assign the training path to an employee through an LMS-style view
7. Monitor employee training activity through a realistic scenario/test
8. Evaluate the employee’s justification using AI and keep an audit trail

The key value is not “AI generates content.” The value is governance:
role-specific training, explainability, human approval, traceability, auditability, and measurable employee understanding.

## Current Architecture

Tech stack:
- Next.js / React / TypeScript / Tailwind
- API routes under `pages/api`
- Prisma + PostgreSQL
- OpenRouter for AI calls
- Mock fallback when AI fails

Important files:
- `app/page.tsx` — main multi-step UI
- `components/MLROScenarioSimulation.tsx` — employee monitoring scenario + AI justification evaluation
- `lib/scenarios.ts` — typed mock MLRO scenario data
- `pages/api/training/decision.ts` — logs scenario decision to audit
- `pages/api/training/evaluate.ts` — evaluates employee justification with OpenRouter, fallback to rule-based
- `pages/api/training/material.ts` — should generate actual training material for one selected module
- `prisma/schema.prisma` — database schema
- `lib/audit.ts` — audit logging utility

## Current Intended User Flow

Step 1: Select Role  
The manager selects a role such as MLRO, KYC Analyst, Transaction Monitoring Analyst, Customer Advisor, or AML DDI Manager.

Step 2: Analyze  
The system analyzes the role and generates AML/risk/training logic.

Step 3: Validate  
Human reviewer approves or edits role function, responsibilities, inherent AML risk, risk themes, regulatory obligations, competencies, and training focus.

Step 4: Training Path  
The system shows generated modules across Q1–Q4. These modules are a curriculum blueprint, not full training content yet.

Step 5: Generate Training Material  
The manager selects one generated module and generates actual short training material using AI. This is a vertical slice, not all 22 modules. The material must include learning objectives, summary, key concepts, role-specific example, AMLR traceability, and knowledge check. Manager approves it before assignment.

Step 6: LMS Assignment  
The manager assigns the training path to an employee.

Step 7: Monitor Training Activity  
The employee completes one realistic MLRO scenario. The platform tracks evidence reviewed, decision selected, justification written, AI evaluation, progress, and audit trail.

## Important Product Clarification

The 22 modules are currently a generated training path/curriculum. They are not 22 fully built courses yet.

For the hackathon MVP, implement one full vertical slice:
selected module → generated training material → manager approval → LMS assignment → one scenario/test → AI justification evaluation → audit trail.

Do not try to build 22 full modules, quizzes, and scenarios unless explicitly asked.

## AI Usage Rules

Use OpenRouter server-side only.
Never expose API keys in frontend code.
Never commit `.env`.

Use:
- `OPENROUTER_API_KEY` from `.env`
- small prompts
- selected module only
- max_tokens around 400–700 depending on route
- temperature around 0.2–0.3
- JSON output where useful
- deterministic mock fallback if AI fails

Token efficiency rules:
- Do not send the full 22-module list to AI.
- Do not send full AMLR documents unless explicitly requested.
- Do not send full source files to AI unless needed.
- Prefer selected role/module/scenario only.
- Cache generated material in React state.
- Only call AI when the user clicks Generate, Regenerate, or Submit.

## Coding Rules

Make small, localized changes.
Do not rewrite unrelated steps.
Do not touch Prisma migrations unless explicitly asked.
Do not change dependency versions unless explicitly asked.
Do not modify `.env`, secrets, or API keys.
Do not remove mock fallback behavior.
Do not break the existing demo flow.

Before editing, briefly state:
- files to create/change
- exact behavior change
- whether it affects existing steps
- whether it uses AI or fallback

After editing, run or suggest:
- `npm run dev`
- browser test of the affected flow

If TypeScript errors exist outside the touched files, classify them as pre-existing baseline issues. Do not fix broad baseline errors unless asked.

## Demo Priorities

The demo should clearly prove:

1. The training is role-specific.
2. The training is risk-based.
3. The output explains why each module exists.
4. A human reviewer can approve/edit AI output.
5. Actual training material can be generated for a selected module.
6. Employee activity can be monitored after assignment.
7. Employee reasoning is evaluated for audit readiness.
8. Every meaningful decision is traceable.

## Language / UI Wording

Use governance-friendly language:
- “training activity tracking”
- “audit trail”
- “manager review”
- “employee progress”
- “evidence reviewed”
- “justification submitted”
- “audit-ready”

Avoid surveillance-heavy language:
- “spying”
- “watching the employee”
- “monitoring what they share” unless framed as training submissions only.

## Current Feature Focus

The current missing feature is Step 5: Generate Training Material.

Goal:
Add a step between Training Path and LMS Assignment where the manager selects one generated module and uses AI to generate actual study material. This fixes the product gap where employees are tested but never shown training content.

Keep it minimal:
- one selected module only
- AI generation with mock fallback
- manager approve/regenerate
- assignment step should show warning or be gated until material is approved
- no database persistence unless explicitly requested