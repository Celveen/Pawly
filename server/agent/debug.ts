// #Agent调试日志结构
export interface AgentDebugLog {
  scope: 'main-agent' | 'knowledge-agent';
  event: string;
  details?: unknown;
}

// #Agent调试日志输出
export function logAgentDebug(entry: AgentDebugLog) {
  const prefix = `[agent][${entry.scope}] ${entry.event}`;
  if (!entry.details || Object.keys(entry.details).length === 0) {
    console.log(prefix);
    return;
  }

  console.log(prefix, formatDetails(entry.details));
}

// #调试信息序列化
function formatDetails(details: unknown) {
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return details;
  }
}
