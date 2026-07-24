import { Platform } from 'react-native';
import { auth } from './firebase';

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatCitation {
  sourceId: string;
  sourceTitle: string;
  pageStart: number | null;
  pageEnd: number | null;
  excerpt: string;
  score: number;
}

export interface ChatAiResponse {
  answer: string;
  citations: ChatCitation[];
  confidence: number;
}

const DEFAULT_AI_API_URL = Platform.select({
  android: 'http://10.0.2.2:8000',
  ios: 'http://localhost:8000',
  default: 'http://localhost:8000',
});

const AI_API_URL = (
  process.env.EXPO_PUBLIC_AI_API_URL ?? DEFAULT_AI_API_URL
).replace(/\/$/, '');

export async function askHistoryAi(
  question: string,
  history: ChatHistoryMessage[] = [],
): Promise<ChatAiResponse> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Bạn cần đăng nhập để sử dụng trợ lý lịch sử.');
  }

  // Luôn làm mới token để tránh gửi token cache đã hết hạn tới FastAPI.
  const token = await user.getIdToken(true);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const response = await fetch(`${AI_API_URL}/v1/chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        messages: history.slice(-8),
        include_citations: false,
      }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = payload?.detail;
      throw new Error(
        typeof detail === 'string'
          ? detail
          : 'Trợ lý AI chưa thể trả lời. Vui lòng thử lại.',
      );
    }

    return {
      answer: String(payload.answer ?? ''),
      citations: Array.isArray(payload.citations)
        ? payload.citations.map((citation: Record<string, unknown>) => ({
          sourceId: String(citation.source_id ?? ''),
          sourceTitle: String(citation.source_title ?? 'Tài liệu lịch sử'),
          pageStart: typeof citation.page_start === 'number' ? citation.page_start : null,
          pageEnd: typeof citation.page_end === 'number' ? citation.page_end : null,
          excerpt: String(citation.excerpt ?? ''),
          score: Number(citation.score ?? 0),
        }))
        : [],
      confidence: Number(payload.confidence ?? 0),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.');
    }
    if (
      error instanceof TypeError ||
      (error instanceof Error && error.message.toLowerCase().includes('network request failed'))
    ) {
      throw new Error(
        `Không kết nối được trợ lý AI (${AI_API_URL}). ` +
        'Hãy kiểm tra FastAPI đang chạy ở cổng 8000.',
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
