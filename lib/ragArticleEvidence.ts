import { getRagDocument, searchRagDocuments } from '@/lib/ragMcp';

export type RagArticleHit = {
  text: string;
  filename?: string;
  score?: number;
  document_id?: string;
  label?: string;
};

export type RagArticleDocument = {
  id: string;
  filename: string;
  label?: string;
  text: string;
};

export type HighlightRange = {
  start: number;
  end: number;
  hitIndex: number;
  score?: number;
};

const AMLR_SOURCE_PATTERN = /\bamlr\b|1624|anti[-\s]?money laundering regulation/i;
const NON_AMLR_SOURCE_PATTERN = /role descriptions?|hackathon information|developer/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeHit(value: unknown): RagArticleHit | null {
  if (!isRecord(value) || typeof value.text !== 'string') return null;

  return {
    text: value.text,
    filename: typeof value.filename === 'string' ? value.filename : undefined,
    score: typeof value.score === 'number' ? value.score : undefined,
    document_id: typeof value.document_id === 'string' ? value.document_id : undefined,
    label: typeof value.label === 'string' ? value.label : undefined,
  };
}

function getStructuredHits(toolResult: unknown) {
  if (!isRecord(toolResult)) return [];
  const structuredContent = toolResult.structuredContent;

  if (!isRecord(structuredContent) || !Array.isArray(structuredContent.result)) {
    return [];
  }

  return structuredContent.result
    .map(normalizeHit)
    .filter((hit): hit is RagArticleHit => Boolean(hit));
}

function getContentHits(toolResult: unknown) {
  if (!isRecord(toolResult) || !Array.isArray(toolResult.content)) return [];

  return toolResult.content
    .map((item) => {
      if (!isRecord(item) || typeof item.text !== 'string') return null;

      try {
        return normalizeHit(JSON.parse(item.text));
      } catch {
        return null;
      }
    })
    .filter((hit): hit is RagArticleHit => Boolean(hit));
}

function normalizeDocument(value: unknown): RagArticleDocument | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.text !== 'string') {
    return null;
  }

  return {
    id: value.id,
    filename: typeof value.filename === 'string' ? value.filename : 'RAG document',
    label: typeof value.label === 'string' ? value.label : undefined,
    text: value.text,
  };
}

function getDocumentFromToolResult(toolResult: unknown) {
  if (!isRecord(toolResult)) return null;

  if (isRecord(toolResult.structuredContent)) {
    const result = toolResult.structuredContent.result;
    const structuredDoc = Array.isArray(result) ? normalizeDocument(result[0]) : normalizeDocument(result);
    if (structuredDoc) return structuredDoc;
  }

  if (Array.isArray(toolResult.content)) {
    for (const item of toolResult.content) {
      if (!isRecord(item) || typeof item.text !== 'string') continue;

      try {
        const parsed = JSON.parse(item.text);
        const doc = normalizeDocument(parsed);
        if (doc) return doc;
      } catch {
        // Ignore non-JSON content blocks.
      }
    }
  }

  return null;
}

function normalizeForSearch(value: string) {
  let normalized = '';
  const map: number[] = [];
  let previousWasSpace = true;

  for (let index = 0; index < value.length; index++) {
    const char = value[index];

    if (/\s/.test(char)) {
      if (!previousWasSpace) {
        normalized += ' ';
        map.push(index);
        previousWasSpace = true;
      }
      continue;
    }

    normalized += char.toLowerCase();
    map.push(index);
    previousWasSpace = false;
  }

  return {
    text: normalized.trim(),
    map,
  };
}

function findHighlightRange(documentText: string, hitText: string, hitIndex: number, score?: number): HighlightRange | null {
  const normalizedDocument = normalizeForSearch(documentText);
  const normalizedHit = normalizeForSearch(hitText).text;
  const candidates = [
    normalizedHit,
    normalizedHit.slice(0, 500),
    normalizedHit.slice(0, 300),
    normalizedHit.slice(0, 160),
    normalizedHit.slice(0, 90),
  ].filter((candidate) => candidate.length > 40);

  for (const candidate of candidates) {
    const normalizedStart = normalizedDocument.text.indexOf(candidate);

    if (normalizedStart >= 0) {
      const normalizedEnd = normalizedStart + candidate.length - 1;
      const start = normalizedDocument.map[normalizedStart] ?? 0;
      const end = (normalizedDocument.map[normalizedEnd] ?? start) + 1;

      return {
        start,
        end,
        hitIndex,
        score,
      };
    }
  }

  return null;
}

