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
    if (status === 'Nominal') return 'text-[#15803D] font-semibold';
    if (status === 'Warning') return 'text-amber-700 font-semibold';
    return 'text-red-700 font-semibold';
  };

  const getBarColor = (status: string) => {
    if (status === 'Nominal') return 'bg-[#15803D]';
    if (status === 'Warning') return 'bg-amber-600';
    return 'bg-red-600';
  };

  return (
    <div className="space-y-10">
      {/* Linked User's Specific Contribution Footprint in This Repository */}
      {userRepoHistory && (
        <div className="border border-[#15803D]/30 bg-white rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono tabular-nums text-[#15803D]">
              <span className="font-semibold">Your Contribution Footprint in {report.repo.fullName}</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#0B0F0D] font-semibold">@{userRepoHistory.username}</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#111827]">{userRepoHistory.commitsInRepo} commits ({userRepoHistory.contributorSharePercent}% share)</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#111827]">{userRepoHistory.prsInRepo.length} sampled PRs</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#111827]">{userRepoHistory.issuesInRepo.length} open issues</span>
            </div>
            <p className="text-xs text-[#64748B]">{userRepoHistory.personalizedSummary}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('profile')}
            className="px-3.5 py-2 text-xs font-semibold text-[#111827] bg-[#F8FAF9] border border-[#DDE5DF] hover:border-[#15803D] hover:text-[#15803D] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            View My Full Contribution History →
          </button>
        </div>
      )}

      {/* Top Spotlight: Best Contribution Recommendation */}
      {topRecommendation && (
        <div className="border border-[#166534]/45 border-t-4 border-t-[#14532D] bg-white/95 rounded-xl p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono tabular-nums text-[#15803D]">
                <span className="font-semibold">Best Contribution Recommendation</span>
                <span aria-hidden="true">·</span>
                <span>Issue #{topRecommendation.issueNumber}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#111827]">Difficulty: {topRecommendation.difficulty}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#111827]">Estimated effort: {topRecommendation.estimatedEffort}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#166534] font-semibold">
                  {topRecommendation.impactLevel} ({topRecommendation.impactScore}/100)
                </span>
              </div>

              <h3 className="text-xl font-bold text-[#0B0F0D] [text-wrap:balance]">
                Issue #{topRecommendation.issueNumber} — {topRecommendation.title}
              </h3>

              <p className="text-xs text-[#64748B]">
                This issue closely matches your current skills and provides a realistic starting point for your first contribution.
              </p>

              <div className="text-xs font-mono text-[#64748B]">
                <span className="text-[#111827] font-semibold">Skills: </span>
                {topRecommendation.skills.join(' · ')}
              </div>

              <div className="pt-1 space-y-1.5 text-sm text-[#111827]">
                <p>
                  <span className="font-semibold text-[#0B0F0D]">Why this issue? </span>
                  {topRecommendation.whyThisIssue}
                </p>
                <p className="text-[#64748B]">
                  <span className="font-semibold text-[#111827]">Issue Summary: </span>
                  {topRecommendation.plainExplanation.summary}
                </p>
              </div>

              {topRecommendation.likelyFiles.length > 0 && (
                <div className="pt-1 text-xs font-mono text-[#15803D]">
                  <span className="text-[#111827] font-semibold">Target files: </span>
                  {topRecommendation.likelyFiles.join(' · ')}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <button
                type="button"
                disabled={isGeneratingPlan}
                onClick={() => onSelectIssueForPlan(topRecommendation)}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <span>
                  {isGeneratingPlan ? 'Generating Plan...' : 'Generate Contribution Plan'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('recommendations')}
                className="px-4 py-2 text-xs font-semibold text-[#111827] bg-[#F8FAF9] border border-[#DDE5DF] hover:border-[#15803D] hover:text-[#15803D] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                View All {recommendedIssues.length} Matched Issues
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 01: Project Health & Maintenance */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-5 bg-[#15803D] rounded-full shrink-0" />
            <h2 className="text-lg font-semibold text-[#0B0F0D]">
              Project Health &amp; Maintenance
            </h2>
          </div>
          <span className="text-xs font-mono tabular-nums text-[#64748B]">
            Target Profile: {report.targetSkillLevel} Contributor
          </span>
        </div>

        <div className="border border-[#166534]/45 border-t-2 border-t-[#14532D] bg-white/95 rounded-xl divide-y divide-[#166534]/30">
          {/* Top Health Score Row */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-4 flex items-baseline gap-4 lg:border-r lg:border-[#166534]/30 lg:pr-6">
              <div className="text-5xl font-bold font-mono tabular-nums text-[#0B0F0D]">
                {healthScore.overall}
                <span className="text-xl text-[#64748B] font-normal">/100</span>
              </div>
              <div>
                <div className="text-xs font-mono text-[#64748B]">Project Health Status</div>
                <div className="text-sm font-semibold text-[#15803D] mt-0.5">
                  {healthScore.statusLabel}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <p className="text-sm text-[#111827] leading-relaxed">{healthScore.summary}</p>
            </div>
          </div>

          {/* 5 Health Dimensions Breakdown */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
            {dimensionsList.map((dim) => (
              <div key={dim.label} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-[#111827] truncate">{dim.label}</span>
                  <span className="text-xs font-mono tabular-nums font-semibold text-[#0B0F0D]">
                    {dim.score}/100
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#F1F5F3] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getBarColor(dim.status)}`}
                    style={{ width: `${Math.min(100, Math.max(5, dim.score))}%` }}
                  />
                </div>
                <div className="text-xs font-mono">
                  <span className={getStatusTextColor(dim.status)}>{dim.status}</span>
                </div>
                <p className="text-xs text-[#64748B] leading-normal">{dim.detail}</p>
              </div>
            ))}
          </div>

          {/* Quantitative Activity Strip */}
          <div className="px-6 py-4 bg-[#F8FAF9] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <div className="text-xs text-[#64748B]">Recent Development</div>
              <div className="text-base font-semibold font-mono tabular-nums text-[#0B0F0D] mt-0.5">
                {stats.recentCommitsCount} commits
              </div>
            </div>
            <div>
              <div className="text-xs text-[#64748B]">Last Commit Activity</div>
              <div className="text-base font-semibold font-mono tabular-nums text-[#0B0F0D] mt-0.5">
                {stats.daysSinceLastCommit === 0 ? 'Today' : `${stats.daysSinceLastCommit}d ago`}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#64748B]">PR Merge Ratio</div>
              <div className="text-base font-semibold font-mono tabular-nums text-[#0B0F0D] mt-0.5">
                {stats.prMergeRatioPercent}%
              </div>
            </div>
            <div>
              <div className="text-xs text-[#64748B]">Avg Issue Discussion</div>
              <div className="text-base font-semibold font-mono tabular-nums text-[#0B0F0D] mt-0.5">
                {stats.avgIssueComments} comments
              </div>
            </div>
            <div>
              <div className="text-xs text-[#64748B]">Top Maintainer Share</div>
              <div className="text-base font-semibold font-mono tabular-nums text-[#0B0F0D] mt-0.5">
                {stats.topContributorSharePercent}%
              </div>
            </div>
            <div>
              <div className="text-xs text-[#64748B]">Documentation</div>
              <div className="text-base font-semibold font-mono tabular-nums text-[#15803D] mt-0.5">
                {report.repo.hasContributingGuide ? 'Guide Present' : 'Standard README'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 02: Repository Insights */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-5 bg-[#15803D] rounded-full shrink-0" />
            <h2 className="text-lg font-semibold text-[#0B0F0D]">
              Repository Insights
            </h2>
          </div>
          <span className="text-xs font-mono text-[#64748B]">
            Architecture · Codebase Organization · Contributor Activity · Testing
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Cols: Architectural Analysis & Key Directories */}
          <div className="lg:col-span-7 border border-[#166534]/45 bg-white/95 rounded-xl divide-y divide-[#166534]/30">
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[#0B0F0D] mb-1">
                  Architecture
                </h3>
                <p className="text-sm text-[#111827] leading-relaxed">
                  {insights.architectureOverview}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#0B0F0D] mb-1">
                  Codebase Organization &amp; Testing
                </h3>
                <p className="text-sm text-[#111827] leading-relaxed">
                  {insights.codebaseStructureSummary} {insights.onboardingReadiness}
                </p>
              </div>
            </div>

            {/* Key Directories Table */}
            <div className="p-6">
              <h3 className="text-sm font-semibold text-[#0B0F0D] mb-3">
                Key Directories &amp; Core Modules
              </h3>
              <div className="divide-y divide-[#DDE5DF] border-t border-b border-[#DDE5DF]">
                {insights.keyDirectories.map((dir) => (
                  <div
                    key={dir.path}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 text-xs"
                  >
                    <span className="font-mono text-[#15803D] font-semibold shrink-0">{dir.path}</span>
                    <span className="text-[#111827] sm:text-right">{dir.purpose}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Contributor Activity & Maintenance Risks */}
          <div className="lg:col-span-5 border border-[#166534]/45 bg-white/95 rounded-xl divide-y divide-[#166534]/30">
            <div className="p-6">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#0B0F0D]">
                  Contributor Activity
                </h3>
                <span className="text-xs font-mono tabular-nums text-[#64748B]">
                  Top 3 Share: {stats.top3ContributorsSharePercent}%
                </span>
              </div>
              <p className="text-xs text-[#64748B] mb-4 leading-relaxed">
                {insights.contributorDynamics}
              </p>

              <div className="divide-y divide-[#DDE5DF] border-t border-b border-[#DDE5DF]">
                {contributors.slice(0, 5).map((contributor) => (
                  <div
                    key={contributor.login}
                    className="py-2.5 flex items-center justify-between gap-4 text-xs"
                  >
                    <a
                      href={contributor.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[#111827] hover:text-[#15803D] font-medium transition-colors truncate"
                    >
                      @{contributor.login}
                    </a>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-24 h-1.5 bg-[#F1F5F3] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#15803D]"
                          style={{ width: `${Math.min(100, contributor.sharePercentage)}%` }}
                        />
                      </div>
                      <span className="font-mono tabular-nums text-[#64748B] w-24 text-right">
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
                <h3 className="text-sm font-semibold text-[#0B0F0D]">
                  Maintenance Risks ({maintenanceRisks.length})
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigateTab('risks')}
                  className="text-xs font-semibold text-[#15803D] hover:underline cursor-pointer"
                >
                  Inspect Full Audit
                </button>
              </div>
              <div className="divide-y divide-[#DDE5DF]">
                {maintenanceRisks.slice(0, 3).map((risk) => (
                  <div key={risk.id} className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                      <span className="text-[#0B0F0D] font-sans font-medium truncate">
                        {risk.title}
                      </span>
                      <span
                        className={`shrink-0 font-semibold ${
                          risk.severity === 'High'
                            ? 'text-red-700'
                            : risk.severity === 'Medium'
                            ? 'text-amber-700'
                            : 'text-[#15803D]'
                        }`}
                      >
                        {risk.severity} Risk
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] line-clamp-2">{risk.metricEvidence}</p>
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
