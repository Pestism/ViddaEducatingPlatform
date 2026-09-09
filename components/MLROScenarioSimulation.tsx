// components/MLROScenarioSimulation.tsx
// Step 6 UI: employee training simulation + AI justification evaluation.

'use client';

import { useState } from 'react';
import { MLRO_ONBOARDING_SCENARIO } from '@/lib/scenarios';
import type { DecisionKey, ScenarioFeedback } from '@/lib/scenarios';

type AIEvaluation = {
  referencesEvidence: 'yes' | 'partial' | 'no';
  explainsDecision: 'yes' | 'partial' | 'no';
  mentionsRiskIndicators: 'yes' | 'partial' | 'no';
  consistentWithRecommended: 'yes' | 'partial' | 'no';
  auditReady: 'yes' | 'no';
  overallScore: number;
  missingElements: string[];
  suggestedImprovedJustification: string;
  summary: string;
};

type ScenarioCompletePayload = {
  decision: DecisionKey;
  decisionLabel: string;
  justification: string;
  timestamp: string;
};

type Props = {
  employeeEmail: string;
  roleTitle: string;
  onScenarioComplete: (payload: ScenarioCompletePayload) => void;
  analysisId?: string;
};

const riskBadgeClass = (level: string) => {
  if (level === 'CRITICAL') return 'bg-red-100 text-red-800 border-red-300';
  if (level === 'HIGH') return 'bg-orange-100 text-orange-800 border-orange-300';
  if (level === 'MEDIUM') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  return 'bg-gray-100 text-gray-800 border-gray-300';
};

const verdictClass = (verdict: ScenarioFeedback['verdict']) => {
  if (verdict === 'correct') return 'bg-green-100 text-green-800 border-green-300';
  if (verdict === 'acceptable') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  return 'bg-red-100 text-red-800 border-red-300';
};

const verdict3Class = (value: 'yes' | 'partial' | 'no') => {
  if (value === 'yes') return 'bg-green-100 text-green-800 border-green-300';
  if (value === 'partial') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  return 'bg-red-100 text-red-800 border-red-300';
};

const auditReadyClass = (value: 'yes' | 'no') => {
  if (value === 'yes') return 'bg-green-100 text-green-800 border-green-300';
  return 'bg-red-100 text-red-800 border-red-300';
};

