import type { NextApiRequest, NextApiResponse } from 'next';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import {
  ApprovedStep,
  generateTrainingModulesWithOpenRouter,
} from '@/lib/openRouterTrainingGenerator';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getApprovedSteps(value: unknown) {
  if (!isRecord(value)) {
    throw new Error('approved_steps must be an object');
  }

  const steps = value as Record<string, ApprovedStep>;
  const missingSteps = ['1', '2', '3', '4', '5', '6', '7'].filter((step) => !steps[step]);

  if (missingSteps.length > 0) {
    throw new Error(`approved_steps missing steps: ${missingSteps.join(', ')}`);
  }

  return steps;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { analysis_id, approved_steps } = req.body;

    if (!analysis_id || typeof analysis_id !== 'string') {
      return res.status(400).json({ error: 'Invalid analysis_id' });
    }

    const approvedSteps = getApprovedSteps(approved_steps);
    const analysis = await db.analysisRun.findUnique({
      where: { id: analysis_id },
      include: { role: true },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    await logAudit('training_path_generation_started', 'system', {
      analysis_id,
      role_id: analysis.roleId,
      provider: 'openrouter',
    });

    const generated = await generateTrainingModulesWithOpenRouter({
      roleTitle: analysis.role.title,
      responsibilities: analysis.role.responsibilities,
      exposures: analysis.role.exposures,
      approvedSteps,
    });

    await db.$transaction(async (tx) => {
      await tx.module.deleteMany({
        where: { analysisId: analysis.id },
      });

      for (const [index, module] of generated.modules.entries()) {
        await tx.module.create({
          data: {
            analysisId: analysis.id,
            name: module.module,
            quarter: module.quarter,
            moduleCode: `${module.quarter.toLowerCase()}-${String(index + 1).padStart(3, '0')}`,
            objective: module.objective,
            duration: module.duration,
            isMandatory: module.is_mandatory,
            contentType: module.content_type,
            reasonAssigned: module.reason_assigned,
            riskAlignment: module.risk_alignment,
            amlrArticles: module.amlr_articles,
            knowledge: module.competencies.knowledge,
            skills: module.competencies.skills,
            judgment: module.competencies.judgment,
          },
        });
      }

      const existingOutput = isRecord(analysis.viddagptOutput) ? analysis.viddagptOutput : {};
      const nextOutput = JSON.parse(
        JSON.stringify({
          ...existingOutput,
          approved_steps: approvedSteps,
          curriculum: generated.modules,
          training_path_generation: {
            provider: 'openrouter',
            model: generated.model,
            generated_at: new Date().toISOString(),
            amlr_rag_evidence: generated.articleEvidence,
          },
        })
      ) as Prisma.InputJsonObject;

      await tx.analysisRun.update({
        where: { id: analysis.id },
        data: {
          viddagptOutput: nextOutput,
          checkpointA: true,
          checkpointB: true,
          checkpointC: true,
        },
      });
    });

    const savedAnalysis = await db.analysisRun.findUnique({
      where: { id: analysis.id },
      include: {
        modules: {
          orderBy: [{ quarter: 'asc' }, { moduleCode: 'asc' }],
        },
      },
    });

    await logAudit('training_path_generation_completed', 'system', {
      analysis_id,
      provider: 'openrouter',
      model: generated.model,
      modules_generated: generated.modules.length,
      amlr_articles: generated.articleEvidence.map((entry) => entry.article),
    });

    return res.status(200).json({
      analysis_id,
      provider: 'openrouter',
      model: generated.model,
      generated_at: new Date().toISOString(),
      modules_generated: savedAnalysis?.modules.length || generated.modules.length,
      modules:
        savedAnalysis?.modules.map((module) => ({
          id: module.id,
          name: module.name,
          quarter: module.quarter,
          objective: module.objective,
          duration: Number(module.duration),
          content_type: module.contentType,
          is_mandatory: module.isMandatory,
          reason_assigned: module.reasonAssigned,
          amlr_articles: module.amlrArticles,
          risk_alignment: module.riskAlignment,
          competencies: {
            knowledge: module.knowledge,
            skills: module.skills,
            judgment: module.judgment,
          },
        })) || [],
    });
  } catch (error: unknown) {
    console.error('[/api/training-path/generate] Error:', error);
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}
