// app/page.tsx - GOVERNANCE WITH INLINE EDITING
// Complete 5-step pipeline with expandable validation and INLINE EDITING

'use client';

import { useEffect, useRef, useState } from 'react';
import MLROScenarioSimulation from '@/components/MLROScenarioSimulation';
import TrainingMaterialGenerator from '@/components/TrainingMaterialGenerator';


type Module = {
  id: string;
  name: string;
  quarter: string;
  objective: string;
  duration: number;
  content_type?: string;
  is_mandatory: boolean;
  reason_assigned: string;
  amlr_articles: number[];
  risk_alignment: string[];
  competencies: {
    knowledge: string[];
    skills: string[];
    judgment: string[];
  };
};

type RoleData = {
  title: string;
  exposures: string[];
  responsibilities: string[];
};

type StepContentData = {
  title: string;
  summary: string;
  details: Array<{
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
  }>;
};

type StepState = {
  approved: boolean;
  rejected: boolean;
  data: StepContentData | null;
};

type StepKey = 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'step7';
type StepDataState = Record<StepKey, StepState>;

type RagArticleHit = {
  text: string;
  filename?: string;
  score?: number;
  document_id?: string;
  label?: string;
};

type ArticleEvidenceState = Record<
  string,
  {
    loading: boolean;
    error?: string;
    hits?: RagArticleHit[];
    expanded?: boolean;
  }
>;

type DocumentHighlight = {
  start: number;
  end: number;
  hitIndex: number;
  score?: number;
};

type DocumentViewerState = {
  article: number;
  filename: string;
  label?: string;
  text: string;
  highlights: DocumentHighlight[];
};

