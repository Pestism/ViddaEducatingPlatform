import type { NextApiRequest, NextApiResponse } from 'next';
import { getRagArticleEvidence } from '@/lib/ragArticleEvidence';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const article = Array.isArray(req.query.article) ? req.query.article[0] : req.query.article;
    const context = Array.isArray(req.query.context) ? req.query.context[0] : req.query.context;

    if (!article || !/^\d+$/.test(article)) {
      return res.status(400).json({ error: 'Invalid article number' });
    }

    const evidence = await getRagArticleEvidence(Number(article), context);

    return res.status(200).json(evidence);
  } catch (error: unknown) {
    console.error('[/api/rag/article] Error:', error);
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}
