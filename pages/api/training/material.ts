// pages/api/training/material.ts
// Generates one selected module's training material via OpenRouter (Claude).
// Server-side only. Falls back to deterministic mock if no key / upstream fails.

import type { NextApiRequest, NextApiResponse } from 'next';

type MaterialRequestBody = {
  role_title?: string;
  module_name?: string;
  module_objective?: string;
  module_quarter?: string;
  module_duration?: number;
  module_amlr_articles?: number[];
  module_risk_alignment?: string[];
  module_competencies?: {
    knowledge?: string[];
    skills?: string[];
    judgment?: string[];
  };
};

type KnowledgeCheckItem = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

export type TrainingMaterial = {
  title: string;
  estimatedStudyTime: string;
  learningObjectives: string[];
  plainEnglishSummary: string;
  keyConcepts: string[];
  roleSpecificExample: string;
  regulatoryTraceability: string[];
  knowledgeCheck: KnowledgeCheckItem[];
  managerReviewNote: string;
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

  const body = (req.body ?? {}) as MaterialRequestBody;
  const {
    role_title,
    module_name,
    module_objective,
    module_quarter,
    module_duration,
    module_amlr_articles,
    module_risk_alignment,
    module_competencies,
  } = body;

  if (!role_title || !module_name || !module_objective) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['role_title', 'module_name', 'module_objective'],
    });
  }

  const safeArticles = Array.isArray(module_amlr_articles) ? module_amlr_articles : [];
  const safeRiskAlignment = Array.isArray(module_risk_alignment) ? module_risk_alignment : [];
  const knowledge = module_competencies?.knowledge ?? [];
  const skills = module_competencies?.skills ?? [];
  const judgment = module_competencies?.judgment ?? [];

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      source: 'mock',
      reason: 'OPENROUTER_API_KEY not configured',
      material: buildMockMaterial({
        role_title,
        module_name,
        module_objective,
        module_quarter,
        module_duration,
        safeArticles,
        safeRiskAlignment,
        knowledge,
        skills,
        judgment,
      }),
    });
  }

  const systemPrompt =
    'You are a senior AML compliance trainer producing short, role-specific learning material. ' +
    'Output must be concise, plain-English, and suitable for manager review before assignment to an employee. ' +
    'Return ONLY a JSON object — no prose, no markdown fences.';

  const userPrompt =
    'Generate training material for ONE module.\n\n' +
    `Role: ${role_title}\n` +
    `Module name: ${module_name}\n` +
    `Module objective: ${module_objective}\n` +
    (module_quarter ? `Quarter: ${module_quarter}\n` : '') +
    (module_duration ? `Duration (hours): ${module_duration}\n` : '') +
    (safeArticles.length ? `AMLR articles: ${safeArticles.join(', ')}\n` : '') +
    (safeRiskAlignment.length ? `Risk alignment: ${safeRiskAlignment.join(', ')}\n` : '') +
    (knowledge.length ? `Knowledge competencies: ${knowledge.join('; ')}\n` : '') +
    (skills.length ? `Skill competencies: ${skills.join('; ')}\n` : '') +
    (judgment.length ? `Judgment competencies: ${judgment.join('; ')}\n` : '') +
    '\nReturn ONLY a JSON object with this exact schema:\n' +
    '{\n' +
    '  "title": string,\n' +
    '  "estimatedStudyTime": string (e.g. "30 minutes"),\n' +
    '  "learningObjectives": string[] (3-5 items),\n' +
    '  "plainEnglishSummary": string (2-4 sentences),\n' +
    '  "keyConcepts": string[] (4-6 items, short phrases),\n' +
    '  "roleSpecificExample": string (one realistic scenario in 2-4 sentences, tailored to the role),\n' +
    '  "regulatoryTraceability": string[] (e.g. "AMLR Article 9 — CDD"),\n' +
    '  "knowledgeCheck": [\n' +
    '    {"question": string, "options": string[4], "correctAnswer": string (one of options), "explanation": string}\n' +
    '  ] (2 items),\n' +
    '  "managerReviewNote": string (one-sentence note flagging what the manager should verify)\n' +
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
        max_tokens: 700,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      console.error('[material] OpenRouter non-OK', upstream.status, errText.slice(0, 500));
      return res.status(200).json({
        source: 'mock',
        reason: `OpenRouter ${upstream.status}`,
        material: buildMockMaterial({
          role_title,
          module_name,
          module_objective,
          module_quarter,
          module_duration,
          safeArticles,
          safeRiskAlignment,
          knowledge,
          skills,
          judgment,
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

    const material = sanitizeMaterial(parsed);
    if (!material) {
      console.error('[material] failed to parse model output', content.slice(0, 500));
      return res.status(200).json({
        source: 'mock',
        reason: 'model output unparseable',
        material: buildMockMaterial({
          role_title,
          module_name,
          module_objective,
          module_quarter,
          module_duration,
          safeArticles,
          safeRiskAlignment,
          knowledge,
          skills,
          judgment,
        }),
      });
    }

    return res.status(200).json({ source: 'ai', material });
  } catch (err) {
    console.error('[material] OpenRouter call failed', err);
    return res.status(200).json({
      source: 'mock',
      reason: 'upstream request failed',
      material: buildMockMaterial({
        role_title,
        module_name,
        module_objective,
        module_quarter,
        module_duration,
        safeArticles,
        safeRiskAlignment,
        knowledge,
        skills,
        judgment,
      }),
    });
  }
}

// ---- helpers ---------------------------------------------------------------

function asStringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string').slice(0, max);
}

function sanitizeKnowledgeCheck(v: unknown): KnowledgeCheckItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const question = typeof o.question === 'string' ? o.question.slice(0, 400) : '';
      const options = asStringArray(o.options, 6);
      const correctAnswer = typeof o.correctAnswer === 'string' ? o.correctAnswer : '';
      const explanation = typeof o.explanation === 'string' ? o.explanation.slice(0, 500) : '';
      if (!question || options.length < 2 || !correctAnswer) return null;
      return { question, options, correctAnswer, explanation };
    })
    .filter((x): x is KnowledgeCheckItem => x !== null)
    .slice(0, 4);
}

