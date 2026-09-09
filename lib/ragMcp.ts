type JsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

type JsonRpcResponse<T> = {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: JsonRpcError;
};

type McpToolCallResult = {
  content?: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  structuredContent?: unknown;
  isError?: boolean;
  [key: string]: unknown;
};

export type RagSearchContext = {
  query: string;
  toolResult: McpToolCallResult;
};

export type RagDocumentContext = {
  documentId: string;
  toolResult: McpToolCallResult;
};

const DEFAULT_RAG_MCP_URL = 'https://rag.bluetext.dev/mcp/';

function getRagConfig() {
  const token = process.env.RAG_TOKEN;

  if (!token) {
    throw new Error('RAG_TOKEN is not configured');
  }

  return {
    token,
    url: process.env.RAG_MCP_URL || DEFAULT_RAG_MCP_URL,
  };
}

async function parseMcpResponse<T>(response: Response): Promise<JsonRpcResponse<T>> {
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`RAG MCP request failed with ${response.status}: ${body}`);
  }

  const trimmed = body.trim();

  if (!trimmed) {
    return { jsonrpc: '2.0', id: 0, result: undefined as T };
  }

  if (trimmed.startsWith('data:') || trimmed.startsWith('event:')) {
    const dataLines = trimmed
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice('data:'.length).trim())
      .filter((line) => line && line !== '[DONE]');

    const jsonLine = dataLines.find((line) => line.startsWith('{'));

    if (!jsonLine) {
      throw new Error(`RAG MCP returned an SSE response without JSON data: ${body}`);
    }

    return JSON.parse(jsonLine) as JsonRpcResponse<T>;
  }

  return JSON.parse(trimmed) as JsonRpcResponse<T>;
}

async function postMcp<T>(
  id: number,
  method: string,
  params?: Record<string, unknown>,
  sessionId?: string
) {
  const { token, url } = getRagConfig();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      ...(params ? { params } : {}),
    }),
  });

  const payload = await parseMcpResponse<T>(response);

  if (payload.error) {
    throw new Error(`RAG MCP ${method} error: ${payload.error.message}`);
  }

  return {
    payload,
    sessionId: response.headers.get('mcp-session-id'),
  };
}

async function notifyInitialized(sessionId: string) {
  const { token, url } = getRagConfig();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'Mcp-Session-Id': sessionId,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`RAG MCP initialized notification failed with ${response.status}: ${body}`);
  }
}

async function initializeSession() {
  const { payload, sessionId } = await postMcp<unknown>(1, 'initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: {
      name: 'vidda-educating-platform',
      version: '0.1',
    },
  });

  if (!sessionId) {
    throw new Error('RAG MCP initialize response did not include mcp-session-id');
  }

  if (!payload.result) {
    throw new Error('RAG MCP initialize response did not include a result');
  }

  await notifyInitialized(sessionId);

  return sessionId;
}

export async function searchRagDocuments(query: string): Promise<RagSearchContext> {
  const sessionId = await initializeSession();

  const { payload } = await postMcp<McpToolCallResult>(
    2,
    'tools/call',
    {
      name: 'search_docs',
      arguments: { query },
    },
    sessionId
  );

  if (!payload.result) {
    throw new Error('RAG MCP search_docs returned no result');
  }

  return {
    query,
    toolResult: payload.result,
  };
}

export async function getRagDocument(documentId: string): Promise<RagDocumentContext> {
  const sessionId = await initializeSession();

  const { payload } = await postMcp<McpToolCallResult>(
    2,
    'tools/call',
    {
      name: 'get_document',
      arguments: { document_id: documentId },
    },
    sessionId
  );

  if (!payload.result) {
    throw new Error('RAG MCP get_document returned no result');
  }

  return {
    documentId,
    toolResult: payload.result,
  };
}
