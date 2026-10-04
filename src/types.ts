export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface RepoMetadata {
  owner: string;
  name: string;
  fullName: string;
  description: string;
  htmlUrl: string;
  stars: number;
  forks: number;
  openIssuesCount: number;
  watchers: number;
  language: string;
  license: string;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  topics: string[];
  hasContributingGuide: boolean;
  hasCodeOfConduct: boolean;
  isPrivate?: boolean;
}

export interface ContributorStat {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  contributions: number;
  sharePercentage: number;
}

export interface GitHubIssueItem {
  number: number;
  title: string;
  body: string;
  htmlUrl: string;
  state: string;
  comments: number;
  createdAt: string;
  updatedAt: string;
  author: string;
  labels: string[];
}

export interface RepoActivityStats {
  recentCommitsCount: number;
  daysSinceLastCommit: number;
  uniqueRecentAuthors: number;
  openPrsSampled: number;
  mergedOrClosedPrsSampled: number;
  prMergeRatioPercent: number;
  avgIssueComments: number;
  staleIssuesSampledCount: number;
  beginnerFriendlyIssuesCount: number;
  topContributorSharePercent: number;
  top3ContributorsSharePercent: number;
}

export interface FileTreeItem {
  path: string;
  type: 'file' | 'dir';
  size?: number;
}

export interface HealthDimension {
  label: string;
  score: number;
  status: 'Nominal' | 'Warning' | 'Critical';
  detail: string;
}

export interface HealthScoreReport {
  overall: number;
  statusLabel: 'Healthy & Active' | 'Moderate Velocity' | 'Triage Backlog' | 'Maintenance Risk';
  summary: string;
  dimensions: {
    commitVelocity: HealthDimension;
    issueResponsiveness: HealthDimension;
    prMergeFlow: HealthDimension;
    documentationQuality: HealthDimension;
    contributorDiversity: HealthDimension;
  };
}

export interface RepositoryInsights {
  architectureOverview: string;
  codebaseStructureSummary: string;
  contributorDynamics: string;
  prAndIssueVelocity: string;
  onboardingReadiness: string;
  keyDirectories: Array<{
    path: string;
    purpose: string;
  }>;
}

export interface MaintenanceRisk {
  id: string;
  title: string;
  category: 'Stale Triage' | 'Bus Factor' | 'Inactive Subsystem' | 'PR Bottleneck' | 'Documentation Gap' | 'Test Coverage';
  severity: 'High' | 'Medium' | 'Low';
  metricEvidence: string;
  description: string;
  contributorOpportunity: string;
}

export interface RecommendedIssue {
  issueNumber: number;
  title: string;
  htmlUrl: string;
  difficulty: 'Beginner' | 'Beginner–Intermediate' | 'Intermediate' | 'Advanced';
  estimatedEffort: string;
  impactScore: number;
  impactLevel: 'High Impact' | 'Medium Impact' | 'Quick Win';
  skills: string[];
  whyThisIssue: string;
  plainExplanation: {
    summary: string;
    technicalContext: string;
    expectedOutcome: string;
  };
  likelyFiles: string[];
}

export interface UserContributionItem {
  id: string | number;
  type: 'pr' | 'issue' | 'commit';
  title: string;
  repoFullName: string;
  number?: number;
  sha?: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  isPrivateRepo?: boolean;
}

export interface UserRepoHistory {
  username: string;
  commitsInRepo: number;
  contributorSharePercent: number;
  prsInRepo: UserContributionItem[];
  issuesInRepo: UserContributionItem[];
  personalizedSummary: string;
}

export interface ContribLensAnalysisResponse {
  repo: RepoMetadata;
  stats: RepoActivityStats;
  contributors: ContributorStat[];
  fileTree: FileTreeItem[];
  openIssues: GitHubIssueItem[];
  healthScore: HealthScoreReport;
  insights: RepositoryInsights;
  maintenanceRisks: MaintenanceRisk[];
  recommendedIssues: RecommendedIssue[];
  analyzedAt: string;
  targetSkillLevel: SkillLevel;
  dataSource: 'github_live' | 'github_cached_snapshot';
  userRepoHistory?: UserRepoHistory | null;
}

export interface ContributionPlan {
  repoFullName: string;
  issueNumber: number;
  issueTitle: string;
  issueUrl: string;
  difficulty: string;
  estimatedEffort: string;
  skills: string[];
  problemBreakdown: {
    whatIsHappening: string;
    rootCauseHypothesis: string;
    acceptanceCriteria: string;
  };
  filesToExamine: Array<{
    path: string;
    role: string;
    whatToInspect: string;
  }>;
  steps: Array<{
    stepNumber: number;
    title: string;
    description: string;
    codeOrCommandHint: string;
    verificationCheck: string;
  }>;
  testingStrategy: {
    testRunnerCommand: string;
    testFileLocations: string[];
    regressionScenarios: string[];
  };
  conceptsToUnderstand: Array<{
    concept: string;
    explanation: string;
  }>;
  prPreparationChecklist: string[];
}

export interface GitHubUserProfile {
  login: string;
  name: string;
  avatarUrl: string;
  htmlUrl: string;
  bio: string;
  company: string;
  location: string;
  publicRepos: number;
  privateRepos: number;
  followers: number;
  following: number;
  createdAt: string;
  authMethod: 'oauth' | 'pat_session';
}

export interface UserAccessibleRepo {
  fullName: string;
  name: string;
  owner: string;
  isPrivate: boolean;
  description: string;
  language: string;
  stars: number;
  openIssuesCount: number;
  updatedAt: string;
  pushedAt: string;
  htmlUrl: string;
  defaultBranch: string;
}

export interface LanguagePreferenceItem {
  language: string;
  repoCount: number;
  percentage: number;
  totalStars: number;
}

export interface DeveloperImprovementItem {
  id: string;
  title: string;
  category:
    | 'Repository Polish'
    | 'Contribution Velocity'
    | 'Documentation & Onboarding'
    | 'Ecosystem Diversity'
    | 'Community Impact';
  priority: 'High Impact' | 'Medium Impact' | 'Quick Win';
  metricEvidence: string;
  currentObservation: string;
  actionableSteps: string;
}

export interface DeveloperAnalysisReport {
  impactScore: number;
  archetype: string;
  executiveSummary: string;
  contributionStyle: string;
  strengths: string[];
  improvements: DeveloperImprovementItem[];
  recommendedNextRepoTypes: string[];
}

export interface UserContributionProfile {
  authenticated: boolean;
  isBrowsedUser?: boolean;
  oauthConfigured: boolean;
  user: GitHubUserProfile;
  accessibleRepos: UserAccessibleRepo[];
  recentPullRequests: UserContributionItem[];
  recentIssues: UserContributionItem[];
  recentCommits: UserContributionItem[];
  languageBreakdown?: LanguagePreferenceItem[];
  developerAnalysis?: DeveloperAnalysisReport;
  stats: {
    totalPrsAuthored: number;
    mergedPrsCount: number;
    openPrsCount: number;
    totalIssuesAuthored: number;
    privateReposCount: number;
    publicReposCount: number;
    totalStarsEarned?: number;
    topLanguages: string[];
  };
}
