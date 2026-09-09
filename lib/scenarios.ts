// lib/scenarios.ts
// Mock MLRO decision scenarios. Single source of truth for both the
// Step 6 UI component and the /api/training/decision route, so verdicts
// and explainability data cannot drift between client display and audit log.

export type RiskBadge = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type DecisionKey = 'approve' | 'reject' | 'request_info' | 'escalate';

export type EvidenceItem = {
  id: string;
  label: string;
  summary: string;
  riskBadge: RiskBadge;
  whyItMatters: string;
};

export type DecisionOption = {
  key: DecisionKey;
  label: string;
  isRecommended: boolean;
};

export type CompetencyArea = 'Knowledge' | 'Skills' | 'Judgment';

export type ScenarioFeedback = {
  verdict: 'correct' | 'acceptable' | 'incorrect';
  explanation: string;
  recommendedAction: string;
  amlrArticles: number[];
  competencyTested: {
    area: CompetencyArea;
    detail: string;
  };
  consequenceIfWrong: string;
};

export type Scenario = {
  id: string;
  title: string;
  brief: string;
  evidence: EvidenceItem[];
  decisions: DecisionOption[];
  feedbackByDecision: Record<DecisionKey, ScenarioFeedback>;
};

export const MLRO_ONBOARDING_SCENARIO: Scenario = {
  id: 'mlro-onboarding-001',
  title: 'Suspicious Onboarding Review',
  brief:
    'A corporate customer (Northwind Holdings Ltd) has been escalated from KYC for MLRO review. ' +
    'The applicant is a holding company with layered ownership across two secrecy jurisdictions, ' +
    'a low-quality source-of-funds narrative, and recent inbound transactions inconsistent with ' +
    'stated business activity. KYC requested a final approve / reject / escalate decision from the MLRO.',
  evidence: [
    {
      id: 'ev-ubo',
      label: 'Incomplete Ultimate Beneficial Ownership documentation',
      summary:
        'UBO chain terminates at a nominee shareholder in BVI. No notarised declaration ' +
        'identifying the natural person(s) with >25% control has been provided.',
      riskBadge: 'CRITICAL',
      whyItMatters:
        'AMLR Article 9 requires identification and verification of the natural person(s) who ' +
        'ultimately own or control the customer. A nominee endpoint without a UBO declaration ' +
        'fails this obligation outright.',
    },
    {
      id: 'ev-jurisdiction',
      label: 'High-risk jurisdiction exposure',
      summary:
        'Two entities in the ownership chain are registered in jurisdictions appearing on the ' +
        'FATF increased-monitoring list. Operating bank accounts are held in a third high-risk country.',
      riskBadge: 'HIGH',
      whyItMatters:
        'AMLR Article 10 requires enhanced due diligence where geographic risk is elevated. ' +
        'Layered exposure across multiple high-risk jurisdictions is a recognised laundering typology.',
    },
    {
      id: 'ev-pep',
      label: 'Possible PEP match (confidence 78%)',
      summary:
        'Adverse-media screening returned a possible match against a foreign political figure ' +
        'with known corruption allegations. Match has not yet been confirmed or dismissed.',
      riskBadge: 'HIGH',
      whyItMatters:
        'AMLR Article 9 mandates enhanced due diligence for PEPs and their close associates. ' +
        'An unresolved 78% match must be either confirmed or properly dismissed with documented rationale.',
    },
    {
      id: 'ev-transactions',
      label: 'Unusual inbound transaction pattern',
      summary:
        'Six inbound wires totalling EUR 1.4M arrived in the 48 hours after account opening, ' +
        'each just below the EUR 250k internal review threshold. Stated business is dormant-stage advisory.',
      riskBadge: 'CRITICAL',
      whyItMatters:
        'Threshold-avoidance structuring is a classic placement-stage indicator. Activity ' +
        'inconsistent with stated business profile is a red flag under AMLR Article 9.',
    },
    {
      id: 'ev-sof',
      label: 'Weak source-of-funds evidence',
      summary:
        'SoF narrative cites "private investment proceeds" with no supporting bank statements, ' +
        'tax records, or contracts. No source-of-wealth documentation provided.',
      riskBadge: 'HIGH',
      whyItMatters:
        'AMLR Article 9 requires the institution to take reasonable measures to establish ' +
        'source of funds and source of wealth. Unverifiable narratives cannot satisfy this duty.',
    },
  ],
  decisions: [
    { key: 'approve', label: 'Approve onboarding', isRecommended: false },
    { key: 'reject', label: 'Reject onboarding', isRecommended: false },
    { key: 'request_info', label: 'Request more information', isRecommended: false },
    { key: 'escalate', label: 'Escalate / File internal SAR', isRecommended: true },
  ],
  feedbackByDecision: {
    approve: {
      verdict: 'incorrect',
      explanation:
        'Approving onboarding in the presence of an unresolved UBO chain, an unconfirmed PEP match, ' +
        'threshold-avoidance activity, and weak SoF would constitute a clear failure of customer ' +
        'due diligence. None of the AMLR Article 9 preconditions for establishing the business ' +
        'relationship have been satisfied.',
      recommendedAction:
        'Do not approve. Escalate and file an internal Suspicious Activity Report; suspend the ' +
        'relationship pending investigation.',
      amlrArticles: [9, 10, 11],
      competencyTested: {
        area: 'Judgment',
        detail:
          'Risk-based decision-making: recognising when accumulated red flags cross the threshold ' +
          'from "unusual" to "suspicious" and require escalation rather than acceptance.',
      },
      consequenceIfWrong:
        'Onboarding a suspicious entity exposes the institution to regulatory enforcement, ' +
        'personal criminal liability for the MLRO under national AML legislation, and reputational ' +
        'harm if the relationship is later identified as enabling laundering.',
    },
    reject: {
      verdict: 'acceptable',
      explanation:
        'Rejection prevents onboarding of a high-risk applicant, which is defensible. However, ' +
        'silently declining without filing an internal SAR misses the opportunity to feed the ' +
        'institution\'s typology library and may breach the duty to report suspicions of money ' +
        'laundering, not merely to avoid them.',
      recommendedAction:
        'Escalate and file an internal SAR in addition to declining the relationship. Document ' +
        'the rejection rationale and SAR linkage in the case file.',
      amlrArticles: [9, 11],
      competencyTested: {
        area: 'Judgment',
        detail:
          'Distinguishing between commercial rejection and the regulatory duty to report ' +
          'suspicions, which are independent obligations.',
      },
      consequenceIfWrong:
        'Failure to file when suspicion is held may itself be an offence under national ' +
        'legislation transposing AMLR, regardless of whether the customer was onboarded.',
    },
    request_info: {
      verdict: 'acceptable',
      explanation:
        'Requesting additional information (UBO declaration, SoF documentation, PEP-match resolution) ' +
        'is reasonable and proportionate where suspicion is not yet fully formed. However, the ' +
        'transaction-structuring pattern observed post-opening already constitutes a reportable ' +
        'suspicion under most national regimes, and tipping-off rules constrain what can be asked.',
      recommendedAction:
        'Combine: request the missing documentation through normal CDD channels AND escalate ' +
        'internally for SAR consideration in parallel. Do not disclose to the customer that a ' +
        'SAR is being considered (tipping-off prohibition).',
      amlrArticles: [9, 10, 11],
      competencyTested: {
        area: 'Skills',
        detail:
          'Managing the tipping-off prohibition while gathering further evidence: information ' +
          'requests must remain consistent with ordinary CDD and must not signal the existence ' +
          'of an internal investigation.',
      },
      consequenceIfWrong:
        'Continuing to engage the customer without escalation while suspicion is held delays the ' +
        'SAR and risks a tipping-off breach if the request is phrased poorly.',
    },
    escalate: {
      verdict: 'correct',
      explanation:
        'Escalating and filing an internal SAR is the correct action. The combination of an ' +
        'unresolved UBO chain, unverified PEP match, threshold-avoidance structuring, and weak ' +
        'SoF passes the "suspicion" threshold under AMLR Article 9 reporting obligations. The ' +
        'MLRO has both the authority and the duty to act.',
      recommendedAction:
        'File the internal SAR, freeze further onboarding actions, document the suspicion ' +
        'rationale with reference to each evidence indicator, and consider whether external ' +
        'reporting to the national FIU is required.',
      amlrArticles: [9, 10, 11],
      competencyTested: {
        area: 'Judgment',
        detail:
          'Recognising the suspicion threshold and acting decisively while preserving an audit ' +
          'trail that demonstrates the basis for the decision.',
      },
      consequenceIfWrong:
        'N/A — this is the recommended action. Failure to act in this way would expose the MLRO ' +
        'and the institution to enforcement and personal liability.',
    },
  },
};

export const SCENARIOS_BY_ID: Record<string, Scenario> = {
  [MLRO_ONBOARDING_SCENARIO.id]: MLRO_ONBOARDING_SCENARIO,
};
