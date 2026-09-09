// components/TrainingMaterialGenerator.tsx
// Step 5 UI: manager selects one module, generates short role-specific
// training material via /api/training/material, reviews and approves it.

'use client';

import { useState } from 'react';

type KnowledgeCheckItem = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

type TrainingMaterial = {
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

type CachedEntry = {
  material: TrainingMaterial;
  source: 'ai' | 'mock';
};

export type GeneratedModule = {
  id: string;
  name: string;
  quarter: string;
  objective: string;
  duration: number;
  amlr_articles: number[];
  risk_alignment: string[];
  competencies: {
    knowledge: string[];
    skills: string[];
    judgment: string[];
  };
};

type Props = {
  roleTitle: string;
  modules: GeneratedModule[];
  approvedModuleIds: Set<string>;
  onApprove: (moduleId: string) => void;
  onUnapprove: (moduleId: string) => void;
};

export default function TrainingMaterialGenerator({
  roleTitle,
  modules,
  approvedModuleIds,
  onApprove,
  onUnapprove,
}: Props) {
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [cache, setCache] = useState<Record<string, CachedEntry>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const selectedModule = modules.find((m) => m.id === selectedModuleId) ?? null;
  const cached = selectedModuleId ? cache[selectedModuleId] : undefined;
  const isApproved = selectedModuleId ? approvedModuleIds.has(selectedModuleId) : false;

  const generate = async (forceRegenerate: boolean) => {
    if (!selectedModule) return;
    setStatus('loading');
    setErrorMsg('');

    if (forceRegenerate && approvedModuleIds.has(selectedModule.id)) {
      onUnapprove(selectedModule.id);
    }

    try {
      const res = await fetch('/api/training/material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_title: roleTitle,
          module_name: selectedModule.name,
          module_objective: selectedModule.objective,
          module_quarter: selectedModule.quarter,
          module_duration: selectedModule.duration,
          module_amlr_articles: selectedModule.amlr_articles,
          module_risk_alignment: selectedModule.risk_alignment,
          module_competencies: selectedModule.competencies,
        }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data: { source: 'ai' | 'mock'; material: TrainingMaterial } = await res.json();
      setCache((prev) => ({
        ...prev,
        [selectedModule.id]: { material: data.material, source: data.source },
      }));
      setStatus('idle');
    } catch (e) {
      console.error('Material generation failed:', e);
      setErrorMsg(e instanceof Error ? e.message : 'Generation failed');
      setStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Demo wording */}
      <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
        This demo generates one selected module&apos;s training material. In production, each
        generated module could produce its own study content, quiz, or scenario.
      </div>

      {/* Module picker */}
      <div className="border border-gray-200 rounded-lg p-5 bg-white">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Select a module to generate training material
        </label>
        <select
          value={selectedModuleId}
          onChange={(e) => setSelectedModuleId(e.target.value)}
          disabled={status === 'loading'}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
        >
          <option value="">— Choose a module —</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              [{m.quarter}] {m.name}
            </option>
          ))}
        </select>

        {selectedModule && (
          <p className="mt-2 text-xs text-gray-600">
            Objective: {selectedModule.objective}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => generate(false)}
            disabled={!selectedModule || status === 'loading' || !!cached}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'loading' && !cached ? 'Generating…' : 'Generate Training Material'}
          </button>

          {cached && (
            <button
              type="button"
              onClick={() => generate(true)}
              disabled={status === 'loading'}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 disabled:opacity-50"
            >
              {status === 'loading' ? 'Regenerating…' : 'Regenerate'}
            </button>
          )}

          {cached && !isApproved && (
            <button
              type="button"
              onClick={() => onApprove(selectedModule!.id)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700"
            >
              Approve Material
            </button>
          )}

          {cached && isApproved && (
            <span className="px-3 py-1 text-sm font-semibold rounded border bg-green-100 text-green-800 border-green-300">
              ✓ Approved
            </span>
          )}

          {cached && (
            <span className="text-xs px-2 py-1 rounded border bg-white text-gray-700 border-gray-300">
              Source: {cached.source === 'ai' ? 'Claude via OpenRouter' : 'rule-based fallback'}
            </span>
          )}
        </div>

        {status === 'error' && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {errorMsg || 'Generation failed.'}
          </div>
        )}
      </div>

      {/* Generated material cards */}
      {cached && <MaterialCards material={cached.material} />}
    </div>
  );
}

function MaterialCards({ material }: { material: TrainingMaterial }) {
  return (
    <div className="space-y-4">
      <div className="border border-blue-200 rounded-lg p-5 bg-blue-50">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{material.title}</h3>
          <span className="text-xs bg-white text-blue-800 border border-blue-300 px-2 py-1 rounded">
            {material.estimatedStudyTime}
          </span>
        </div>
        <p className="text-sm text-gray-800">{material.plainEnglishSummary}</p>
      </div>

      {material.learningObjectives.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-5 bg-white">
          <h4 className="font-semibold text-gray-900 mb-2">Learning objectives</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800">
            {material.learningObjectives.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      )}

      {material.keyConcepts.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-5 bg-white">
          <h4 className="font-semibold text-gray-900 mb-2">Key concepts</h4>
          <div className="flex flex-wrap gap-2">
            {material.keyConcepts.map((c, i) => (
              <span
                key={i}
                className="bg-gray-100 text-gray-800 border border-gray-300 px-2 py-1 rounded text-xs"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {material.roleSpecificExample && (
        <div className="border border-gray-200 rounded-lg p-5 bg-white">
          <h4 className="font-semibold text-gray-900 mb-2">Role-specific example</h4>
          <p className="text-sm text-gray-800">{material.roleSpecificExample}</p>
        </div>
      )}

      {material.regulatoryTraceability.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-5 bg-white">
          <h4 className="font-semibold text-gray-900 mb-2">Regulatory traceability</h4>
          <div className="flex flex-wrap gap-2">
            {material.regulatoryTraceability.map((r, i) => (
              <span
                key={i}
                className="bg-blue-100 text-blue-800 border border-blue-300 px-2 py-1 rounded text-xs font-semibold"
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {material.knowledgeCheck.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-5 bg-white">
          <h4 className="font-semibold text-gray-900 mb-2">Knowledge check</h4>
          <div className="space-y-4">
            {material.knowledgeCheck.map((q, i) => (
              <div key={i} className="border border-gray-200 rounded p-3 bg-gray-50">
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Q{i + 1}. {q.question}
                </p>
                <ul className="space-y-1 text-sm text-gray-800 mb-2">
                  {q.options.map((opt, j) => {
                    const isCorrect = opt === q.correctAnswer;
                    return (
                      <li
                        key={j}
                        className={`px-2 py-1 rounded border ${isCorrect ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'}`}
                      >
                        {isCorrect ? '✓ ' : '○ '}
                        {opt}
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs text-gray-600 italic">{q.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {material.managerReviewNote && (
        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 text-sm text-yellow-900">
          <span className="font-semibold">Manager review note:</span> {material.managerReviewNote}
        </div>
      )}
    </div>
  );
}
