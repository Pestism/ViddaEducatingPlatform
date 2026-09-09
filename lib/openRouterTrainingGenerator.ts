import { getRagArticleEvidence } from '@/lib/ragArticleEvidence';

export type ApprovedStepDetail = {
  label: string;
  value: string;
  badge?: string;
  articles?: number[];
  evidence?: string;
  article_excerpt?: string;
  article_excerpts?: Array<{
    article: number;
    text: string;
    document_id?: string;
    filename?: string;
  }>;
};

export type ApprovedStep = {
  title: string;
  summary: string;
  details: ApprovedStepDetail[];
};

export type OpenRouterGeneratedModule = {
  module: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  objective: string;
  duration: number;
  is_mandatory: boolean;
  content_type: string;
  reason_assigned: string;
  risk_alignment: string[];
  amlr_articles: number[];
  competencies: {
    knowledge: string[];
    skills: string[];
    judgment: string[];
  };
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getOpenRouterKey() {
  return process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY || '';
}

function parseJsonObject(text: string) {
  const trimmed = text.trim();
  const withoutFence = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    : trimmed;
  const objectStart = withoutFence.indexOf('{');
  const objectEnd = withoutFence.lastIndexOf('}');

  if (objectStart < 0 || objectEnd < objectStart) {
    throw new Error('OpenRouter response did not contain a JSON object');
  }

  return JSON.parse(withoutFence.slice(objectStart, objectEnd + 1)) as unknown;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeArticleArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 9 && item <= 15)
    .filter((item, index, array) => array.indexOf(item) === index)
    .slice(0, 4);
}

function normalizeModule(value: unknown, index: number): OpenRouterGeneratedModule {
  if (!isRecord(value)) {
    throw new Error(`OpenRouter module ${index + 1} is not an object`);
  }

  const quarter = QUARTERS.includes(value.quarter as (typeof QUARTERS)[number])
    ? (value.quarter as OpenRouterGeneratedModule['quarter'])
    : QUARTERS[index % QUARTERS.length];
  const competencies = isRecord(value.competencies) ? value.competencies : {};
  const duration = Number(value.duration);
  const articles = normalizeArticleArray(value.amlr_articles);

  return {
    module: typeof value.module === 'string' && value.module.trim() ? value.module.trim() : `Training Module ${index + 1}`,
    quarter,
    objective:
      typeof value.objective === 'string' && value.objective.trim()
        ? value.objective.trim()
        : 'Apply role-specific AML/CFT obligations in daily work.',
    duration: Number.isFinite(duration) && duration > 0 ? duration : 3,
    is_mandatory: typeof value.is_mandatory === 'boolean' ? value.is_mandatory : true,
    content_type:
      typeof value.content_type === 'string' && value.content_type.trim() ? value.content_type.trim() : 'Workshop',
    reason_assigned:
      typeof value.reason_assigned === 'string' && value.reason_assigned.trim()
        ? value.reason_assigned.trim()
        : 'Generated from approved role evidence and AMLR article evidence.',
    risk_alignment: normalizeStringArray(value.risk_alignment),
    amlr_articles: articles.length > 0 ? articles : [11, 13],
    competencies: {
      knowledge: normalizeStringArray(competencies.knowledge),
      skills: normalizeStringArray(competencies.skills),
      judgment: normalizeStringArray(competencies.judgment),
    },
  };
}

function extractModules(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.modules)) {
    throw new Error('OpenRouter response JSON must contain a modules array');
  }

  const modules = payload.modules.map(normalizeModule);

  if (modules.length === 0) {
    throw new Error('OpenRouter returned no modules');
  }

  return modules;
}

function collectArticleNumbers(approvedSteps: Record<string, ApprovedStep>) {
  const articles = new Set<number>();

  Object.values(approvedSteps).forEach((step) => {
    step.details?.forEach((detail) => {
      detail.articles?.forEach((article) => {
        if (Number.isInteger(article) && article >= 9 && article <= 15) {
          articles.add(article);
        }
      });
    });
  });

  return [...articles].sort((a, b) => a - b);
}

async function getArticleEvidence(approvedSteps: Record<string, ApprovedStep>) {
  const articles = collectArticleNumbers(approvedSteps);
  const evidenceEntries = await Promise.all(
    articles.map(async (article) => {
      const evidence = await getRagArticleEvidence(article, `Approved training path generation for AMLR Article ${article}`);

      return {
        article,
        filename: evidence.hits[0]?.filename || evidence.document?.filename || 'AMLR document',
        text: evidence.hits[0]?.text || '',
      };
    })
  );

  return evidenceEntries.filter((entry) => entry.text);
}

export async function generateTrainingModulesWithOpenRouter(params: {
  roleTitle: string;
  responsibilities: string[];
  exposures: string[];
  approvedSteps: Record<string, ApprovedStep>;
}) {
  const apiKey = getOpenRouterKey();

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const articleEvidence = await getArticleEvidence(params.approvedSteps);
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
      'X-Title': 'Vidda Solutions Learning Program Generator',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You generate auditable AML/CFT training paths. Return valid JSON only. Use only the approved role analysis and AMLR evidence provided by the user.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            task:
              'Generate a role-specific quarterly training path. Choose the number of modules and quarter distribution based on the approved role evidence, risk severity, responsibility breadth, and AMLR evidence. Do not force exactly 3 modules per quarter and do not pad quarters with weak modules. Each module must be grounded in approved step data and cite relevant AMLR articles from the provided evidence.',
            output_schema: {
              modules: [
                {
                  module: 'string',
                  quarter: 'Q1|Q2|Q3|Q4',
                  objective: 'string',
                  duration: 3,
                  is_mandatory: true,
                  content_type: 'E-learning|Workshop|Case Study|Simulation|Assessment',
                  reason_assigned:
                    'Explain which approved role facts, risk exposures, responsibilities, and AMLR article evidence justify this module. Include one explicit sentence explaining why the module is mandatory or optional.',
                  risk_alignment: ['string'],
                  amlr_articles: [11, 13],
                  competencies: {
                    knowledge: ['string'],
                    skills: ['string'],
                    judgment: ['string'],
                  },
                },
              ],
            },
            role: {
              title: params.roleTitle,
              responsibilities: params.responsibilities,
              exposures: params.exposures,
            },
            approved_steps: params.approvedSteps,
            amlr_rag_evidence: articleEvidence,
            sequencing_rules: [
              'Generate only as many modules as are justified by the approved role evidence, usually between 8 and 16 modules.',
              'Q1 should cover foundations and core regulatory role expectations.',
              'Q2 should cover applied procedures, escalation, and documentation.',
              'Q3 should cover advanced scenarios, judgment, and risk-based decisions.',
              'Q4 should cover assurance, assessment, refresh, and continuous improvement.',
              'Quarter distribution can be uneven. High-risk roles can have more modules in a quarter where the learning burden is higher.',
              'Mark a module mandatory only when the approved role evidence, risk exposure, or AMLR obligation makes it essential for competent role performance.',
              'Mark a module optional when it is useful enrichment, role-adjacent, refresher, or development-oriented rather than essential.',
              'For every module, reason_assigned must justify both the content assignment and the mandatory/optional decision.',
              'Do not create generic modules that could apply to any role.',
            ],
          }),
        },
      ],
    }),
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`OpenRouter request failed with ${response.status}: ${body}`);
  }

  const payload = JSON.parse(body) as OpenRouterResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('OpenRouter response did not include message content');
  }

  return {
    model,
    articleEvidence,
    modules: extractModules(parseJsonObject(content)),
  };
}
