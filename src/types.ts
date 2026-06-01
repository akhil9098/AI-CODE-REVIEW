export interface CodeBug {
  id: string;
  lineNumber?: number;
  lineRange?: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  originalSnippet: string;
  fixedSnippet: string;
  reason?: string;
}

export interface SecurityIssue {
  id: string;
  vulnType: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  lineNumber?: number;
  mitigation: string;
  sampleSafeCode?: string;
}

export interface PerformanceImprovement {
  id: string;
  impact: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  originalCode: string;
  improvedCode: string;
}

export interface MetricScore {
  name: string;
  score: number;
  description: string;
}

export interface ReviewResponse {
  overallScore: number;
  summary: string;
  bugs: CodeBug[];
  securityIssues: SecurityIssue[];
  performanceImprovements: PerformanceImprovement[];
  metrics: MetricScore[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SavedReview {
  id: string;
  title: string;
  timestamp: string;
  language: string;
  code: string;
  report: ReviewResponse;
}
