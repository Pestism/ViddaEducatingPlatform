// pages/api/training/evaluate.ts
// AI-backed justification evaluation. Calls OpenRouter (Claude) server-side
// using OPENROUTER_API_KEY from .env. Falls back to a deterministic mock
// evaluation if the key is missing or the upstream call fails, so the demo
// never breaks. The API key is never exposed to the client.

import type { NextApiRequest, NextApiResponse } from 'next';
import { SCENARIOS_BY_ID } from '@/lib/scenarios';
import type { DecisionKey } from '@/lib/scenarios';

type EvaluateRequestBody = {
  employee_email?: string;
  role_title?: string;
  scenario_id?: string;
  decision?: DecisionKey;
  justification?: string;
  evidence_reviewed?: string[];
};

type Verdict3 = 'yes' | 'partial' | 'no';
type Verdict2 = 'yes' | 'no';

export type AIEvaluation = {
  referencesEvidence: Verdict3;
  explainsDecision: Verdict3;
  mentionsRiskIndicators: Verdict3;
  consistentWithRecommended: Verdict3;
  auditReady: Verdict2;
  overallScore: number;
  missingElements: string[];
  suggestedImprovedJustification: string;
  summary: string;
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4.5';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body ?? {}) as EvaluateRequestBody;
  const { role_title, scenario_id, decision, justification, evidence_reviewed } = body;

  if (!role_title || !scenario_id || !decision || !justification) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['role_title', 'scenario_id', 'decision', 'justification'],
    });
  }

  const scenario = SCENARIOS_BY_ID[scenario_id];
  if (!scenario) {
    return res.status(404).json({ error: 'Unknown scenario_id' });
  }

  const feedback = scenario.feedbackByDecision[decision];
  if (!feedback) {
    return res.status(400).json({ error: 'Unknown decision for scenario' });
  }

  const decisionOption = scenario.decisions.find((d) => d.key === decision);
  const decisionLabel = decisionOption?.label ?? decision;
  const reviewedIds = Array.isArray(evidence_reviewed) ? evidence_reviewed : [];
  const reviewedEvidenceLabels = scenario.evidence
    .filter((e) => reviewedIds.includes(e.id))
    .map((e) => e.label);
  const allEvidenceLabels = scenario.evidence.map((e) => e.label);

  const apiKey = process.env.OPENROUTER_API_KEY;

  console.log(
    '[evaluate] OpenRouter key loaded:',
    apiKey ? `${apiKey.slice(0, 12)}...${apiKey.slice(-6)} len=${apiKey.length}` : 'NO KEY',
  );
  
  // Fallback path: no API key configured, return deterministic mock immediately.
  if (!apiKey) {
    return res.status(200).json({
      source: 'mock',
      reason: 'OPENROUTER_API_KEY not configured',
      evaluation: buildMockEvaluation({
        justification,
        decisionLabel,
        recommendedAction: feedback.recommendedAction,
        reviewedEvidenceLabels,
        allEvidenceLabels,
      }),
    });
  }

  const systemPrompt =
    'You are a compliance training evaluator for an AML governance platform. ' +
    'Given a scenario, a learner\'s decision, and the learner\'s written justification, ' +
    'assess whether the justification is suitable for audit and compliance documentation. ' +
    'Be strict but constructive. Return ONLY a JSON object — no prose, no markdown fences.';

  const userPrompt =
    'Evaluate the learner\'s justification for audit-readiness.\n\n' +
    'CONTEXT:\n' +
    `Role: ${role_title}\n` +
    `Scenario: ${scenario.title}\n` +
    `Scenario brief: ${scenario.brief}\n` +
    `All evidence indicators: ${JSON.stringify(allEvidenceLabels)}\n` +
    `Evidence indicators the learner reviewed: ${JSON.stringify(reviewedEvidenceLabels)}\n` +
    `Learner\'s decision: ${decisionLabel}\n` +
    `Recommended action for this scenario: ${feedback.recommendedAction}\n\n` +
    'LEARNER JUSTIFICATION:\n' +
    `"""${justification}"""\n\n` +
    'Return ONLY a JSON object matching this exact schema (no prose, no markdown fences):\n' +
    '{\n' +
    '  "referencesEvidence": "yes" | "partial" | "no",\n' +
    '  "explainsDecision": "yes" | "partial" | "no",\n' +
    '  "mentionsRiskIndicators": "yes" | "partial" | "no",\n' +
    '  "consistentWithRecommended": "yes" | "partial" | "no",\n' +
    '  "auditReady": "yes" | "no",\n' +
    '  "overallScore": integer 0-100,\n' +
    '  "missingElements": string[] (specific gaps, max 5 items),\n' +
    '  "suggestedImprovedJustification": string (improved version, 1-3 sentences, audit-ready),\n' +
    '  "summary": string (one-sentence overall assessment)\n' +
    '}';

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://vidda-solutions.local',
        'X-Title': 'Vidda Solutions Training Platform',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      console.error('[evaluate] OpenRouter non-OK', upstream.status, errText.slice(0, 500));
      return res.status(200).json({
        source: 'mock',
        reason: `OpenRouter ${upstream.status}`,
        evaluation: buildMockEvaluation({
          justification,
          decisionLabel,
          recommendedAction: feedback.recommendedAction,
          reviewedEvidenceLabels,
          allEvidenceLabels,
        }),
      });
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? '';

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      const stripped = content.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
      try {
        parsed = JSON.parse(stripped);
      } catch {
        parsed = null;
      }
    }

    const evaluation = sanitizeEvaluation(parsed);
    if (!evaluation) {
      console.error('[evaluate] failed to parse model output', content.slice(0, 500));
      return res.status(200).json({
        source: 'mock',
        reason: 'model output unparseable',
        evaluation: buildMockEvaluation({
          justification,
          decisionLabel,
          recommendedAction: feedback.recommendedAction,
          reviewedEvidenceLabels,
          allEvidenceLabels,
        }),
      });
    }

    return res.status(200).json({ source: 'ai', evaluation });
  } catch (err) {
    console.error('[evaluate] OpenRouter call failed', err);
    return res.status(200).json({
      source: 'mock',
      reason: 'upstream request failed',
      evaluation: buildMockEvaluation({
        justification,
        decisionLabel,
        recommendedAction: feedback.recommendedAction,
        reviewedEvidenceLabels,
        allEvidenceLabels,
      }),
    });
  }
}

