import type { AgentResult } from '@/lib/types';

// #Agent流式事件类型
export type AgentStreamEvent =
  | { type: 'run.start'; at: string; data: { userId: string; historySize: number } }
  | { type: 'route.ready'; at: string; data: Record<string, unknown> }
  | { type: 'step.start'; at: string; data: { step: number; maxSteps: number } }
  | { type: 'tool.call'; at: string; data: { step: number; toolName: string } }
  | { type: 'tool.result'; at: string; data: { step: number; toolName: string; preview: string } }
  | { type: 'guard.reject'; at: string; data: { step: number; guardId: string } }
  | { type: 'reply.delta'; at: string; data: { chunk: string; done: boolean } }
  | { type: 'run.complete'; at: string; data: AgentResult }
  | { type: 'run.error'; at: string; data: { message: string } };

// #流式事件创建助手
export function createAgentStreamEvent<T extends AgentStreamEvent['type']>(
  type: T,
  data: Extract<AgentStreamEvent, { type: T }>['data'],
): Extract<AgentStreamEvent, { type: T }> {
  return {
    type,
    at: new Date().toISOString(),
    data,
  } as Extract<AgentStreamEvent, { type: T }>;
}

// #答复分片助手
export function chunkReplyText(reply: string, chunkSize = 24): string[] {
  const text = String(reply || '');
  if (!text) return [];
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }
  return chunks;
}
