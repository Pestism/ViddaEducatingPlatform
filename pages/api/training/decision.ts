// pages/api/training/decision.ts
// Records a training scenario decision in the audit trail and returns the
// explainability feedback derived from lib/scenarios.ts. Single source of
// truth: verdict / AMLR articles / competency are looked up server-side so
// the audit log cannot drift from what the learner is shown.

import { NextApiRequest, NextApiResponse } from 'next';
import { logAudit } from '@/lib/audit';
import { SCENARIOS_BY_ID, DecisionKey } from '@/lib/scenarios';

type DecisionRequestBody = {
  employee_email?: string;
  role_title?: string;
  analysis_id?: string;
  scenario_id?: string;
  evidence_reviewed?: string[];
  decision?: DecisionKey;
  justification?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body ?? {}) as DecisionRequestBody;
  const {
    employee_email,
    role_title,
    analysis_id,
    scenario_id,
    evidence_reviewed,
    decision,
    justification,
  } = body;

  if (!employee_email || !role_title || !scenario_id || !decision || !justification) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['employee_email', 'role_title', 'scenario_id', 'decision', 'justification'],
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

  const timestamp = new Date().toISOString();
  const safeEvidenceReviewed = Array.isArray(evidence_reviewed) ? evidence_reviewed : [];

  // actor = employee_email (indexed). Don't duplicate it inside details.
  await logAudit('scenario_decision', employee_email, {
    role_title,
    analysis_id: analysis_id ?? null,
    scenario_id,
    scenario_title: scenario.title,
    evidence_reviewed: safeEvidenceReviewed,
    decision,
    justification,
    verdict: feedback.verdict,
    amlr_articles: feedback.amlrArticles,
    competency_tested: feedback.competencyTested,
    timestamp,
  });

  return res.status(200).json({
    logged: true,
    timestamp,
    feedback,
  });
}
