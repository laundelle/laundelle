import { AdminViewTab } from '@laundelle/types';

export type UserGuideCategory =
  | 'Getting Started'
  | 'Core Operations'
  | 'Staff & Plants'
  | 'Catalog & Pricing'
  | 'Finance & Revenue'
  | 'Exceptions & Complaints'
  | 'System & Audit'
  | 'End-to-End Workflows'
  | 'Troubleshooting';

export type PortalTarget = 'admin' | 'manager' | 'both';
export type RoleTarget = 'super_admin' | 'admin' | 'manager';

export interface GuideStep {
  stepNumber: number;
  title: string;
  instruction: string;
  tip?: string;
  caution?: string;
}

export interface GuideField {
  name: string;
  required: boolean;
  format: string;
  description: string;
  example?: string;
}

export interface GuideAction {
  button: string;
  style?: 'primary' | 'secondary' | 'danger' | 'warning' | 'neutral';
  effect: string;
  whenToUse: string;
}

export interface GuideTableInfo {
  columns: string[];
  filters: string[];
  sortAndSearch: string;
  rowActions: string[];
}

export interface GuideStatusInfo {
  status: string;
  label: string;
  meaning: string;
  allowedTransitions?: string[];
  badgeColor?: string;
}

export interface GuideCommonError {
  error: string;
  cause: string;
  resolution: string;
}

export interface UserGuideArticle {
  id: string;
  title: string;
  description: string;
  category: UserGuideCategory;
  portals: PortalTarget[];
  roles: RoleTarget[];
  relatedTab?: AdminViewTab;
  keywords: string[];
  badge?: string;
  iconName?: string;
  
  // Detailed Content Sections
  purpose: string;
  accessRequirements: string;
  navigationPath: string;
  prerequisites: string[];
  steps: GuideStep[];
  fields?: GuideField[];
  actions?: GuideAction[];
  tableInfo?: GuideTableInfo;
  statuses?: GuideStatusInfo[];
  validationRules?: string[];
  successVerification: string;
  commonErrors?: GuideCommonError[];
  securityNotes: string[];
  relatedArticleIds: string[];
}
