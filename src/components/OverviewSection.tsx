import React from 'react';
import { ArrowRight } from 'lucide-react';
import {
  ContribLensAnalysisResponse,
  HealthDimension,
  RecommendedIssue,
} from '../types';

interface OverviewSectionProps {
  report: ContribLensAnalysisResponse;
  onSelectIssueForPlan: (issue: RecommendedIssue) => void;
  onNavigateTab: (tab: 'recommendations' | 'plan' | 'risks' | 'issues' | 'profile') => void;
  isGeneratingPlan: boolean;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  report,
  onSelectIssueForPlan,
  onNavigateTab,
  isGeneratingPlan,
}) => {
  const { healthScore, stats, insights, contributors, recommendedIssues, maintenanceRisks, userRepoHistory } = report;
  const topRecommendation = recommendedIssues[0];

  const dimensionsList: HealthDimension[] = [
    healthScore.dimensions.commitVelocity,
    healthScore.dimensions.issueResponsiveness,
    healthScore.dimensions.prMergeFlow,
    healthScore.dimensions.documentationQuality,
    healthScore.dimensions.contributorDiversity,
  ];

  const getStatusTextColor = (status: string) => {
    if (status === 'Nominal') return 'text-emerald-400';
    if (status === 'Warning') return 'text-amber-400';
    return 'text-rose-400';
  };

  const getBarColor = (status: string) => {
    if (status === 'Nominal') return 'bg-emerald-400';
    if (status === 'Warning') return 'bg-amber-400';
    return 'bg-rose-400';
  };

  return (
    <div className="space-y-10">
      {/* Linked User's Specific Contribution Footprint in This Repository */}
      {userRepoHistory && (
        <div className="border border-emerald-500/40 bg-slate-900/70 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono tabular-nums text-emerald-400">
              <span className="font-semibold">Your Contribution Footprint in {report.repo.fullName}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-200">@{userRepoHistory.username}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-300">{userRepoHistory.commitsInRepo} commits ({userRepoHistory.contributorSharePercent}% share)</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-300">{userRepoHistory.prsInRepo.length} sampled PRs</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-300">{userRepoHistory.issuesInRepo.length} open issues</span>
            </div>
            <p className="text-xs text-slate-300">{userRepoHistory.personalizedSummary}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('profile')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-950 border border-slate-700 hover:border-slate-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            View My Full Contribution History →
          </button>
        </div>
      )}

      {/* Top Spotlight: Best Contribution Match for Target Skill Level */}
      {topRecommendation && (
        <div className="border border-sky-500/40 bg-slate-900/80 rounded-xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono tabular-nums text-sky-400">
                <span className="font-semibold">Best Contribution Recommendation</span>
                <span aria-hidden="true">·</span>
                <span>Issue #{topRecommendation.issueNumber}</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-300">Difficulty: {topRecommendation.difficulty}</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-300">Estimated effort: {topRecommendation.estimatedEffort}</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400">
                  {topRecommendation.impactLevel} ({topRecommendation.impactScore}/100)
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-100 [text-wrap:balance]">
                Issue #{topRecommendation.issueNumber} — {topRecommendation.title}
              </h3>

              <div className="text-xs font-mono text-slate-400">
                <span className="text-slate-300 font-semibold">Skills: </span>
                {topRecommendation.skills.join(' · ')}
              </div>

              <div className="pt-1 space-y-1.5 text-sm text-slate-300">
                <p>
                  <span className="font-semibold text-slate-100">Why this issue? </span>
                  {topRecommendation.whyThisIssue}
                </p>
                <p className="text-slate-400">
                  <span className="font-semibold text-slate-200">AI Explanation: </span>
                  {topRecommendation.plainExplanation.summary}
                </p>
              </div>

              {topRecommendation.likelyFiles.length > 0 && (
                <div className="pt-1 text-xs font-mono text-slate-400">
                  <span className="text-slate-300">Target files: </span>
                  {topRecommendation.likelyFiles.join(' · ')}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <button
                type="button"
                disabled={isGeneratingPlan}
                onClick={() => onSelectIssueForPlan(topRecommendation)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <span>
                  {isGeneratingPlan ? 'Generating Plan...' : 'Generate Contribution Plan'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('recommendations')}
                className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-950 border border-slate-700 hover:border-slate-500 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                View All {recommendedIssues.length} Matched Issues
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 01: Project Health Score & Activity Telemetry */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-100">
            01. Project Health Score &amp; Maintenance Telemetry
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            Target Profile: {report.targetSkillLevel} Contributor
          </span>
        </div>

        <div className="border border-slate-800 bg-slate-900/50 rounded-xl divide-y divide-slate-800">
          {/* Top Health Score Row */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-4 flex items-baseline gap-4 lg:border-r lg:border-slate-800 lg:pr-6">
              <div className="text-5xl font-bold font-mono tabular-nums text-slate-100">
                {healthScore.overall}
                <span className="text-xl text-slate-500 font-normal">/100</span>
              </div>
              <div>
                <div className="text-xs font-mono text-slate-400">Project Health Status</div>
                <div className="text-sm font-semibold text-emerald-400 mt-0.5">
                  {healthScore.statusLabel}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <p className="text-sm text-slate-300 leading-relaxed">{healthScore.summary}</p>
            </div>
          </div>

          {/* 5 Health Dimensions Breakdown */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
            {dimensionsList.map((dim) => (
              <div key={dim.label} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-slate-300 truncate">{dim.label}</span>
                  <span className="text-xs font-mono tabular-nums font-semibold text-slate-100">
                    {dim.score}/100
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getBarColor(dim.status)}`}
                    style={{ width: `${Math.min(100, Math.max(5, dim.score))}%` }}
                  />
                </div>
                <div className="text-xs font-mono">
                  <span className={getStatusTextColor(dim.status)}>{dim.status}</span>
                </div>
                <p className="text-xs text-slate-400 leading-normal">{dim.detail}</p>
              </div>
            ))}
          </div>

          {/* Quantitative Activity Strip */}
          <div className="px-6 py-4 bg-slate-950/50 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <div className="text-xs text-slate-400">Recent Commits</div>
              <div className="text-base font-semibold font-mono tabular-nums text-slate-100 mt-0.5">
                {stats.recentCommitsCount} sampled
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Last Commit Activity</div>
              <div className="text-base font-semibold font-mono tabular-nums text-slate-100 mt-0.5">
                {stats.daysSinceLastCommit === 0 ? 'Today' : `${stats.daysSinceLastCommit}d ago`}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">PR Merge Ratio</div>
              <div className="text-base font-semibold font-mono tabular-nums text-slate-100 mt-0.5">
                {stats.prMergeRatioPercent}%
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Avg Issue Discussion</div>
              <div className="text-base font-semibold font-mono tabular-nums text-slate-100 mt-0.5">
                {stats.avgIssueComments} comments
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Top Maintainer Share</div>
              <div className="text-base font-semibold font-mono tabular-nums text-slate-100 mt-0.5">
                {stats.topContributorSharePercent}%
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Contributing Guide</div>
              <div className="text-base font-semibold font-mono tabular-nums text-slate-100 mt-0.5">
                {report.repo.hasContributingGuide ? 'Present' : 'Missing'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 02: Repository Insights & Architecture */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            02. Repository Insights &amp; Codebase Structure
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Architecture · Modules · Contributor Balance
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Cols: Architectural Analysis & Key Directories */}
          <div className="lg:col-span-7 border border-slate-800 bg-slate-900/50 rounded-xl divide-y divide-slate-800">
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1">
                  Architecture &amp; Execution Flow
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {insights.architectureOverview}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1">
                  Codebase Organization &amp; Onboarding Readiness
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {insights.codebaseStructureSummary} {insights.onboardingReadiness}
                </p>
              </div>
            </div>

            {/* Key Directories Table */}
            <div className="p-6">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">
                Key Directories &amp; High-Leverage Modules
              </h3>
              <div className="divide-y divide-slate-800/80 border-t border-b border-slate-800/80">
                {insights.keyDirectories.map((dir) => (
                  <div
                    key={dir.path}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 text-xs"
                  >
                    <span className="font-mono text-sky-400 font-medium shrink-0">{dir.path}</span>
                    <span className="text-slate-300 sm:text-right">{dir.purpose}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Contributor Distribution & Maintenance Risks Preview */}
          <div className="lg:col-span-5 border border-slate-800 bg-slate-900/50 rounded-xl divide-y divide-slate-800">
            <div className="p-6">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-200">
                  Contributor Concentration
                </h3>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  Top 3 Share: {stats.top3ContributorsSharePercent}%
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                {insights.contributorDynamics}
              </p>

              <div className="divide-y divide-slate-800/80 border-t border-b border-slate-800/80">
                {contributors.slice(0, 5).map((contributor) => (
                  <div
                    key={contributor.login}
                    className="py-2.5 flex items-center justify-between gap-4 text-xs"
                  >
                    <a
                      href={contributor.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-slate-200 hover:text-sky-400 transition-colors truncate"
                    >
                      @{contributor.login}
                    </a>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-400"
                          style={{ width: `${Math.min(100, contributor.sharePercentage)}%` }}
                        />
                      </div>
                      <span className="font-mono tabular-nums text-slate-400 w-24 text-right">
                        {contributor.contributions} ({contributor.sharePercentage}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Maintenance Risks Summary List */}
            <div className="p-6 space-y-3">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-slate-200">
                  Detected Maintenance Risks ({maintenanceRisks.length})
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigateTab('risks')}
                  className="text-xs font-medium text-sky-400 hover:underline cursor-pointer"
                >
                  Inspect Full Audit
                </button>
              </div>
              <div className="divide-y divide-slate-800/80">
                {maintenanceRisks.slice(0, 3).map((risk) => (
                  <div key={risk.id} className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                      <span className="text-slate-200 font-sans font-medium truncate">
                        {risk.title}
                      </span>
                      <span
                        className={`shrink-0 ${
                          risk.severity === 'High'
                            ? 'text-rose-400'
                            : risk.severity === 'Medium'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {risk.severity} Risk
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{risk.metricEvidence}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
