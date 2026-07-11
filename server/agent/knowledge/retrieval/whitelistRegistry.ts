import type { KnowledgeEvidenceType, KnowledgeSpeciesScope, KnowledgeTopicDomainScope, KnowledgeTopicScope } from '../types';

// #白名单来源结构
export interface WhitelistKnowledgeSource {
  id: string;
  source: string;
  domain: string;
  title: string;
  url: string;
  evidenceType: KnowledgeEvidenceType;
  speciesScope: KnowledgeSpeciesScope;
  breedScopes?: string[];
  topicScopes: KnowledgeTopicScope[];
  topicDomainScopes?: KnowledgeTopicDomainScope[];
  snippet: string;
}

// 白名单来源注册表：先做人工筛选与稳定映射，避免实时抓网带来的噪声和不稳定。
// #白名单来源注册表
export const WHITELIST_KNOWLEDGE_SOURCES: WhitelistKnowledgeSource[] = [
  {
    id: 'wsava-nutrition',
    source: 'WSAVA',
    domain: 'wsava.org',
    title: 'Global Nutrition Guidelines',
    url: 'https://wsava.org/global-guidelines/global-nutrition-guidelines/',
    evidenceType: 'guideline',
    speciesScope: 'generic',
    topicScopes: ['feeding', 'weight', 'general_health'],
    topicDomainScopes: ['nutrition', 'preventive_care'],
    snippet: '白名单来源定位：generic / feeding, weight, general_health',
  },
  {
    id: 'aaha-senior-dog',
    source: 'AAHA',
    domain: 'aaha.org',
    title: 'Senior Care Guidelines for Dogs and Cats',
    url: 'https://www.aaha.org/resources/2019-aaha-canine-and-feline-life-stage-guidelines/',
    evidenceType: 'guideline',
    speciesScope: 'generic',
    topicScopes: ['feeding', 'general_health', 'weight'],
    topicDomainScopes: ['nutrition', 'senior_care', 'preventive_care'],
    snippet: '白名单来源定位：generic / feeding, general_health, weight',
  },
  {
    id: 'merck-vomiting-dogs',
    source: 'Merck Veterinary Manual',
    domain: 'merckvetmanual.com',
    title: 'Vomiting in Small Animals',
    url: 'https://www.merckvetmanual.com/digestive-system/gastrointestinal-disorders-of-small-animals/vomiting-in-small-animals',
    evidenceType: 'hospital_reference',
    speciesScope: 'generic',
    topicScopes: ['vomit', 'general_health'],
    topicDomainScopes: ['digestive', 'preventive_care'],
    snippet: '白名单来源定位：generic / vomit, general_health',
  },
  {
    id: 'vin-veterinarypartner-vomiting',
    source: 'Veterinary Partner',
    domain: 'veterinarypartner.vin.com',
    title: 'Vomiting in Dogs and Cats',
    url: 'https://veterinarypartner.vin.com/default.aspx?pid=19239&id=4951489',
    evidenceType: 'hospital_reference',
    speciesScope: 'generic',
    topicScopes: ['vomit', 'general_health'],
    topicDomainScopes: ['digestive', 'preventive_care'],
    snippet: '白名单来源定位：generic / vomit, general_health',
  },
  {
    id: 'vca-ear-infections-dogs',
    source: 'VCA Hospitals',
    domain: 'vcahospitals.com',
    title: 'Ear Infections in Dogs',
    url: 'https://vcahospitals.com/know-your-pet/ear-infections-in-dogs-otitis-externa',
    evidenceType: 'hospital_reference',
    speciesScope: 'dog',
    topicScopes: ['ear', 'general_health'],
    topicDomainScopes: ['ear', 'preventive_care'],
    snippet: '白名单来源定位：dog / ear, general_health',
  },
  {
    id: 'vca-vomiting-dogs',
    source: 'VCA Hospitals',
    domain: 'vcahospitals.com',
    title: 'Vomiting in Dogs',
    url: 'https://vcahospitals.com/know-your-pet/vomiting-in-dogs',
    evidenceType: 'hospital_reference',
    speciesScope: 'dog',
    topicScopes: ['vomit', 'general_health'],
    topicDomainScopes: ['digestive', 'preventive_care'],
    snippet: '白名单来源定位：dog / vomit, general_health',
  },
  {
    id: 'vca-vomiting-cats',
    source: 'VCA Hospitals',
    domain: 'vcahospitals.com',
    title: 'Vomiting in Cats',
    url: 'https://vcahospitals.com/know-your-pet/vomiting-in-cats',
    evidenceType: 'hospital_reference',
    speciesScope: 'cat',
    topicScopes: ['vomit', 'general_health'],
    topicDomainScopes: ['digestive', 'preventive_care'],
    snippet: '白名单来源定位：cat / vomit, general_health',
  },
];