type TrainingPathMeta = {
  provider: string;
  model: string;
  generated_at?: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function renderHighlightedDocument(text: string, highlights: DocumentHighlight[]) {
  const segments: Array<{ text: string; highlight?: DocumentHighlight; firstHighlight?: boolean }> = [];
  let cursor = 0;
  let hasRenderedHighlight = false;

  for (const highlight of highlights) {
    if (highlight.start < cursor || highlight.start >= highlight.end) continue;

    if (highlight.start > cursor) {
      segments.push({ text: text.slice(cursor, highlight.start) });
    }

    segments.push({
      text: text.slice(highlight.start, highlight.end),
      highlight,
      firstHighlight: !hasRenderedHighlight,
    });
    hasRenderedHighlight = true;
    cursor = highlight.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}

// All 5 roles from the PDF
const AVAILABLE_ROLES = [
  {
    key: 'aml-ddi-manager',
    title: 'AML DDI Manager',
    band: 'H',
    description: 'Manages AML/KYC checks on delivery partners and suppliers',
    riskLevel: 'HIGH',
    icon: '👔',
  },
  {
    key: 'customer-advisor',
    title: 'Customer Advisor',
    band: 'F',
    description: 'First point of contact for customer onboarding and enquiries',
    riskLevel: 'MEDIUM-HIGH',
    icon: '📞',
  },
  {
    key: 'mlro',
    title: 'MLRO',
    band: '5',
    description: 'Money Laundering Reporting Officer - ultimate accountability',
    riskLevel: 'CRITICAL',
    icon: '⚖️',
  },
  {
    key: 'tm-analyst',
    title: 'Transaction Monitoring Analyst',
    band: 'G',
    description: 'Reviews and investigates transaction monitoring alerts',
    riskLevel: 'HIGH',
    icon: '🔍',
  },
  {
    key: 'kyc-analyst',
    title: 'KYC Analyst',
    band: 'G',
    description: 'Verifies customer identities and assesses ML/TF risks',
    riskLevel: 'CRITICAL',
    icon: '🛡️',
  },
];

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedRoleKey, setSelectedRoleKey] = useState('');
  
  const [roleId, setRoleId] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [analysisId, setAnalysisId] = useState('');
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [trainingPathLoading, setTrainingPathLoading] = useState(false);
  const [trainingPathMeta, setTrainingPathMeta] = useState<TrainingPathMeta | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState('All');
  
  // Enhanced Step 3 state
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [editingStep, setEditingStep] = useState<number | null>(null);
    const [stepData, setStepData] = useState<StepDataState>({
    step1: { approved: false, rejected: false, data: null },
    step2: { approved: false, rejected: false, data: null },
    step3: { approved: false, rejected: false, data: null },
    step4: { approved: false, rejected: false, data: null },
    step5: { approved: false, rejected: false, data: null },
    step6: { approved: false, rejected: false, data: null },
    step7: { approved: false, rejected: false, data: null },
  });
  
  const [roleData, setRoleData] = useState<RoleData | null>(null);


  const [generatedSteps, setGeneratedSteps] = useState<Record<string, StepContentData>>({});
  
  // Inline editing state
  const [editableData, setEditableData] = useState<StepContentData | null>(null);
  const [articleEvidence, setArticleEvidence] = useState<ArticleEvidenceState>({});
  const [documentViewer, setDocumentViewer] = useState<DocumentViewerState | null>(null);
  const documentScrollRef = useRef<HTMLDivElement | null>(null);
  const firstHighlightRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!documentViewer) return;

    const timer = window.setTimeout(() => {
      const container = documentScrollRef.current;
      const firstHighlight = firstHighlightRef.current;

      if (!container || !firstHighlight) return;

      const targetTop =
        firstHighlight.offsetTop - container.clientHeight / 2 + firstHighlight.offsetHeight / 2;

      container.scrollTo({
        top: Math.max(0, targetTop),
        behavior: 'smooth',
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [documentViewer]);
  // Step 5: training material approval (manager owns the approved set)
  const [approvedMaterialIds, setApprovedMaterialIds] = useState<Set<string>>(new Set());

  // Step 6: training activity + scenario simulation
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [modulesCompleted, setModulesCompleted] = useState(0);
  const [lastDecisionLabel, setLastDecisionLabel] = useState<string>('');
  const [lastJustification, setLastJustification] = useState<string>('');
  const [lastAuditTimestamp, setLastAuditTimestamp] = useState<string>('');

  // Step 1: Import Role
  const handleImportRole = async (roleKey: string) => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/roles/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_key: roleKey }),
      });
      
      if (!res.ok) throw new Error('Import failed');
      
      const data = await res.json();
      setRoleId(data.role_id);
      setRoleTitle(data.role_title);
      setSelectedRoleKey(roleKey);

      setCurrentStep(2);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Run Analysis
  const handleRunAnalysis = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/analysis/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: roleId }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysisId(data.analysis_id);

      // Fetch modules and analysis data
      const modulesRes = await fetch(`/api/analysis/${data.analysis_id}`);
      const modulesData = await modulesRes.json();
      setModules(modulesData.modules || []);

            // Get actual role data from the selected role
      const selectedRole = AVAILABLE_ROLES.find(r => r.key === selectedRoleKey);

      // Initialize role data with actual exposures from role definitions
      const roleExposures = selectedRoleKey === 'kyc-analyst' ? [
        'CRITICAL high_risk_customers: Handles the bank\'s highest-risk customers directly',
        'HIGH judgement_risk: Relies on professional judgement, not just checklists',
        'CRITICAL detection_risk: Weak analysis allows illegitimate customers to go undetected',
        'HIGH escalation_risk: Failure to escalate leads directly to regulatory breaches',
      ] : selectedRoleKey === 'mlro' ? [
        'CRITICAL personal_liability_risk: Ultimate accountability for SAR decisions carries criminal liability',
        'CRITICAL systemic_risk: Oversees entire financial crime framework - blind spots cascade across all defences',
        'HIGH strategic_risk: Responsible for Board reporting - inaccurate MI leads to flawed risk decisions',
        'CRITICAL reputational_risk: External-facing to regulators - enforcement risk is highest at this level',
      ] : selectedRoleKey === 'customer-advisor' ? [
        'HIGH onboarding_risk: First contact during onboarding - weak ID verification lets illegitimate customers enter',
        'MEDIUM volume_risk: High volume interactions with limited AML depth increases missing red flags',
        'HIGH escalation_risk: Failure to recognise or report unusual behaviour breaks chain of defence',
        'MEDIUM vulnerability_risk: Proximity to vulnerable customers creates exploitation exposure',
      ] : selectedRoleKey === 'tm-analyst' ? [
        'CRITICAL detection_risk: Operates where financial crime becomes visible - missed alerts enable layering',
        'HIGH fatigue_risk: High alert volumes increase risk of fatigue-driven errors and incorrect discounting',
        'HIGH documentation_risk: Inadequate investigation notes weaken audit trail and SAR quality',
        'CRITICAL timing_risk: Delays in escalation can breach regulatory reporting timeframes',
      ] : [
        'HIGH third_party_risk: Manages AML/KYC checks on delivery partners - third-party risk is ML vulnerability',
        'HIGH oversight_risk: Failures in periodic reviews can allow lapsed partners to remain active',
        'MEDIUM gdpr_risk: GDPR mismanagement creates dual regulatory exposure alongside AML',
        'HIGH propagation_risk: Coaching responsibilities mean errors can propagate across analyst team',
      ];

      setRoleData({
        title: selectedRole?.title || roleTitle,
        exposures: roleExposures,
        responsibilities: [
          'Review and validate customer ownership structures and beneficial ownership chains',
          'Conduct enhanced due diligence on high-risk customers and complex entities',
          'Perform periodic reviews of customer profiles to detect changes in risk status',
          'Document findings comprehensively and escalate suspicious activity promptly',
          'Assess source of wealth and source of funds with appropriate skepticism',
          'Screen entities against sanctions lists, PEP databases, and adverse media',
          'Maintain accurate case management records throughout investigation lifecycle',
          'Support regulatory audits and examinations with complete documentation',
        ],
      });

      const generatedOutput = modulesData.viddagpt_output || {};
      setGeneratedSteps(generatedOutput.framework_steps || data.framework_steps || {});
      setTrainingPathMeta(generatedOutput.training_path_generation
        ? {
            provider: 'openrouter',
            model: generatedOutput.training_path_generation.model || '',
            generated_at: generatedOutput.training_path_generation.generated_at,
          }
        : null);

      setCurrentStep(3);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Governance handlers
  const handleApproveStep = (stepNum: number) => {
    setStepData({
      ...stepData,
      [`step${stepNum}`]: { 
        approved: true, 
        rejected: false,
        data: stepData[`step${stepNum}` as StepKey].data 
      },
    });
    setExpandedStep(null);
    setEditingStep(null);
  };

  const handleRejectStep = (stepNum: number) => {
    setStepData({
      ...stepData,
      [`step${stepNum}`]: { approved: false, rejected: true, data: null },
    });
    setEditingStep(null);
  };

  const handleModifyStep = (stepNum: number) => {
    // Enter edit mode - copy current data to editable state
    const currentContent = getStepContent(stepNum);
    if (!currentContent) return;
    setEditableData(JSON.parse(JSON.stringify(currentContent)) as StepContentData); // Deep copy
    setEditingStep(stepNum);
  };

  const handleSaveModification = (stepNum: number) => {
    // Save the edited data WITHOUT auto-approving
    setStepData({
      ...stepData,
      [`step${stepNum}`]: { 
        approved: false,  // Keep as NOT approved
        rejected: false, 
        data: editableData 
      },
    });
    setEditingStep(null);
    setEditableData(null);
    // Stay expanded so manager can review the changes
    // expandedStep remains the same - don't collapse
  };

  const handleCancelEdit = () => {
    setEditingStep(null);
    setEditableData(null);
  };

  const toggleStepExpansion = (stepNum: number) => {
    if (editingStep === stepNum) return; // Don't collapse while editing
    setExpandedStep(expandedStep === stepNum ? null : stepNum);
  };

  const allStepsApproved = Object.values(stepData).every((step) => step.approved === true);
  const hasRejections = Object.values(stepData).some((step) => step.rejected === true);

  // Update editable field
  const updateEditableField = (detailIndex: number, newValue: string) => {
    if (!editableData) return;
    const updated = { ...editableData };
    updated.details[detailIndex].value = newValue;
    setEditableData(updated);
  };

  const updateEditableBadge = (detailIndex: number, newBadge: string) => {
    if (!editableData) return;
    const updated = { ...editableData };
    updated.details[detailIndex].badge = newBadge;
    setEditableData(updated);
  };

  const getArticleEvidenceKey = (stepNum: number, detailIndex: number, article: number) =>
    `${stepNum}-${detailIndex}-${article}`;

  const handleArticleClick = async (
    stepNum: number,
    detailIndex: number,
    detail: StepContentData['details'][number],
    article: number
  ) => {
    const key = getArticleEvidenceKey(stepNum, detailIndex, article);

    setArticleEvidence((current) => ({
      ...current,
      [key]: { loading: true },
    }));

    try {
      const params = new URLSearchParams({
        article: String(article),
        context: `${detail.label}: ${detail.value}`,
      });
      const res = await fetch(`/api/rag/article?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Article evidence search failed');

      setArticleEvidence((current) => ({
        ...current,
        [key]: { loading: false, hits: data.hits || [], expanded: false },
      }));

      if (data.document) {
        setDocumentViewer({
          article,
          filename: data.document.filename,
          label: data.document.label,
          text: data.document.text,
          highlights: data.document.highlights || [],
        });
      }

      window.setTimeout(() => {
        document.getElementById('rag-document-viewer')?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, 50);
    } catch (error: unknown) {
      setArticleEvidence((current) => ({
        ...current,
        [key]: { loading: false, error: getErrorMessage(error), expanded: false },
      }));
    }
  };

  const toggleArticleEvidence = (key: string) => {
    setArticleEvidence((current) => ({
      ...current,
      [key]: {
        ...current[key],
        expanded: !current[key]?.expanded,
      },
    }));
  };

  // Get step content for display (use modified data if available)
  const getStepContent = (stepNum: number): StepContentData | null => {
    // Check if this step has modified data
    const savedData = stepData[`step${stepNum}` as StepKey].data;
    if (savedData) return savedData;

    // Prefer AI-generated content from RAG-backed analysis (includes AMLR article refs)
    const aiGenerated = generatedSteps[String(stepNum)];
    if (aiGenerated) return aiGenerated;

    if (!roleData) return null;

    // Fallback: hardcoded defaults when AI analysis is unavailable
    switch (stepNum) {
      case 1:
        return {
          title: 'Role Function Analysis',
          summary: `ViddaGPT analyzed the ${roleData.title} position`,
          details: [
            { label: 'Job Title', value: roleData.title },
            { label: 'Primary Function', value: 'Financial crime prevention and compliance oversight' },
            { label: 'Department', value: 'Risk & Compliance / AML Due Diligence' },
          ],
        };

      case 2:
        return {
          title: 'Main Responsibilities Identified',
          summary: `${roleData.responsibilities.length} core responsibilities mapped`,
          details: roleData.responsibilities.map((r, i) => ({
            label: `Responsibility ${i + 1}`,
            value: r,
          })),
        };

      case 3:
        return {
          title: 'Inherent AML Risk Assessment',
          summary: `${roleData.exposures.length} risk exposures identified`,
          details: roleData.exposures.map((exp) => {
            const colonIndex = exp.indexOf(':');
            const beforeColon = exp.substring(0, colonIndex).trim();
            const afterColon = exp.substring(colonIndex + 1).trim();
            const parts = beforeColon.split(' ');
            const level = parts[0];
            const riskName = parts.slice(1).join(' ');

            return {
              label: `Risk: ${riskName}`,
              value: afterColon,
              badge: level,
            };
          }),
        };

      case 4:
        return {
          title: 'Risk Themes Extraction',
          summary: 'Thematic analysis of risk dimensions',
          details: [
            { label: 'Primary Theme', value: 'Customer Due Diligence & Identity Verification' },
            { label: 'Secondary Theme', value: 'Transaction Monitoring & Pattern Detection' },
            { label: 'Tertiary Theme', value: 'Regulatory Reporting & Compliance Documentation' },
          ],
        };

      case 5:
        return {
          title: 'Regulatory Obligations Mapped',
          summary: 'AMLR 2024/1624 Articles 9-15 analysis',
          details: [
            { label: 'Article 9', value: 'Internal policies, procedures, and controls for AML/CFT' },
            { label: 'Article 10', value: 'Business-wide risk assessment requirements' },
            { label: 'Article 11', value: 'Compliance functions and responsibilities' },
            { label: 'Article 12', value: 'Training and awareness requirements' },
            { label: 'Article 13', value: 'Employee integrity and skills assessment' },
          ],
        };

      case 6:
        return {
          title: 'Competencies Framework (Knowledge/Skills/Judgment)',
          summary: 'K/S/J model applied to role requirements',
          details: [
            { label: 'Knowledge Areas', value: 'AML legislation, typologies, red flags, regulatory procedures, documentation standards' },
            { label: 'Skills Required', value: 'Analysis, investigation, documentation, communication, escalation, data interpretation' },
            { label: 'Judgment Capabilities', value: 'Risk assessment, escalation decisions, proportionality, pattern recognition' },
          ],
        };

      case 7:
        return {
          title: 'Training Focus & Curriculum Structure',
          summary: `${modules.length} modules generated across Q1-Q4`,
          details: [
            { label: 'Q1 Foundation', value: `${modules.filter(m => m.quarter === 'Q1').length} modules - Core concepts and procedures` },
            { label: 'Q2 Application', value: `${modules.filter(m => m.quarter === 'Q2').length} modules - Practical application and case studies` },
            { label: 'Q3 Deepening', value: `${modules.filter(m => m.quarter === 'Q3').length} modules - Advanced topics and edge cases` },
            { label: 'Q4 Embedding', value: `${modules.filter(m => m.quarter === 'Q4').length} modules - Mastery assessment and continuous improvement` },
          ],
        };

      default:
        return generatedSteps[String(stepNum)] || null;
    }
  };

  const handleGenerateTrainingPath = async () => {
    setTrainingPathLoading(true);
    setError('');

    try {
      if (!analysisId) throw new Error('Analysis ID is missing. Run analysis again.');

      const approvedSteps = [1, 2, 3, 4, 5, 6, 7].reduce<Record<string, StepContentData>>((acc, stepNum) => {
        const content = getStepContent(stepNum);
        if (!content) {
          throw new Error(`Step ${stepNum} has no approved content`);
        }

        acc[String(stepNum)] = content;
        return acc;
      }, {});

      const res = await fetch('/api/training-path/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: analysisId,
          role_id: roleId,
          approved_steps: approvedSteps,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Training path generation failed');

      setModules(data.modules || []);
      setTrainingPathMeta({
        provider: data.provider || 'openrouter',
        model: data.model || 'OpenRouter',
        generated_at: data.generated_at,
      });
      setSelectedQuarter('All');
      setSelectedModule(null);
      setCurrentStep(4);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setTrainingPathLoading(false);
    }
  };

  // Risk level colors
  const getRiskColor = (level: string) => {
    if (level === 'CRITICAL') return 'bg-red-100 text-red-800 border-red-300';
    if (level === 'HIGH') return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  };

  const getStepLabels = () => [
    { num: 1, title: 'Role Function', checkpoint: 'A' },
    { num: 2, title: 'Main Responsibilities', checkpoint: 'A' },
    { num: 3, title: 'Inherent AML Risk', checkpoint: 'A' },
    { num: 4, title: 'Risk Themes', checkpoint: 'B' },
    { num: 5, title: 'Regulatory Obligations', checkpoint: 'B' },
    { num: 6, title: 'Competencies (K/S/J)', checkpoint: 'B' },
    { num: 7, title: 'Training Focus', checkpoint: 'C' },
  ];

  const displayedModules =
    selectedQuarter === 'All' ? modules : modules.filter((module) => module.quarter === selectedQuarter);

  const toggleModuleDetails = (module: Module) => {
    setSelectedModule((current) => (current?.id === module.id ? null : module));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Vidda Solutions
          </h1>
          <p className="text-lg text-gray-600">
            AI-Powered Compliance Training Generator
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep >= step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step}
                </div>
                {step < 7 && (
                  <div
                    className={`w-16 h-1 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Select Role</span>
            <span>Analyze</span>
            <span>Validate</span>
            <span>Modules</span>
            <span>Material</span>
            <span>LMS</span>
            <span>Monitor</span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Step 1: Import Role */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Step 1: Select Compliance Role</h2>
            <p className="text-gray-600 mb-6">
              Choose a role to generate personalized training curriculum
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {AVAILABLE_ROLES.map((role) => (
                <div
                  key={role.key}
                  onClick={() => !loading && handleImportRole(role.key)}
                  className={`border-2 rounded-lg p-6 cursor-pointer transition hover:border-blue-400 hover:shadow-md ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="text-4xl mb-3">{role.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {role.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {role.description}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`px-2 py-1 rounded ${getRiskColor(role.riskLevel)}`}>
                      {role.riskLevel}
                    </span>
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                      Band {role.band}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Run Analysis */}
        {currentStep === 2 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Step 2: ViddaGPT Analysis</h2>
            <p className="text-gray-600 mb-6">
              Generate AI-powered compliance training curriculum
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <p className="font-semibold text-gray-900">Role Selected:</p>
              <p className="text-lg text-blue-900">{roleTitle}</p>
              <p className="text-sm text-gray-600 mt-2">ID: {roleId}</p>
            </div>

            <button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing... (This takes 2 seconds)
                </span>
              ) : (
                '🚀 Run ViddaGPT Analysis'
              )}
            </button>

            {loading && (
              <div className="mt-4 text-sm text-gray-600 text-center">
                <p>ViddaGPT is retrieving role and AMLR evidence from RAG...</p>
                <p className="mt-2">Generating step analysis, article mappings, and training modules...</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Framework Validation with INLINE EDITING */}
        {currentStep === 3 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Step 3: 7-Step Framework Validation</h2>
            <p className="text-gray-600 mb-6">
              Review each step. Click to expand, then edit fields directly or approve as-is.
            </p>

            <div className="space-y-3 mb-6">
              {getStepLabels().map((step) => {
                const stepInfo = getStepContent(step.num);
                const isExpanded = expandedStep === step.num;
                const isEditing = editingStep === step.num;
                const stepState = stepData[`step${step.num}` as StepKey];
                const displayData = isEditing ? editableData : stepInfo;
                
                return (
                  <div
                    key={step.num}
                    className={`border-2 rounded-lg transition ${
                      stepState.approved
                        ? 'border-green-400 bg-green-50'
                        : stepState.rejected
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {/* Step Header */}
                    <div
                      onClick={() => !isEditing && toggleStepExpansion(step.num)}
                      className={`flex items-center justify-between p-4 ${!isEditing ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex items-center flex-1">
                        <div className="mr-3 text-2xl">
                          {stepState.approved && '✅'}
                          {stepState.rejected && '❌'}
                          {!stepState.approved && !stepState.rejected && '⏸️'}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              Step {step.num}: {step.title}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              Checkpoint {step.checkpoint}
                            </span>
                            {stepState.data && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                MODIFIED
                              </span>
                            )}
                          </div>
                          {stepInfo && (
                            <p className="text-sm text-gray-600 mt-1">{stepInfo.summary}</p>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="ml-3">
                            <svg
                              className={`w-5 h-5 text-gray-500 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details with INLINE EDITING */}
                    {(isExpanded || isEditing) && displayData && (
                      <div className={`border-t px-4 py-4 ${isEditing ? 'bg-blue-50' : 'bg-gray-50'}`}>
                        <h4 className="font-semibold text-gray-900 mb-3">
                          {displayData.title}
                          {isEditing && (
                            <span className="ml-2 text-sm text-blue-700 font-normal">
                              (Editing Mode - Modify fields below)
                            </span>
                          )}
                        </h4>
                        
                        <div className="space-y-3 mb-4">
                          {displayData.details.map((detail, idx) => (
                            <div key={idx} className={`rounded p-3 ${isEditing ? 'bg-white border-2 border-blue-300' : 'bg-white border'}`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-gray-700 mb-2">
                                    {detail.label}
                                  </p>
                                  
                                  {/* INLINE EDITING: Show input when editing, text when not */}
                                  {isEditing ? (
                                    <div>
                                      <textarea
                                        value={detail.value}
                                        onChange={(e) => updateEditableField(idx, e.target.value)}
                                        className="w-full border border-blue-300 rounded px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        rows={3}
                                      />
                                      
                                      {/* Risk level dropdown for Step 3 */}
                                      {detail.badge && (
                                        <select
                                          value={detail.badge}
                                          onChange={(e) => updateEditableBadge(idx, e.target.value)}
                                          className="mt-2 border border-blue-300 rounded px-3 py-1 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500"
                                        >
                                          <option value="CRITICAL">CRITICAL</option>
                                          <option value="HIGH">HIGH</option>
                                          <option value="MEDIUM">MEDIUM</option>
                                          <option value="LOW">LOW</option>
                                        </select>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <p className="text-sm text-gray-900">{detail.value}</p>
                                      {detail.articles && detail.articles.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {detail.articles.map((article: number, articleIdx: number) => (
                                            <button
                                              type="button"
                                              key={`${article}-${articleIdx}`}
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                handleArticleClick(step.num, idx, detail, article);
                                              }}
                                              className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                              AMLR Article {article}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                      {(detail.article_excerpts || []).length > 0 ? (
                                        <div className="space-y-2">
                                          {detail.article_excerpts?.map((excerpt: { article: number; text: string }, excerptIdx: number) => (
                                            <p
                                              key={`${excerpt.article}-${excerptIdx}`}
                                              className="border-l-4 border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-gray-800"
                                            >
                                              Article {excerpt.article}: {excerpt.text}
                                            </p>
                                          ))}
                                        </div>
                                      ) : detail.article_excerpt && (
                                        <p className="border-l-4 border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-gray-800">
                                          {detail.article_excerpt}
                                        </p>
                                      )}
                                      {detail.articles?.map((article: number) => {
                                        const key = getArticleEvidenceKey(step.num, idx, article);
                                        const evidence = articleEvidence[key];

                                        if (!evidence) return null;

                                        return (
                                          <div
                                            key={key}
                                            id={`article-evidence-${key}`}
                                            className="rounded border border-blue-200 bg-blue-50 p-3"
                                          >
                                            <div className="flex items-start justify-between gap-3">
                                              <div>
                                                <p className="text-xs font-semibold text-blue-900">
                                                  RAG evidence for AMLR Article {article}
                                                </p>
                                                {evidence.hits && evidence.hits.length > 0 && (
                                                  <p className="mt-1 text-xs text-blue-700">
                                                    {evidence.hits.length} matches from {evidence.hits[0].filename || 'RAG document'}
                                                  </p>
                                                )}
                                              </div>
                                              {evidence.hits && evidence.hits.length > 0 && (
                                                <button
                                                  type="button"
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    toggleArticleEvidence(key);
                                                  }}
                                                  className="shrink-0 rounded bg-white px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                                >
                                                  {evidence.expanded ? 'Hide evidence' : 'Show evidence'}
                                                </button>
                                              )}
                                            </div>
                                            {evidence.loading && (
                                              <p className="mt-2 text-xs text-blue-700">Searching RAG...</p>
                                            )}
                                            {evidence.error && (
                                              <p className="mt-2 text-xs text-red-700">{evidence.error}</p>
                                            )}
                                            {evidence.hits && evidence.hits.length === 0 && (
                                              <p className="mt-2 text-xs text-gray-600">No matching RAG sentence found.</p>
                                            )}
                                            {evidence.hits && evidence.hits.length > 0 && evidence.expanded && (
                                              <div className="mt-2 space-y-2">
                                                {evidence.hits.map((hit, hitIndex) => (
                                                  <div key={`${hit.document_id || hit.filename || 'hit'}-${hitIndex}`}>
                                                    <p className="text-xs text-gray-900">{hit.text}</p>
                                                    <p className="mt-1 text-[11px] text-gray-500">
                                                      {hit.filename || 'RAG document'}
                                                      {typeof hit.score === 'number' && ` - score ${hit.score.toFixed(3)}`}
                                                    </p>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                      {detail.evidence && (
                                        <p className="text-xs text-gray-500">
                                          Evidence: {detail.evidence}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Risk badge (display only when not editing) */}
                                {!isEditing && detail.badge && (
                                  <span
                                    className={`ml-2 px-2 py-1 text-xs font-semibold rounded ${
                                      detail.badge === 'HIGH' || detail.badge === 'CRITICAL'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                  >
                                    {detail.badge}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          {!isEditing && !stepState.approved && !stepState.rejected && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApproveStep(step.num);
                                }}
                                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700"
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleModifyStep(step.num);
                                }}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
                              >
                                ✎ Modify
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRejectStep(step.num);
                                }}
                                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
                              >
                                ✗ Reject
                              </button>
                            </>
                          )}
                          
                          {/* Show helpful message after saving modifications */}
                          {!isEditing && !stepState.approved && !stepState.rejected && stepState.data && (
                            <div className="mt-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                              💾 Changes saved. Review above, then Approve, Modify again, or Reject.
                            </div>
                          )}
                          
                          {isEditing && (
                            <>
                              <button
                                onClick={() => handleSaveModification(step.num)}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
                              >
                                💾 Save Changes
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700"
                              >
                                ✗ Cancel
                              </button>
                            </>
                          )}
                          
                          {!isEditing && stepState.approved && (
                            <div className="flex-1 text-center text-green-700 font-semibold py-2">
                              ✓ Approved - Click to review again
                            </div>
                          )}
                          
                          {!isEditing && stepState.rejected && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setStepData({
                                  ...stepData,
                                  [`step${step.num}`]: { approved: false, rejected: false, data: null },
                                });
                              }}
                              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700"
                            >
                              ↺ Reset
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Status Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-900 font-semibold">
                    ✓ Generated {modules.length} training modules
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    {Object.values(stepData).filter((s) => s.approved).length} of 7 steps approved
                    {hasRejections && (
                      <span className="ml-2 text-red-700">
                        • {Object.values(stepData).filter((s) => s.rejected).length} rejected
                      </span>
                    )}
                    {Object.values(stepData).filter((s) => s.data !== null).length > 0 && (
                      <span className="ml-2 text-blue-700">
                        • {Object.values(stepData).filter((s) => s.data !== null).length} modified
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            {allStepsApproved && !editingStep && (
              <button
                onClick={handleGenerateTrainingPath}
                disabled={trainingPathLoading}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {trainingPathLoading ? 'Generating OpenRouter training path...' : 'Next: View Training Path →'}
              </button>
            )}
            
            {!allStepsApproved && !hasRejections && !editingStep && (
              <div className="text-center text-gray-500 text-sm">
                Please review and approve all 7 steps to continue
              </div>
            )}
            
            {editingStep && (
              <div className="text-center text-blue-600 text-sm font-semibold">
                Currently editing Step {editingStep} - Save or Cancel to continue
              </div>
            )}
            
            {hasRejections && !editingStep && (
              <div className="text-center">
                <p className="text-red-700 font-semibold mb-3">
                  ⚠️ Some steps were rejected. Please resolve before continuing.
                </p>
                <button
                  onClick={() => {
                    const resetData = { ...stepData };
                    Object.keys(resetData).forEach((key) => {
                      if (resetData[key as keyof typeof resetData].rejected) {
                        resetData[key as keyof typeof resetData] = { approved: false, rejected: false, data: null };
                      }
                    });
                    setStepData(resetData);
                  }}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700"
                >
                  Reset All Rejections
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Training Path & Modules */}
        {currentStep === 4 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Step 4: Training Path</h2>
            <p className="text-gray-600 mb-6">
              Review generated modules and see why each was assigned
            </p>

            {trainingPathMeta && (
              <div className="mb-6 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <span className="font-semibold">OpenRouter training path</span>
                <span className="ml-2 text-blue-700">
                  {trainingPathMeta.model}
                  {trainingPathMeta.generated_at && ` - ${new Date(trainingPathMeta.generated_at).toLocaleString()}`}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-5">
              {['All', 'Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => {
                const count =
                  quarter === 'All' ? modules.length : modules.filter((module) => module.quarter === quarter).length;

                return (
                <button
                  key={quarter}
                  type="button"
                  onClick={() => {
                    setSelectedQuarter(quarter);
                    setSelectedModule(null);
                  }}
                  className={`rounded-lg p-4 text-left transition ${
                    selectedQuarter === quarter
                      ? 'border border-blue-400 bg-blue-50'
                      : 'border border-transparent bg-gray-50 hover:border-blue-200'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 mb-2">{quarter}</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {count}
                  </p>
                  <p className="text-sm text-gray-600">modules</p>
                </button>
                );
              })}
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
              {displayedModules.map((module) => (
                <div
                  key={module.id}
                  onClick={() => toggleModuleDetails(module)}
                  className={`border rounded-lg p-4 cursor-pointer transition ${
                    selectedModule?.id === module.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                          {module.quarter}
                        </span>
                        {module.is_mandatory && (
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">
                            MANDATORY
                          </span>
                        )}
                        {!module.is_mandatory && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                            OPTIONAL
                          </span>
                        )}
                        {module.content_type && (
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">
                            {module.content_type}
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900">{module.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{module.objective}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>⏱ {module.duration}h</span>
                        <span>📚 AMLR Articles: {module.amlr_articles.join(', ')}</span>
                        {module.risk_alignment.length > 0 && (
                          <span>Risk: {module.risk_alignment.slice(0, 2).join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleModuleDetails(module);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                    >
                      {selectedModule?.id === module.id ? 'Hide Details' : 'View Details →'}
                    </button>
                  </div>
                  {selectedModule?.id === module.id && (
                    <div className="mt-4 border-t border-blue-200 pt-4">
                      <div className="mb-4 rounded bg-white p-4">
                        <p className="mb-2 text-xs font-semibold uppercase text-blue-700">
                          Assignment and {module.is_mandatory ? 'Mandatory' : 'Optional'} Rationale
                        </p>
                        <p className="text-sm text-gray-900">{module.reason_assigned}</p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded bg-white p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Knowledge</h4>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {module.competencies.knowledge.map((k, i) => (
                              <li key={i}>- {k}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded bg-white p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Skills</h4>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {module.competencies.skills.map((s, i) => (
                              <li key={i}>- {s}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded bg-white p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Judgment</h4>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {module.competencies.judgment.map((j, i) => (
                              <li key={i}>- {j}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {displayedModules.length === 0 && (
                <div className="rounded border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                  No modules in {selectedQuarter}.
                </div>
              )}
            </div>
             {/* Explainability Panel */}
            {selectedModule && (
              <div className="border-t pt-6">
                <h3 className="text-xl font-semibold mb-4">
                  📌 Why This Module Was Assigned
                </h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-4">
                  <p className="text-gray-900">{selectedModule.reason_assigned}</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">📚 Knowledge</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {selectedModule.competencies.knowledge.map((k, i) => (
                        <li key={i}>• {k}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">🛠 Skills</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {selectedModule.competencies.skills.map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">⚖️ Judgment</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {selectedModule.competencies.judgment.map((j, i) => (
                        <li key={i}>• {j}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setCurrentStep(5)}
              className="w-full mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
            >
              Next: Generate Material →
            </button>
          </div>
        )}
        {/* Step 5: Generate Training Material */}
         {currentStep === 5 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Step 5: Generate Training Material</h2>
            <p className="text-gray-600 mb-6">
              Pick one module from the training path and generate role-specific study material
              for review. Approve the material before assigning it in Step 6.
            </p>

            <TrainingMaterialGenerator
              roleTitle={roleTitle}
              modules={modules}
              approvedModuleIds={approvedMaterialIds}
              onApprove={(id) =>
                setApprovedMaterialIds((prev) => {
                  const next = new Set(prev);
                  next.add(id);
                  return next;
                })
              }
              onUnapprove={(id) =>
                setApprovedMaterialIds((prev) => {
                  const next = new Set(prev);
                  next.delete(id);
                  return next;
                })
              }
            />

            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => setCurrentStep(6)}
                disabled={approvedMaterialIds.size === 0}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Assign to LMS →
              </button>
              {approvedMaterialIds.size === 0 && (
                <span className="text-sm text-amber-700">
                  Approve at least one module&apos;s material before continuing.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Step 6: LMS Assignment */}
        {currentStep === 6 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Step 6: LMS Assignment</h2>
            <p className="text-gray-600 mb-6">
              Assign training curriculum to employees
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4">
                ✓ Training Path Ready for {roleTitle}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Modules:</p>
                  <p className="text-2xl font-bold text-green-900">{modules.length}</p>
                </div>
                <div>
                  <p className="text-gray-600">Mandatory:</p>
                  <p className="text-2xl font-bold text-green-900">
                    {modules.filter((m) => m.is_mandatory).length}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Total Hours:</p>
                  <p className="text-2xl font-bold text-green-900">
                    {modules.reduce((sum, m) => sum + Number(m.duration), 0).toFixed(1)}h
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">AMLR Articles:</p>
                  <p className="text-2xl font-bold text-green-900">9-15</p>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-4">Assign to Employee</h3>
              <input
                type="email"
                placeholder="employee@bank.com"
                value={employeeEmail}
                onChange={(e) => setEmployeeEmail(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 mb-4 text-gray-900"
              />
              <button onClick={() => setCurrentStep(7)}
                disabled={!/^\S+@\S+\.\S+$/.test(employeeEmail)} className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                Assign Training Path
              </button>
            </div>

            <div className="mt-8 border-t pt-6">
              <h3 className="text-xl font-semibold mb-4">🔍 Complete Audit Trail</h3>
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs space-y-2 max-h-48 overflow-y-auto" suppressHydrationWarning>
                <div className="text-green-700" suppressHydrationWarning>✓ role_imported | system | 2024-05-17T09:15:00.000Z</div>
                <div className="text-green-700" suppressHydrationWarning>✓ analysis_started | system | 2024-05-17T09:20:00.000Z</div>
                <div className="text-green-700" suppressHydrationWarning>✓ analysis_completed | system | 2024-05-17T09:20:18.000Z</div>
                <div className="text-green-700" suppressHydrationWarning>✓ step1_approved | user | 2024-05-17T09:35:00.000Z</div>
                <div className="text-green-700" suppressHydrationWarning>✓ step2_approved | user | 2024-05-17T09:36:00.000Z</div>
                <div className="text-blue-700" suppressHydrationWarning>✓ step3_modified | user | 2024-05-17T09:37:00.000Z</div>
                <div className="text-green-700" suppressHydrationWarning>✓ step3_approved | user | 2024-05-17T09:37:30.000Z</div>
                <div className="text-green-700" suppressHydrationWarning>✓ step4_approved | user | 2024-05-17T09:38:00.000Z</div>
                <div className="text-blue-700" suppressHydrationWarning>✓ step5_modified | user | 2024-05-17T09:39:00.000Z</div>
                <div className="text-green-700" suppressHydrationWarning>✓ step5_approved | user | 2024-05-17T09:39:30.000Z</div>
                <div className="text-green-700" suppressHydrationWarning>✓ step6_approved | user | 2024-05-17T09:40:00.000Z</div>
                <div className="text-green-700" suppressHydrationWarning>✓ step7_approved | user | 2024-05-17T09:41:00.000Z</div>
              </div>
              <p className="text-sm text-gray-600 mt-4 text-center">
                <strong>Every decision transparent. Every change logged. This is governance.</strong>
              </p>
            </div>
          </div>
        )}

        {/* Step 7: Monitor Training Activity */}
        {currentStep === 7 && (() => {
          const totalModules = modules.length;
          const progressPercent =
            totalModules > 0 ? Math.round((modulesCompleted / totalModules) * 100) : 0;
          const trainingStatus =
            modulesCompleted === 0
              ? 'Not started'
              : modulesCompleted >= totalModules && totalModules > 0
                ? 'Completed'
                : 'In progress';
          const statusBadgeClass =
            trainingStatus === 'Not started'
              ? 'bg-gray-100 text-gray-700 border-gray-300'
              : trainingStatus === 'Completed'
                ? 'bg-green-100 text-green-800 border-green-300'
                : 'bg-blue-100 text-blue-800 border-blue-300';
          const auditStatus = lastAuditTimestamp
            ? `scenario_decision logged at ${new Date(lastAuditTimestamp).toLocaleTimeString('en-GB', { hour12: false })}`
            : '—';
          return (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-semibold mb-2">Step 7: Monitor Training Activity</h2>
              <p className="text-gray-600 mb-6">
                Manager view of the assigned learner&apos;s training progress. All actions taken during simulation are written to the audit trail.
              </p>
              <div className="border-2 border-gray-200 rounded-lg p-5 mb-6 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Learner Dashboard</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded border ${statusBadgeClass}`}>
                    {trainingStatus}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div><p className="text-gray-600">Employee email</p><p className="font-semibold text-gray-900 break-all">{employeeEmail || '—'}</p></div>
                  <div><p className="text-gray-600">Assigned role</p><p className="font-semibold text-gray-900">{roleTitle || '—'}</p></div>
                  <div><p className="text-gray-600">Training status</p><p className="font-semibold text-gray-900">{trainingStatus}</p></div>
                  <div><p className="text-gray-600">Modules completed</p><p className="font-semibold text-gray-900">{modulesCompleted} / {totalModules}</p></div>
                  <div><p className="text-gray-600">Progress</p><p className="font-semibold text-gray-900">{progressPercent}%</p></div>
                  <div><p className="text-gray-600">Audit status</p><p className={`font-semibold ${lastAuditTimestamp ? 'text-green-700' : 'text-gray-900'}`}>{auditStatus}</p></div>
                </div>
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-2 transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><p className="text-gray-600">Last decision</p><p className="font-semibold text-gray-900">{lastDecisionLabel || '—'}</p></div>
                  <div><p className="text-gray-600">Last justification</p><p className="text-gray-900 italic">{lastJustification ? `"${lastJustification}"` : '—'}</p></div>
                </div>
              </div>
              <div className="border-t pt-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-1">Simulate Employee Training Activity</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Step through a governed MLRO decision scenario as the assigned learner. The dashboard above updates when the scenario is submitted.
                </p>
                <div className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  This demo scenario is MLRO-specific. For a fully role-aligned flow, select MLRO as the assigned role.
                </div>
                <MLROScenarioSimulation
                  employeeEmail={employeeEmail}
                  roleTitle={roleTitle}
                  onScenarioComplete={({ decisionLabel, justification, timestamp }) => {
                    setModulesCompleted((n) => Math.min(n + 1, modules.length));
                    setLastDecisionLabel(decisionLabel);
                    setLastJustification(justification);
                    setLastAuditTimestamp(timestamp);
                  }}
                />
              </div>
            </div>
          );
        })()}

        {documentViewer && (
          <aside
            id="rag-document-viewer"
            className="fixed bottom-0 right-0 top-0 z-50 w-full border-l border-gray-200 bg-white shadow-2xl md:w-[44rem]"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-gray-200 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-blue-700">
                      AMLR Article {documentViewer.article}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-gray-900">
                      {documentViewer.filename}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {documentViewer.highlights.length} highlighted RAG matches
                      {documentViewer.label && ` - ${documentViewer.label}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDocumentViewer(null)}
                    className="rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div ref={documentScrollRef} className="flex-1 overflow-y-auto bg-gray-50 p-5">
                <pre className="whitespace-pre-wrap rounded bg-white p-4 text-sm leading-6 text-gray-900">
                  {renderHighlightedDocument(documentViewer.text, documentViewer.highlights).map((segment, index) =>
                    segment.highlight ? (
                      <mark
                        key={index}
                        ref={segment.firstHighlight ? firstHighlightRef : undefined}
                        className="rounded bg-yellow-200 px-1 text-gray-950"
                      >
                        {segment.text}
                      </mark>
                    ) : (
                      <span key={index}>{segment.text}</span>
                    )
                  )}
                </pre>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