export default function MLROScenarioSimulation({
  employeeEmail,
  roleTitle,
  onScenarioComplete,
  analysisId,
}: Props) {
  const scenario = MLRO_ONBOARDING_SCENARIO;

  const [expandedEvidenceIds, setExpandedEvidenceIds] = useState<Set<string>>(new Set());
  const [reviewedEvidenceIds, setReviewedEvidenceIds] = useState<Set<string>>(new Set());
  const [selectedDecision, setSelectedDecision] = useState<DecisionKey | null>(null);
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<ScenarioFeedback | null>(null);
  const [auditTimestamp, setAuditTimestamp] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [aiEvaluation, setAiEvaluation] = useState<AIEvaluation | null>(null);
  const [aiEvalStatus, setAiEvalStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [aiEvalSource, setAiEvalSource] = useState<'ai' | 'mock' | null>(null);

  const submitted = feedback !== null;

  const canSubmit =
    !submitted &&
    selectedDecision !== null &&
    reviewedEvidenceIds.size > 0 &&
    justification.trim().length >= 10;

  const needsEvidenceReview = !submitted && reviewedEvidenceIds.size === 0;

  const toggleEvidence = (id: string) => {
    if (submitted) return;

    setExpandedEvidenceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    setReviewedEvidenceIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('en-GB', { hour12: false });
    } catch {
      return iso;
    }
  };

  const runAIEvaluation = async (decision: DecisionKey, cleanJustification: string) => {
    setAiEvalStatus('loading');
    setAiEvaluation(null);
    setAiEvalSource(null);

    try {
      const res = await fetch('/api/training/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_email: employeeEmail,
          role_title: roleTitle,
          analysis_id: analysisId,
          scenario_id: scenario.id,
          evidence_reviewed: Array.from(reviewedEvidenceIds),
          decision,
          justification: cleanJustification,
        }),
      });

      if (!res.ok) {
        throw new Error(`AI evaluation failed (${res.status})`);
      }

      const data: {
        source: 'ai' | 'mock';
        evaluation: AIEvaluation;
      } = await res.json();

      setAiEvaluation(data.evaluation);
      setAiEvalSource(data.source);
      setAiEvalStatus('done');
    } catch (err) {
      console.error('AI evaluation failed:', err);
      setAiEvalStatus('error');
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || selectedDecision === null) return;

    setSubmitting(true);
    setErrorMsg('');

    const cleanJustification = justification.trim();

    try {
      const res = await fetch('/api/training/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_email: employeeEmail,
          role_title: roleTitle,
          analysis_id: analysisId,
          scenario_id: scenario.id,
          evidence_reviewed: Array.from(reviewedEvidenceIds),
          decision: selectedDecision,
          justification: cleanJustification,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${res.status})`);
      }

      const data: {
        logged: boolean;
        timestamp: string;
        feedback: ScenarioFeedback;
      } = await res.json();

      const decisionLabel =
        scenario.decisions.find((d) => d.key === selectedDecision)?.label ?? selectedDecision;

      setFeedback(data.feedback);
      setAuditTimestamp(data.timestamp);

      onScenarioComplete({
        decision: selectedDecision,
        decisionLabel,
        justification: cleanJustification,
        timestamp: data.timestamp,
      });

      await runAIEvaluation(selectedDecision, cleanJustification);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border border-blue-200 rounded-lg p-5 bg-blue-50">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900">Scenario: {scenario.title}</h3>
          <span className="text-xs bg-blue-100 text-blue-800 border border-blue-300 px-2 py-1 rounded">
            MLRO Simulation
          </span>
        </div>
        <p className="text-sm text-gray-800">{scenario.brief}</p>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">
          Evidence ({scenario.evidence.length} indicators)
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          Click each indicator to review the underlying reasoning. Reviewed items are recorded in the audit trail.
        </p>

        <div className="space-y-2">
          {scenario.evidence.map((ev) => {
            const expanded = expandedEvidenceIds.has(ev.id);
            const reviewed = reviewedEvidenceIds.has(ev.id);

            return (
              <div key={ev.id} className="border border-gray-200 rounded-lg bg-white">
                <button
                  type="button"
                  onClick={() => toggleEvidence(ev.id)}
                  className="w-full flex items-center justify-between text-left p-4 hover:bg-gray-50"
                  disabled={submitted}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${riskBadgeClass(ev.riskBadge)}`}>
                        {ev.riskBadge}
                      </span>
                      {reviewed && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded border bg-green-50 text-green-700 border-green-200">
                          Reviewed
                        </span>
                      )}
                      <span className="font-semibold text-gray-900 text-sm">{ev.label}</span>
                    </div>
                    <p className="text-sm text-gray-700">{ev.summary}</p>
                  </div>

                  <svg
                    className={`w-5 h-5 text-gray-400 ml-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expanded && (
                  <div className="border-t bg-yellow-50 px-4 py-3">
                    <p className="text-xs font-semibold text-yellow-900 mb-1">Why it matters</p>
                    <p className="text-sm text-gray-800">{ev.whyItMatters}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-5 bg-white">
        <h3 className="font-semibold text-gray-900 mb-3">Your decision</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {scenario.decisions.map((d) => {
            const isSelected = selectedDecision === d.key;

            return (
              <button
                key={d.key}
                type="button"
                onClick={() => !submitted && setSelectedDecision(d.key)}
                disabled={submitted}
                className={`text-left border-2 rounded-lg p-3 transition ${
                  isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-400'
                } ${submitted ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <p className="font-semibold text-sm text-gray-900">{d.label}</p>
              </button>
            );
          })}
        </div>

        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Justification (required)
        </label>

        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          disabled={submitted}
          rows={4}
          placeholder="Explain the reasoning behind your decision. Reference the evidence indicators that drove it."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
        />

        <p className="text-xs text-gray-500 mt-1">
          {justification.trim().length} / 10 minimum characters
        </p>

        {needsEvidenceReview && (
          <p className="mt-2 text-xs text-amber-700">
            Review at least one evidence indicator before submitting.
          </p>
        )}

        {errorMsg && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="mt-4 w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting…' : submitted ? 'Submitted' : 'Submit decision'}
        </button>
      </div>

      {feedback && (
        <div className="border border-gray-200 rounded-lg p-5 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Explainability</h3>
            <span className={`px-2 py-1 text-xs font-semibold rounded border ${verdictClass(feedback.verdict)}`}>
              {feedback.verdict.toUpperCase()}
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-gray-700">Explanation</p>
              <p className="text-gray-800">{feedback.explanation}</p>
            </div>

            <div>
              <p className="font-semibold text-gray-700">Recommended action</p>
              <p className="text-gray-800">{feedback.recommendedAction}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="font-semibold text-gray-700">AMLR articles</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {feedback.amlrArticles.map((a) => (
                    <span
                      key={a}
                      className="bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 rounded text-xs font-semibold"
                    >
                      Art. {a}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-semibold text-gray-700">Competency tested</p>
                <p className="text-gray-800">
                  <span className="font-semibold">{feedback.competencyTested.area}:</span>{' '}
                  {feedback.competencyTested.detail}
                </p>
              </div>
            </div>

            <div>
              <p className="font-semibold text-gray-700">Consequence if wrong</p>
              <p className="text-gray-800">{feedback.consequenceIfWrong}</p>
            </div>
          </div>
        </div>
      )}

      {submitted && aiEvalStatus !== 'idle' && (
        <div className="border border-purple-200 rounded-lg p-5 bg-purple-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">AI Justification Evaluation</h3>

            {aiEvalStatus === 'done' && aiEvalSource && (
              <span className="text-xs px-2 py-1 rounded border bg-white text-gray-700 border-gray-300">
                Source: {aiEvalSource === 'ai' ? 'Claude via OpenRouter' : 'rule-based fallback'}
              </span>
            )}
          </div>

          {aiEvalStatus === 'loading' && (
            <p className="text-sm text-gray-600 italic">Evaluating justification…</p>
          )}

          {aiEvalStatus === 'error' && (
            <p className="text-sm text-red-700">
              AI evaluation could not be completed. The rule-based feedback above remains valid.
            </p>
          )}

          {aiEvalStatus === 'done' && aiEvaluation && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs font-semibold rounded border ${auditReadyClass(aiEvaluation.auditReady)}`}>
                  Audit-ready: {aiEvaluation.auditReady.toUpperCase()}
                </span>
                <span className="text-gray-700">
                  Overall score: <strong className="text-gray-900">{aiEvaluation.overallScore}/100</strong>
                </span>
              </div>

              <p className="text-gray-800">{aiEvaluation.summary}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { label: 'References evidence', value: aiEvaluation.referencesEvidence },
                  { label: 'Explains decision', value: aiEvaluation.explainsDecision },
                  { label: 'Mentions risk indicators', value: aiEvaluation.mentionsRiskIndicators },
                  { label: 'Consistent with recommended action', value: aiEvaluation.consistentWithRecommended },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-2"
                  >
                    <span className="text-gray-700">{row.label}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${verdict3Class(row.value)}`}>
                      {row.value.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>

              {aiEvaluation.missingElements.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">What is missing</p>
                  <ul className="list-disc pl-5 text-gray-800 space-y-1">
                    {aiEvaluation.missingElements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiEvaluation.suggestedImprovedJustification && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">
                    Suggested improved justification
                  </p>
                  <p className="text-gray-800 italic bg-white border border-gray-200 rounded p-3">
                    {aiEvaluation.suggestedImprovedJustification}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {auditTimestamp && (
        <div className="border border-green-200 bg-green-50 rounded-lg p-4 text-sm font-mono text-green-800">
          ✓ scenario_decision logged at {formatTime(auditTimestamp)} — actor: {employeeEmail}
        </div>
      )}
    </div>
  );
}