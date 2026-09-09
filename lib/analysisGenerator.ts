import Anthropic from '@anthropic-ai/sdk';
import type { RagSearchContext } from '@/lib/ragMcp';

export type AnalysisDetail = {
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

export type FrameworkStep = {
  title: string;
  summary: string;
  details: AnalysisDetail[];
};

export type GeneratedModule = {
  module: string;
  quarter: string;
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

export type GeneratedAnalysis = {
  role_profile: {
    title: string;
    department: string;
    primary_function: string;
  };
  framework_steps: Record<string, FrameworkStep>;
  curriculum: GeneratedModule[];
  generation_mode: 'CLAUDE_RAG' | 'DETERMINISTIC_RAG_FALLBACK';
};

type RoleInput = {
  title: string;
  responsibilities: string[];
  exposures: string[];
};

type ArticleReference = {
  article: number;
  title: string;
  excerpt: string;
};

const AMLR_ARTICLES: ArticleReference[] = [
  {
    article: 9,
    title: 'Internal policies, controls, and customer due diligence',
    excerpt: 'Obliged entities maintain internal policies, controls, and procedures proportionate to identified risks.',
  },
  {
    article: 10,
    title: 'Business-wide risk assessment',
    excerpt: 'Risk assessments identify and evaluate money laundering and terrorist financing risks across the business.',
  },
  {
    article: 11,
    title: 'Compliance function and governance',
    excerpt: 'Compliance responsibilities, escalation routes, and oversight arrangements must be clearly assigned.',
  },
  {
    article: 12,
    title: 'Training and awareness',
    excerpt: 'Staff receive training that is relevant to their functions, risks, and regulatory obligations.',
  },
  {
    article: 13,
    title: 'Employee integrity, skills, and competence',
    excerpt: 'Employees are assessed for appropriate integrity, skills, knowledge, expertise, and good repute.',
  },
  {
    article: 14,
    title: 'Ongoing monitoring and review',
    excerpt: 'Customer and activity information is kept under review to detect changes in risk and suspicious patterns.',
  },
  {
    article: 15,
    title: 'Suspicious activity escalation and reporting',
    excerpt: 'Suspicious activity is escalated promptly and supported by clear records and rationale.',
  },
];

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

function getRagText(context: RagSearchContext, maxLength = 6000) {
  const content = context.toolResult.content || [];
  const text = content
    .map((item) => item.text)
    .filter((item): item is string => Boolean(item))
    .join('\n\n');

  return text.slice(0, maxLength);
}

function chooseArticles(text: string, index: number) {
  const normalized = text.toLowerCase();

  if (normalized.includes('training') || normalized.includes('competenc')) return [12, 13];
  if (normalized.includes('suspicious') || normalized.includes('sar') || normalized.includes('escalat')) return [11, 15];
  if (normalized.includes('audit') || normalized.includes('record') || normalized.includes('document')) return [9, 11];
  if (normalized.includes('high-risk') || normalized.includes('enhanced') || normalized.includes('wealth')) return [9, 10];
  if (normalized.includes('third') || normalized.includes('outsourc') || normalized.includes('partner')) return [9, 10];
  if (normalized.includes('review') || normalized.includes('monitor')) return [10, 14];

  return [AMLR_ARTICLES[index % AMLR_ARTICLES.length].article, 12];
}

function findArticle(articleNumber: number) {
  return AMLR_ARTICLES.find((article) => article.article === articleNumber) || AMLR_ARTICLES[0];
}

function detail(
  label: string,
  value: string,
  articles: number[],
  badge?: string,
  evidence?: string
): AnalysisDetail {
  if (articles.length === 0) {
    return {
      label,
      value,
      badge,
      articles: [],
      evidence,
    };
  }

  const primaryArticle = findArticle(articles[0]);
  const articleExcerpts = articles.map((articleNumber) => {
    const article = findArticle(articleNumber);

    return {
      article: article.article,
      text: article.excerpt,
      filename: 'RAG search_docs',
    };
  });

  return {
    label,
    value,
    badge,
    articles,
    evidence,
    article_excerpt: `Article ${primaryArticle.article}: ${primaryArticle.excerpt}`,
    article_excerpts: articleExcerpts,
  };
}

function parseExposure(exposure: string) {
  const colonIndex = exposure.indexOf(':');
  const beforeColon = colonIndex >= 0 ? exposure.substring(0, colonIndex).trim() : exposure;
  const afterColon = colonIndex >= 0 ? exposure.substring(colonIndex + 1).trim() : exposure;
  const parts = beforeColon.split(' ');

  return {
    level: parts[0] || 'MEDIUM',
    name: parts.slice(1).join(' ') || 'role_risk',
    description: afterColon,
  };
}

function buildFallbackAnalysis(
  role: RoleInput,
  roleContext: RagSearchContext,
  amlrContext: RagSearchContext
): GeneratedAnalysis {
  const articleDetails = AMLR_ARTICLES.map((article) =>
    detail(`Article ${article.article}`, article.title, [article.article], undefined, article.excerpt)
  );

  const responsibilities = role.responsibilities.map((responsibility, index) =>
    detail(
      `Responsibility ${index + 1}`,
      responsibility,
      chooseArticles(responsibility, index),
      undefined,
      getRagText(roleContext, 400)
    )
  );

  const risks = role.exposures.map((exposure, index) => {
    const parsed = parseExposure(exposure);

    return detail(
      `Risk: ${parsed.name}`,
      parsed.description,
      chooseArticles(exposure, index),
      parsed.level,
      getRagText(roleContext, 400)
    );
  });

  const themes = [
    detail('Role-derived risk theme', `${role.title} obligations and decision points`, [10, 11], undefined, getRagText(roleContext, 400)),
    detail('Control theme', 'Documented controls, escalation, monitoring, and auditability', [9, 11, 15]),
    detail('Learning theme', 'Training must target role-specific knowledge, skills, and judgment gaps', [12, 13]),
  ];

  const modules: GeneratedModule[] = role.responsibilities.slice(0, 12).map((responsibility, index) => {
    const articles = chooseArticles(responsibility, index);
    const quarter = QUARTERS[index % QUARTERS.length];

    return {
      module: `${role.title}: ${responsibility.split(' ').slice(0, 6).join(' ')}`,
      quarter,
      objective: `Apply ${responsibility.toLowerCase()} in a risk-based AML/CFT operating context.`,
      duration: index % 3 === 0 ? 4 : 3,
      is_mandatory: index < 8,
      content_type: index % 3 === 0 ? 'Workshop' : index % 3 === 1 ? 'Case Study' : 'E-learning',
      reason_assigned: `${role.title} performs this responsibility. Mapped to AMLR Articles ${articles.join(', ')} because the role requires traceable controls, competent execution, and documented judgment.`,
      risk_alignment: role.exposures.slice(0, 2).map((exposure) => parseExposure(exposure).name),
      amlr_articles: articles,
      competencies: {
        knowledge: [`AMLR Articles ${articles.join(', ')}`, 'Role-specific financial crime typologies', 'Internal control standards'],
        skills: ['Evidence review', 'Risk-based documentation', 'Escalation communication'],
        judgment: ['Proportionality of controls', 'Escalation threshold assessment', 'Evidence sufficiency'],
      },
    };
  });

  return {
    role_profile: {
      title: role.title,
      department: 'Risk and Compliance',
      primary_function: `${role.title} financial crime prevention, controls, and regulatory execution`,
    },
    framework_steps: {
      '1': {
        title: 'Role Function Analysis',
        summary: `RAG retrieved role evidence for ${role.title}`,
        details: [
          detail('Job Title', role.title, [], undefined, getRagText(roleContext, 500)),
          detail('Primary Function', `${role.title} financial crime prevention, controls, and regulatory execution`, [11, 13]),
          detail('Department', 'Risk and Compliance', [11]),
        ],
      },
      '2': {
        title: 'Main Responsibilities Identified',
        summary: `${responsibilities.length} responsibilities mapped from role evidence`,
        details: responsibilities,
      },
      '3': {
        title: 'Inherent AML Risk Assessment',
        summary: `${risks.length} risk exposures identified and article-mapped`,
        details: risks,
      },
      '4': {
        title: 'Risk Themes Extraction',
        summary: 'RAG role evidence grouped into training risk themes',
        details: themes,
      },
      '5': {
        title: 'Regulatory Obligations Mapped',
        summary: 'AMLR article mapping with source excerpts',
        details: articleDetails,
      },
      '6': {
        title: 'Competencies Framework (Knowledge/Skills/Judgment)',
        summary: 'K/S/J model generated from role duties and AMLR obligations',
        details: [
          detail('Knowledge Areas', 'AMLR obligations, role procedures, risk indicators, evidence standards, and governance routes', [12, 13]),
          detail('Skills Required', 'Investigation, documentation, monitoring, escalation, stakeholder communication, and audit preparation', [9, 11, 15]),
          detail('Judgment Capabilities', 'Risk-based proportionality, suspicion thresholds, evidence sufficiency, and remediation priority', [10, 14, 15]),
        ],
      },
      '7': {
        title: 'Training Focus & Curriculum Structure',
        summary: `${modules.length} generated modules across Q1-Q4`,
        details: QUARTERS.map((quarter) =>
          detail(
            `${quarter} Focus`,
            `${modules.filter((module) => module.quarter === quarter).length} modules mapped to role duties and AMLR evidence`,
            [12, 13],
            undefined,
            getRagText(amlrContext, 400)
          )
        ),
      },
    },
    curriculum: modules,
    generation_mode: 'DETERMINISTIC_RAG_FALLBACK',
  };
}

function parseClaudeJson(text: string): GeneratedAnalysis {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    : trimmed;

  return JSON.parse(jsonText) as GeneratedAnalysis;
}

export async function generateAnalysisFromRag(
  role: RoleInput,
  roleContext: RagSearchContext,
  amlrContext: RagSearchContext
): Promise<GeneratedAnalysis> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return buildFallbackAnalysis(role, roleContext, amlrContext);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';

  const message = await client.messages.create({
    model,
    max_tokens: 12000,
    system:
      'You generate auditable AML/CFT training analysis. Return valid JSON only. Every generated item must include AMLR article numbers and short source/evidence text.',
    messages: [
      {
        role: 'user',
        content: JSON.stringify({
          task:
            'Generate a seven-step framework analysis and training curriculum from the role evidence and AMLR evidence. Use the provided JSON shape exactly.',
          output_shape: {
            role_profile: {
              title: 'string',
              department: 'string',
              primary_function: 'string',
            },
            framework_steps: {
              '1': {
                title: 'Role Function Analysis',
                summary: 'string',
                details: [{ label: 'string', value: 'string', articles: [], evidence: 'string', article_excerpts: [{ article: 11, text: 'string from RAG result' }] }],
              },
              '2': 'same FrameworkStep shape for responsibilities',
              '3': 'same FrameworkStep shape for inherent AML risk; use badge CRITICAL/HIGH/MEDIUM/LOW where useful',
              '4': 'same FrameworkStep shape for risk themes',
              '5': 'same FrameworkStep shape for regulatory obligations',
              '6': 'same FrameworkStep shape for knowledge/skills/judgment',
              '7': 'same FrameworkStep shape for training focus',
            },
            curriculum: [
              {
                module: 'string',
                quarter: 'Q1|Q2|Q3|Q4',
                objective: 'string',
                duration: 3,
                is_mandatory: true,
                content_type: 'E-learning|Workshop|Case Study|Simulation|Assessment',
                reason_assigned: 'string with article mapping',
                risk_alignment: ['string'],
                amlr_articles: [9, 12],
                competencies: {
                  knowledge: ['string'],
                  skills: ['string'],
                  judgment: ['string'],
                },
              },
            ],
            generation_mode: 'CLAUDE_RAG',
          },
          role,
          article_mapping_rule:
            'Do not attach AMLR article citations to a bare Job Title row. Use [] for Job Title unless the title text itself states a specific regulatory obligation. Put Article 11/13 mappings on function, responsibility, governance, competence, and training rows where supported by evidence.',
          role_rag_evidence: getRagText(roleContext),
          amlr_rag_evidence: getRagText(amlrContext),
          available_article_fallbacks: AMLR_ARTICLES,
        }),
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');

  if (!textBlock || !('text' in textBlock)) {
    throw new Error('Claude analysis response did not contain text JSON');
  }

  return {
    ...parseClaudeJson(textBlock.text),
    generation_mode: 'CLAUDE_RAG',
  };
}