export function getHighlightRanges(documentText: string, hits: RagArticleHit[]) {
  return hits
    .map((hit, index) => findHighlightRange(documentText, hit.text, index, hit.score))
    .filter((range): range is HighlightRange => Boolean(range))
    .sort((a, b) => a.start - b.start);
}

function getArticleSection(documentText: string, article: number) {
  const headingPattern = new RegExp(`(^|[.\\n]\\s*)Article\\s+${article}\\b(?!\\s*\\()`, 'i');
  const headingMatch = headingPattern.exec(documentText);

  if (!headingMatch || headingMatch.index === undefined) return null;

  const start = headingMatch.index + headingMatch[1].length;
  const nextHeadingPattern = /(^|[.\n]\s*)Article\s+\d+\b(?!\s*\()/gi;
  nextHeadingPattern.lastIndex = start + 1;

  let end = documentText.length;
  let nextHeadingMatch = nextHeadingPattern.exec(documentText);

  while (nextHeadingMatch) {
    if (nextHeadingMatch.index > start) {
      end = nextHeadingMatch.index + nextHeadingMatch[1].length;
      break;
    }

    nextHeadingMatch = nextHeadingPattern.exec(documentText);
  }

  return documentText.slice(start, end).trim();
}

function truncateEvidenceText(text: string, maxLength = 1600) {
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength).trim()}...`;
}

function normalizeQuery(parts: string[]) {
  return parts
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSourceText(source: Pick<RagArticleHit, 'filename' | 'label'>) {
  return [source.filename, source.label].filter(Boolean).join(' ');
}

function isAmlrSource(source: Pick<RagArticleHit, 'filename' | 'label'>) {
  const sourceText = getSourceText(source);

  return AMLR_SOURCE_PATTERN.test(sourceText) && !NON_AMLR_SOURCE_PATTERN.test(sourceText);
}

async function getFirstAmlrDocument(hits: RagArticleHit[]) {
  const seenDocumentIds = new Set<string>();

  for (const hit of hits) {
    if (!hit.document_id || seenDocumentIds.has(hit.document_id)) continue;

    seenDocumentIds.add(hit.document_id);

    const documentContext = await getRagDocument(hit.document_id);
    const document = getDocumentFromToolResult(documentContext.toolResult);

    if (document && isAmlrSource(document)) {
      return document;
    }
  }

  return null;
}

function getAmlrHits(toolResult: unknown) {
  const structuredHits = getStructuredHits(toolResult);
  const rawHits = structuredHits.length > 0 ? structuredHits : getContentHits(toolResult);

  return rawHits.filter(isAmlrSource).slice(0, 5);
}

export async function getRagArticleEvidence(article: number, context?: string) {
  let query = normalizeQuery([
    `AMLR 1624 Article ${article}`,
    context || '',
    'Search only the AMLR 1624 article document. Exclude role descriptions and hackathon information documents.',
    'Return the most relevant sentence or paragraph from the AMLR document.',
  ]);

  let ragContext = await searchRagDocuments(query);
  let contentHits = getAmlrHits(ragContext.toolResult);

  if (contentHits.length === 0) {
    query = normalizeQuery([
      `Vidda Solutions Learning Program Generation AMLR 1624 Article ${article}`,
      'Return the article text from the AMLR 1624 document only.',
    ]);
    ragContext = await searchRagDocuments(query);
    contentHits = getAmlrHits(ragContext.toolResult);
  }

  const document = await getFirstAmlrDocument(contentHits);
  const exactArticleSection = document ? getArticleSection(document.text, article) : null;
  const hits =
    document && exactArticleSection
      ? [
          {
            text: truncateEvidenceText(exactArticleSection),
            filename: document.filename,
            document_id: document.id,
            label: document.label,
          },
        ]
      : contentHits;

  return {
    article,
    query,
    hits,
    document: document
      ? {
          ...document,
          highlights: getHighlightRanges(document.text, hits),
        }
      : null,
  };
}
