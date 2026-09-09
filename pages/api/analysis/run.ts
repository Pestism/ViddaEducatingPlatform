// pages/api/analysis/run.ts
// API endpoint to run RAG-backed ViddaGPT analysis.

import { NextApiRequest, NextApiResponse } from 'next';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { searchRagDocuments } from '@/lib/ragMcp';
import { generateAnalysisFromRag } from '@/lib/analysisGenerator';


const RAG_QUERY_MAX_LENGTH = 1800;

function buildRagSearchQuery(role: {
  title: string;
  responsibilities: string[];
  exposures: string[];
}) {
  const query = [
    `Compliance training analysis for role: ${role.title}`,
    `Responsibilities: ${role.responsibilities.join('; ')}`,
    `Risk exposures: ${role.exposures.join('; ')}`,
    'Find relevant AML, KYC, financial crime, governance, regulatory obligation, competency, and training evidence.',
  ]
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim();

  return query.slice(0, RAG_QUERY_MAX_LENGTH);
}

function buildAmlrSearchQuery(role: {
  title: string;
  responsibilities: string[];
  exposures: string[];
}) {
  const query = [
    'Vidda Solutions Learning Program Generation AMLR 1624 articles',
    'Retrieve the AMLR article text and training obligations for Articles 9 through 20.',
    `Role context: ${role.title}`,
    `Responsibilities needing article mapping: ${role.responsibilities.join('; ')}`,
  ]
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim();

  return query.slice(0, RAG_QUERY_MAX_LENGTH);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getErrorStack(error: unknown) {
  return error instanceof Error ? error.stack : undefined;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let analysisIdForFailure: string | null = null;

  try {
    const { role_id } = req.body;

    console.log('[/api/analysis/run] Starting RAG-backed analysis for role:', role_id);

    // Fetch role
    const role = await db.role.findUnique({
      where: { id: role_id },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Create analysis record
    const analysis = await db.analysisRun.create({
      data: {
        roleId: role_id,
        status: 'processing',
        startedAt: new Date(),
      },
    });
    analysisIdForFailure = analysis.id;

    console.log('[/api/analysis/run] Analysis created:', analysis.id);

    // Log audit event
    await logAudit('analysis_started', 'system', {
      analysis_id: analysis.id,
      role_id: role_id,
      role_title: role.title,
      mode: 'RAG_BACKED_GENERATION',
    });

    const startedAtMs = Date.now();
    const roleRagQuery = buildRagSearchQuery(role);
    const amlrRagQuery = buildAmlrSearchQuery(role);

    console.log('[/api/analysis/run] Calling RAG MCP search_docs for role evidence...');
    const [roleRagContext, amlrRagContext] = await Promise.all([
      searchRagDocuments(roleRagQuery),
      searchRagDocuments(amlrRagQuery),
    ]);

    const generatedAnalysis = await generateAnalysisFromRag(role, roleRagContext, amlrRagContext);

    await logAudit('rag_search_completed', 'system', {
      analysis_id: analysis.id,
      role_id: role_id,
      role_query: roleRagContext.query,
      amlr_query: amlrRagContext.query,
      role_content_items: roleRagContext.toolResult.content?.length ?? null,
      amlr_content_items: amlrRagContext.toolResult.content?.length ?? null,
      generation_mode: generatedAnalysis.generation_mode,
    });

    const duration = Math.max(1, Math.round((Date.now() - startedAtMs) / 1000));
    const retrievalJson = JSON.parse(
      JSON.stringify({
        role_context: roleRagContext,
        amlr_context: amlrRagContext,
      })
    ) as Prisma.InputJsonValue;
    const generatedAnalysisJson = JSON.parse(JSON.stringify(generatedAnalysis)) as Prisma.InputJsonObject;
    const viddagptOutput: Prisma.InputJsonObject = {
      ...generatedAnalysisJson,
      retrieval: retrievalJson,
    };

    console.log(`[/api/analysis/run] RAG-backed analysis completed with ${generatedAnalysis.curriculum.length} modules`);

    // Create modules in database
    const modules = generatedAnalysis.curriculum;
    let moduleCount = 0;

    for (const m of modules) {
      try {
        await db.module.create({
          data: {
            analysisId: analysis.id,
            name: m.module,
            quarter: m.quarter,
            objective: m.objective,
            duration: m.duration,
            isMandatory: m.is_mandatory,
            contentType: m.content_type,
            reasonAssigned: m.reason_assigned,
            riskAlignment: m.risk_alignment,
            amlrArticles: m.amlr_articles,
            knowledge: m.competencies.knowledge,
            skills: m.competencies.skills,
            judgment: m.competencies.judgment,
          },
        });
        moduleCount++;
      } catch (moduleError: unknown) {
        console.error('[/api/analysis/run] Failed to create module:', moduleError);
      }
    }

    console.log(`[/api/analysis/run] Created ${moduleCount} modules`);

    // Update analysis record
    await db.analysisRun.update({
      where: { id: analysis.id },
      data: {
        status: 'completed',
        viddagptOutput: viddagptOutput,
        durationSeconds: duration,
        completedAt: new Date(),
      },
    });

    // Log completion
    await logAudit('analysis_completed', 'system', {
      analysis_id: analysis.id,
      modules_generated: moduleCount,
      duration_seconds: duration,
      mode: generatedAnalysis.generation_mode,
      role_rag_query: roleRagContext.query,
      amlr_rag_query: amlrRagContext.query,
    });

    // Return success
    return res.status(200).json({
      analysis_id: analysis.id,
      status: 'completed',
      modules_generated: moduleCount,
      duration_seconds: duration,
      mode: generatedAnalysis.generation_mode,
      framework_steps: generatedAnalysis.framework_steps,
      retrieval: {
        role_context: roleRagContext,
        amlr_context: amlrRagContext,
      },
    });
  } catch (error: unknown) {
    console.error('[/api/analysis/run] Error:', error);
    const errorMessage = getErrorMessage(error);

    if (analysisIdForFailure) {
      try {
        await db.analysisRun.update({
          where: { id: analysisIdForFailure },
          data: {
            status: 'failed',
            completedAt: new Date(),
          },
        });
      } catch (updateError) {
        console.error('[/api/analysis/run] Failed to mark analysis as failed:', updateError);
      }
    }

    await logAudit('analysis_failed', 'system', {
      error: errorMessage,
      stack: getErrorStack(error),
    });

    return res.status(500).json({
      error: errorMessage,
      type: 'ANALYSIS_FAILED',
    });
  }
}