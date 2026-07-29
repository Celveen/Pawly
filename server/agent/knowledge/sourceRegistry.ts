// 科普来源白名单：默认只允许作为真实参考来源使用，不默认授予商业转载/改编权。
// 只有取得明确授权后，才把 status 改为 approved，并补齐授权证据。
export type SourcePolicyStatus = 'approved' | 'reference' | 'blocked';
export type OpenLicenseType = 'CC0-1.0' | 'CC-BY-4.0';
export type OpenLicenseEvidence = { type: OpenLicenseType; url: string; verifiedAt: string; detectedType?: OpenLicenseType | null };

export type SourcePolicy = {
  id: string;
  org: string;
  domains: string[];
  allowedPathPrefixes?: string[];
  status: SourcePolicyStatus;
  commercialUse: boolean;
  derivativeSummary: 'allowed' | 'needs_confirmation' | 'not_allowed';
  fullTextRepublish: boolean;
  mediaRepublish: boolean;
  licenseEvidenceUrl?: string;
  licenseType?: OpenLicenseType;
  attributionRequired: boolean;
  changeNoticeRequired: boolean;
  verifiedAt?: string;
  authorizationBasis: 'explicit_license' | 'written_permission' | 'public_domain' | 'not_verified';
  allowedContentTypes: Array<'summary' | 'quote' | 'full_text'>;
  notes: string;
};

export type AutoPublishDecision = {
  allowed: boolean;
  policy: SourcePolicy | null;
  reasons: string[];
};

// 这些来源是真实的兽医/动物照护资料来源，但在没有明确商业授权前只进入 reference 队列。
export const SOURCE_REGISTRY: SourcePolicy[] = [
  source('rspca', 'RSPCA', ['rspca.org.uk', 'www.rspca.org.uk'], '公开资料可作参考；商业改编权限需单独确认。'),
  source('merck', 'Merck Veterinary Manual', ['merckvetmanual.com', 'www.merckvetmanual.com'], '专业资料可作参考；不默认允许复制或商业改编。'),
  source('wsava', 'WSAVA 世界小动物兽医协会', ['wsava.org'], '指南页面和 PDF 的再利用范围需按具体文件确认。'),
  source('aaha', 'AAHA 美国动物医院协会', ['aaha.org', 'www.aaha.org'], '指南版权和商业使用范围需按具体文件确认。'),
  source('esccap', 'ESCCAP', ['esccap.org', 'www.esccap.org'], '指南版权和商业使用范围需按具体文件确认。'),
  source('aspca', 'ASPCA Animal Poison Control', ['aspca.org', 'www.aspca.org'], '毒物资料只作参考；不得直接复制清单或图片。'),
  source('icatcare', 'International Cat Care', ['icatcare.org'], '猫科照护资料只作参考；商业改编权限需确认。'),
  source('catvets', 'AAFP / Cat Friendly Homes', ['catvets.com'], '指南资料只作参考；商业改编权限需确认。'),
  source('avsab', 'AVSAB', ['avsab.org'], '行为指南只作参考；商业改编权限需确认。'),
  source('vohc', 'VOHC', ['vohc.org', 'www.vohc.org'], '认证名单和 Logo 不得直接复制或暗示背书。'),
  source('aafco', 'AAFCO', ['aafco.org', 'www.aafco.org'], '标准资料只作参考；不得暗示官方认证或背书。'),
  source('heartworm', 'American Heartworm Society', ['heartwormsociety.org', 'www.heartwormsociety.org'], '指南资料只作参考；商业改编权限需确认。'),
  source('pubmed', 'PubMed', ['pubmed.ncbi.nlm.nih.gov'], '仅作为论文索引；正文版权按具体出版商和论文许可确认。'),
  source('sage', 'SAGE Journals', ['journals.sagepub.com'], '论文版权按具体文章许可确认，不默认允许商业改编。'),
  source('vca', 'VCA Animal Hospitals', ['vcahospitals.com'], '宠物健康资料只作参考；商业改编权限需确认。'),
  source('akc', 'American Kennel Club', ['akc.org', 'www.akc.org'], '品种资料只作参考；商业改编权限需确认。'),
  source('unitedspayalliance', 'United Spay Alliance', ['unitedspayalliance.org'], '资料只作参考；商业改编权限需确认。'),
  source('plos', 'PLOS', ['journals.plos.org', 'plos.org'], '仅接受文章页面明确标注 CC BY 的文章；图片、表格和第三方素材需单独核验。'),
  source('bmc', 'BioMed Central', ['biomedcentral.com'], '仅接受文章页面明确标注 CC BY 的文章；图片、表格和第三方素材需单独核验。'),
];