// ---- helpers ---------------------------------------------------------------

const VERDICT3: ReadonlyArray<Verdict3> = ['yes', 'partial', 'no'];
const VERDICT2: ReadonlyArray<Verdict2> = ['yes', 'no'];

function asVerdict3(v: unknown, fallback: Verdict3): Verdict3 {
  return typeof v === 'string' && (VERDICT3 as readonly string[]).includes(v) ? (v as Verdict3) : fallback;
}

function asVerdict2(v: unknown, fallback: Verdict2): Verdict2 {
  return typeof v === 'string' && (VERDICT2 as readonly string[]).includes(v) ? (v as Verdict2) : fallback;
}

function asScore(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string').slice(0, 5);
}

function sanitizeEvaluation(v: unknown): AIEvaluation | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  return {
    referencesEvidence: asVerdict3(o.referencesEvidence, 'no'),
    explainsDecision: asVerdict3(o.explainsDecision, 'no'),
    mentionsRiskIndicators: asVerdict3(o.mentionsRiskIndicators, 'no'),
    consistentWithRecommended: asVerdict3(o.consistentWithRecommended, 'no'),
    auditReady: asVerdict2(o.auditReady, 'no'),
    overallScore: asScore(o.overallScore),
    missingElements: asStringArray(o.missingElements),
    suggestedImprovedJustification:
      typeof o.suggestedImprovedJustification === 'string'
        ? o.suggestedImprovedJustification.slice(0, 1000)
        : '',
    summary: typeof o.summary === 'string' ? o.summary.slice(0, 500) : '',
  };
}

function buildMockEvaluation(input: {
  justification: string;
  decisionLabel: string;
  recommendedAction: string;
  reviewedEvidenceLabels: string[];
  allEvidenceLabels: string[];
}): AIEvaluation {
  const j = input.justification.toLowerCase();
  const wordCount = input.justification.trim().split(/\s+/).filter(Boolean).length;

  const evidenceMentioned = input.reviewedEvidenceLabels.some((label) =>
    label
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .some((w) => j.includes(w)),
  );
  const referencesEvidence: Verdict3 = evidenceMentioned
    ? 'yes'
    : input.reviewedEvidenceLabels.length > 0
      ? 'partial'
      : 'no';

  const riskWords = ['risk', 'ubo', 'pep', 'sof', 'source of funds', 'structuring', 'sanction', 'jurisdiction', 'suspicious'];
  const riskHits = riskWords.filter((w) => j.includes(w)).length;
  const mentionsRiskIndicators: Verdict3 = riskHits >= 2 ? 'yes' : riskHits === 1 ? 'partial' : 'no';

  const explainsDecision: Verdict3 = wordCount >= 25 ? 'yes' : wordCount >= 12 ? 'partial' : 'no';
  const consistentWithRecommended: Verdict3 = mentionsRiskIndicators === 'no' ? 'partial' : 'yes';

  const passingCount =
    (referencesEvidence === 'yes' ? 1 : 0) +
    (explainsDecision === 'yes' ? 1 : 0) +
    (mentionsRiskIndicators === 'yes' ? 1 : 0) +
    (consistentWithRecommended === 'yes' ? 1 : 0);
  const auditReady: Verdict2 = passingCount >= 3 ? 'yes' : 'no';
  const overallScore = Math.round((passingCount / 4) * 100);

  const missingElements: string[] = [];
  if (referencesEvidence !== 'yes') missingElements.push('Cite specific evidence indicators reviewed (e.g. UBO, PEP match, SoF).');
  if (mentionsRiskIndicators !== 'yes') missingElements.push('Name at least one AML risk indicator using standard terminology.');
  if (explainsDecision !== 'yes') missingElements.push('Expand the rationale for why this decision was chosen.');
  if (consistentWithRecommended !== 'yes') missingElements.push('Align the rationale with the recommended action for this scenario.');

  const suggestedImprovedJustification =
    `Based on the reviewed indicators (${input.reviewedEvidenceLabels.slice(0, 3).join('; ') || 'evidence on file'}), ` +
    `the appropriate action is to ${input.decisionLabel.toLowerCase()}. ` +
    `The combination of identified red flags meets the suspicion threshold under AMLR Article 9, ` +
    `and the recommended course of action is: ${input.recommendedAction}`;

  const summary =
    auditReady === 'yes'
      ? `Justification is broadly audit-ready (score ${overallScore}). Minor strengthening could improve clarity.`
      : `Justification is not yet audit-ready (score ${overallScore}). Address the missing elements below before sign-off.`;

  return {
    referencesEvidence,
    explainsDecision,
    mentionsRiskIndicators,
    consistentWithRecommended,
    auditReady,
    overallScore,
    missingElements,
    suggestedImprovedJustification,
    summary,
  };
}