function sanitizeMaterial(v: unknown): TrainingMaterial | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const title = typeof o.title === 'string' ? o.title.slice(0, 200) : '';
  const summary = typeof o.plainEnglishSummary === 'string' ? o.plainEnglishSummary.slice(0, 1500) : '';
  if (!title || !summary) return null;

  return {
    title,
    estimatedStudyTime:
      typeof o.estimatedStudyTime === 'string' ? o.estimatedStudyTime.slice(0, 50) : '30 minutes',
    learningObjectives: asStringArray(o.learningObjectives, 6),
    plainEnglishSummary: summary,
    keyConcepts: asStringArray(o.keyConcepts, 8),
    roleSpecificExample:
      typeof o.roleSpecificExample === 'string' ? o.roleSpecificExample.slice(0, 1500) : '',
    regulatoryTraceability: asStringArray(o.regulatoryTraceability, 8),
    knowledgeCheck: sanitizeKnowledgeCheck(o.knowledgeCheck),
    managerReviewNote:
      typeof o.managerReviewNote === 'string' ? o.managerReviewNote.slice(0, 500) : '',
  };
}

function buildMockMaterial(input: {
  role_title: string;
  module_name: string;
  module_objective: string;
  module_quarter?: string;
  module_duration?: number;
  safeArticles: number[];
  safeRiskAlignment: string[];
  knowledge: string[];
  skills: string[];
  judgment: string[];
}): TrainingMaterial {
  const {
    role_title,
    module_name,
    module_objective,
    module_quarter,
    module_duration,
    safeArticles,
    safeRiskAlignment,
    knowledge,
    skills,
    judgment,
  } = input;

  const studyTime = module_duration ? `${module_duration} hour(s)` : '30 minutes';
  const articlesText = safeArticles.length ? `AMLR Articles ${safeArticles.join(', ')}` : 'AMLR Article 9';

  return {
    title: `${module_name} — ${role_title} edition`,
    estimatedStudyTime: studyTime,
    learningObjectives: [
      module_objective,
      ...knowledge.slice(0, 2).map((k) => `Understand: ${k}`),
      ...skills.slice(0, 1).map((s) => `Demonstrate: ${s}`),
    ].slice(0, 5),
    plainEnglishSummary:
      `This module equips a ${role_title} with the core knowledge and procedures behind "${module_name}". ` +
      `The focus is on ${module_objective.charAt(0).toLowerCase()}${module_objective.slice(1)} ` +
      `and on applying ${articlesText} in day-to-day decisions. ` +
      `Quarter ${module_quarter ?? 'Q1'} sequencing places this material at the appropriate point in the training year.`,
    keyConcepts: [
      ...knowledge.slice(0, 3),
      ...skills.slice(0, 2),
      ...judgment.slice(0, 1),
    ].slice(0, 6),
    roleSpecificExample:
      `As a ${role_title}, you encounter a case touching the risks: ${safeRiskAlignment.slice(0, 3).join(', ') || 'CDD and ongoing monitoring'}. ` +
      `Applying ${articlesText}, you work through identification, verification, and escalation steps, documenting each decision so the audit trail can later defend the outcome.`,
    regulatoryTraceability: safeArticles.length
      ? safeArticles.map((a) => `AMLR Article ${a}`)
      : ['AMLR Article 9 — Customer due diligence'],
    knowledgeCheck: [
      {
        question: `Which regulatory anchor is most directly relevant to "${module_name}"?`,
        options: [
          articlesText,
          'GDPR Article 6',
          'PCI-DSS v4',
          'FATF Recommendation 40',
        ],
        correctAnswer: articlesText,
        explanation: `This module is mapped to ${articlesText} in the training-path generation step.`,
      },
      {
        question: `What is the primary objective of this module for a ${role_title}?`,
        options: [
          module_objective,
          'Maximise customer onboarding throughput',
          'Reduce KYC documentation requirements',
          'Replace MLRO sign-off with automated rules',
        ],
        correctAnswer: module_objective,
        explanation: 'The objective comes directly from the curriculum mapping for this role.',
      },
    ],
    managerReviewNote:
      'Verify the role-specific example and regulatory traceability match your institution\'s policies before assigning to the learner.',
  };
}
