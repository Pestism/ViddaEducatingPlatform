// pages/api/analysis/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid analysis ID' });
    }

    const analysis = await db.analysisRun.findUnique({
      where: { id },
      include: {
        role: true,
        modules: {
          orderBy: { quarter: 'asc' },
        },
      },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    return res.status(200).json({
      analysis_id: analysis.id,
      role_title: analysis.role.title,
      status: analysis.status,
      modules_generated: analysis.modules.length,
      duration_seconds: analysis.durationSeconds,
      viddagpt_output: analysis.viddagptOutput,
      modules: analysis.modules.map(m => ({
        id: m.id,
        name: m.name,
        quarter: m.quarter,
          objective: m.objective,
          duration: Number(m.duration),
          content_type: m.contentType,
          is_mandatory: m.isMandatory,
        reason_assigned: m.reasonAssigned,
        amlr_articles: m.amlrArticles,
        risk_alignment: m.riskAlignment,
        competencies: {
          knowledge: m.knowledge,
          skills: m.skills,
          judgment: m.judgment,
        },
      })),
    });
  } catch (error: unknown) {
    console.error('[/api/analysis/[id]] Error:', error);
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}
