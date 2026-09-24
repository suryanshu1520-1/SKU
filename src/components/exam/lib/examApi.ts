import { fetchWithAuth } from '../../../lib/api.js';
import type {
  ActiveResponse,
  AttemptSummary,
  CatalogResponse,
  ResponseSheet,
  StartRequest,
  StartResponse,
  SubmitResponse,
} from '../types.js';

export class ExamApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = 'ExamApiError';
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetchWithAuth(url, init);
  } catch {
    throw new ExamApiError(0, 'NETWORK', 'You appear to be offline.');
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const code = body?.error ?? `HTTP_${res.status}`;
    const message = body?.message ?? 'Request failed.';
    throw new ExamApiError(res.status, code, message, body);
  }

  return body as T;
}

export const examApi = {
  catalog(): Promise<CatalogResponse> {
    return request<CatalogResponse>('/api/exam/catalog');
  },

  start(req: StartRequest): Promise<StartResponse> {
    return request<StartResponse>('/api/exam/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
  },

  active(): Promise<ActiveResponse> {
    return request<ActiveResponse>('/api/exam/active');
  },

  checkpoint(
    attemptId: string,
    sheet: ResponseSheet,
    opts?: { keepalive?: boolean }
  ): Promise<{ ok: true; savedAt: string }> {
    return request<{ ok: true; savedAt: string }>('/api/exam/checkpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId, sheet }),
      keepalive: opts?.keepalive,
    });
  },

  submit(
    attemptId: string,
    sheet: ResponseSheet,
    mode: 'manual' | 'timeout'
  ): Promise<SubmitResponse> {
    return request<SubmitResponse>('/api/exam/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId, sheet, mode }),
    });
  },

  attempts(): Promise<{ attempts: AttemptSummary[] }> {
    return request<{ attempts: AttemptSummary[] }>('/api/exam/attempts');
  },

  result(attemptId: string): Promise<SubmitResponse> {
    return request<SubmitResponse>(`/api/exam/result?attemptId=${encodeURIComponent(attemptId)}`);
  },
};
