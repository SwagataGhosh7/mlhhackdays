import React, { useState } from 'react';
import { ArrowRight, ExternalLink, Search } from 'lucide-react';
import { RecommendedIssue } from '../types';

interface RecommendedIssuesSectionProps {
  recommendedIssues: RecommendedIssue[];
  activePlanIssueNumber: number | null;
  onSelectIssueForPlan: (issue: RecommendedIssue) => void;
  isGeneratingPlan: boolean;
}

export const RecommendedIssuesSection: React.FC<RecommendedIssuesSectionProps> = ({
  recommendedIssues,
  activePlanIssueNumber,
  onSelectIssueForPlan,
  isGeneratingPlan,
}) => {
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filterOptions = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  const filteredIssues = recommendedIssues.filter((issue) => {
    const matchesDiff =
      difficultyFilter === 'All' ||
      issue.difficulty.toLowerCase().includes(difficultyFilter.toLowerCase());
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      issue.title.toLowerCase().includes(q) ||
      String(issue.issueNumber).includes(q) ||
      issue.skills.some((s) => s.toLowerCase().includes(q)) ||
      issue.likelyFiles.some((f) => f.toLowerCase().includes(q));
    return matchesDiff && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Interactive Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B0F0D]">
            Best Contribution Recommendations
          </h2>
          <p className="text-sm text-[#64748B] mt-0.5">
            Issues matched to your skill profile and ranked by scope clarity, codebase locality, and maintainer impact.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by skill, file, or #..."
              aria-label="Filter recommended issues"
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#DDE5DF] rounded-lg text-[#111827] placeholder:text-[#64748B] focus:outline-none focus:border-[#15803D]"
            />
          </div>

          {/* Interactive Difficulty Filter Control */}
          <div className="flex items-center gap-1 p-1 bg-[#F1F5F3] border border-[#DDE5DF] rounded-lg">
            {filterOptions.map((option) => {
              const active = difficultyFilter === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDifficultyFilter(option)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#15803D] text-white font-semibold'
                      : 'text-[#64748B] hover:text-[#111827]'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredIssues.length === 0 ? (
        <div className="border border-[#DDE5DF] bg-white rounded-xl p-10 text-center space-y-3">
          <p className="text-sm text-[#111827] font-medium">
            No recommended issues match the current filter criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setDifficultyFilter('All');
              setSearchQuery('');
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#15803D] rounded-lg hover:bg-[#166534] transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredIssues.map((issue, idx) => {
            const isCurrentPlan = activePlanIssueNumber === issue.issueNumber;
            return (
              <article
                key={issue.issueNumber}
                className={`border rounded-xl transition-colors divide-y divide-[#DDE5DF] bg-white ${
                  idx === 0
                    ? 'border-[#15803D]/50'
                    : 'border-[#DDE5DF]'
                }`}
              >
                {/* Top Metadata & Title */}
                <div className="p-6 flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="space-y-2.5 max-w-3xl">
                    {/* Unboxed Metadata Line (Zero-Pill Discipline) */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono tabular-nums text-[#64748B]">
                      <span className="text-[#15803D] font-semibold">
                        0{idx + 1}. Issue #{issue.issueNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#111827]">Difficulty: {issue.difficulty}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#111827]">
                        Estimated effort: {issue.estimatedEffort}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#166534] font-semibold">
                        {issue.impactLevel} (Score: {issue.impactScore}/100)
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-[#0B0F0D] [text-wrap:balance]">
                      Issue #{issue.issueNumber} — {issue.title}
                    </h3>

                    {/* Unboxed Skills Line */}
                    <div className="text-xs font-mono text-[#64748B]">
                      <span className="text-[#111827] font-semibold">Required skills: </span>
                      {issue.skills.join(' · ')}
                    </div>

                    {/* Why This Issue */}
                    <p className="text-sm text-[#111827] pt-1">
                      <span className="font-semibold text-[#0B0F0D]">Why this issue? </span>
                      {issue.whyThisIssue}
                    </p>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="flex flex-row lg:flex-col items-stretch gap-2.5 shrink-0">
                    <button
                      type="button"
                      disabled={isGeneratingPlan}
                      onClick={() => onSelectIssueForPlan(issue)}
                      className="px-4 py-2.5 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      <span>
                        {isCurrentPlan
                          ? 'View Active Plan'
                          : isGeneratingPlan
                          ? 'Generating Plan...'
                          : 'Generate Contribution Plan'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <a
                      href={issue.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-xs font-medium text-[#111827] bg-[#F8FAF9] border border-[#DDE5DF] hover:border-[#15803D] hover:text-[#15803D] rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <span>GitHub Issue</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Bottom Issue Explanation Grid */}
                <div className="p-6 bg-[#F8FAF9] grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[#0B0F0D]">
                      Issue Explanation (Plain English)
                    </div>
                    <p className="text-xs text-[#111827] leading-relaxed">
                      {issue.plainExplanation.summary}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[#0B0F0D]">
                      Technical Context &amp; Subsystem
                    </div>
                    <p className="text-xs text-[#111827] leading-relaxed">
                      {issue.plainExplanation.technicalContext}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[#0B0F0D]">
                      Expected Contribution &amp; Target Files
                    </div>
                    <p className="text-xs text-[#111827] leading-relaxed">
                      {issue.plainExplanation.expectedOutcome}
                    </p>
                    {issue.likelyFiles.length > 0 && (
                      <div className="pt-1.5 text-xs font-mono text-[#15803D] font-medium">
                        Files: {issue.likelyFiles.join(' · ')}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