function source(id: string, org: string, domains: string[], notes: string): SourcePolicy {
  return {
    id,
    org,
    domains,
    status: 'reference',
    commercialUse: false,
    derivativeSummary: 'needs_confirmation',
    fullTextRepublish: false,
    mediaRepublish: false,
    authorizationBasis: 'not_verified',
    allowedContentTypes: ['summary'],
    attributionRequired: true,
    changeNoticeRequired: true,
    notes,
  };
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^www\./, '');
}

export function getSourcePolicy(url: string): SourcePolicy | null {
  try {
    const parsed = new URL(url);
    const domain = normalizeDomain(parsed.hostname);
    const path = parsed.pathname || '/';
    return SOURCE_REGISTRY.find((item) =>
      item.domains.some((itemDomain) => normalizeDomain(itemDomain) === domain)
      && (!item.allowedPathPrefixes?.length || item.allowedPathPrefixes.some((prefix) => path.startsWith(prefix))),
    ) || null;
  } catch {
    return null;
  }
}

export function canAutoPublish(url: string, evidence?: OpenLicenseEvidence): boolean {
  return getAutoPublishDecision(url, evidence).allowed;
}

export function getAutoPublishDecision(url: string, evidence?: OpenLicenseEvidence): AutoPublishDecision {
  const policy = getSourcePolicy(url);
  if (!policy) return { allowed: false, policy: null, reasons: ['来源域名或路径未进入白名单'] };

  const reasons: string[] = [];
  const openLicenseVerified = Boolean(
    evidence
    && ['CC0-1.0', 'CC-BY-4.0'].includes(evidence.type)
    && evidence.detectedType === evidence.type
    && /^https:\/\//i.test(evidence.url)
    && /^\d{4}-\d{2}-\d{2}$/.test(evidence.verifiedAt),
  );
  if (!openLicenseVerified) {
    if (policy.status !== 'approved') reasons.push(`来源状态为 ${policy.status}`);
    if (!policy.commercialUse) reasons.push('未确认允许商业使用');
    if (policy.derivativeSummary !== 'allowed') reasons.push('未确认允许改编摘要');
    if (!policy.licenseEvidenceUrl) reasons.push('缺少授权证据链接');
    if (policy.licenseEvidenceUrl && !/^https:\/\//i.test(policy.licenseEvidenceUrl)) reasons.push('授权证据链接必须使用 HTTPS');
    if (!policy.verifiedAt) reasons.push('缺少授权核验日期');
    if (policy.verifiedAt && !/^\d{4}-\d{2}-\d{2}$/.test(policy.verifiedAt)) reasons.push('授权核验日期格式应为 YYYY-MM-DD');
    if (policy.authorizationBasis === 'not_verified') reasons.push('授权依据尚未核验');
    if (!policy.allowedContentTypes.includes('summary')) reasons.push('授权范围不包含摘要');
    if (!policy.licenseType || !['CC0-1.0', 'CC-BY-4.0'].includes(policy.licenseType)) reasons.push('许可证不是允许自动改编的 CC0 或 CC BY 4.0');
  }
  return { allowed: reasons.length === 0, policy, reasons };
}

export function validateSourceReference(ref: { org?: string; title?: string; url?: string }) {
  const errors: string[] = [];
  if (!ref.org?.trim()) errors.push('缺少来源机构');
  if (!ref.title?.trim()) errors.push('缺少来源标题');
  if (!ref.url?.trim()) errors.push('缺少来源链接');
  const policy = ref.url ? getSourcePolicy(ref.url) : null;
  if (ref.url && !policy) errors.push('来源域名未进入白名单');
  if (policy?.status === 'blocked') errors.push('来源已被禁止');
  if (ref.url && !/^https:\/\//i.test(ref.url)) errors.push('来源链接必须使用 HTTPS');
  return { valid: errors.length === 0, errors, policy };
}
