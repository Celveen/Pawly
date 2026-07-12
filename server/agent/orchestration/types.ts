// #中间结构协议类型
export type AgentEvidencePacketKind = 'knowledge' | 'community' | 'guidance' | 'context';

// #中间结构协议
export interface AgentEvidencePacket {
  kind: AgentEvidencePacketKind;
  sourceTool: string;
  priority: 'high' | 'medium' | 'low';
  canDirectAnswer: boolean;
  shouldBlockRecommendation: boolean;
  summary: string;
  details?: string[];
  sources?: string[];
  cards?: Array<Record<string, unknown>>;
  cautions?: string[];
  metadata?: Record<string, unknown>;
}

// #编排策略决策
export interface OrchestrationDecision {
  allowKnowledge: boolean;
  allowCommunity: boolean;
  allowGuidance: boolean;
  mustIncludeGuidanceWhenRequested: boolean;
  requiresProductToolEvidence: boolean;
  shouldAvoidProposals: boolean;
  responseOrder: AgentEvidencePacketKind[];
  reason: string;
}
