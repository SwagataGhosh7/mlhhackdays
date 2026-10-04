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
          <h2 className="text-xl font-bold text-slate-100">
            Recommended Contributions &amp; AI Issue Explanations
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Curated issues ranked by clarity of scope, educational value, and maintainer impact.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by skill, file, or #..."
              aria-label="Filter recommended issues"
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          {/* Interactive Difficulty Filter Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            {filterOptions.map((option) => {
              const active = difficultyFilter === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDifficultyFilter(option)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-sky-400 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-100'
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
        <div className="border border-slate-800 bg-slate-900/40 rounded-xl p-10 text-center space-y-3">
          <p className="text-sm text-slate-300 font-medium">
            No recommended issues match the current filter criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setDifficultyFilter('All');
              setSearchQuery('');
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors cursor-pointer"
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
                className={`border rounded-xl transition-colors divide-y divide-slate-800/90 ${
                  idx === 0
                    ? 'border-sky-500/50 bg-slate-900/70'
                    : 'border-slate-800 bg-slate-900/40'
                }`}
              >
                {/* Top Metadata & Title */}
                <div className="p-6 flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="space-y-2.5 max-w-3xl">
                    {/* Unboxed Metadata Line (Zero-Pill Discipline) */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono tabular-nums text-slate-400">
                      <span className="text-sky-400 font-semibold">
                        0{idx + 1}. Issue #{issue.issueNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-200">Difficulty: {issue.difficulty}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-200">
                        Estimated effort: {issue.estimatedEffort}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-400">
                        {issue.impactLevel} (Score: {issue.impactScore}/100)
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-100 [text-wrap:balance]">
                      Issue #{issue.issueNumber} — {issue.title}
                    </h3>

                    {/* Unboxed Skills Line */}
                    <div className="text-xs font-mono text-slate-400">
                      <span className="text-slate-300 font-semibold">Required skills: </span>
                      {issue.skills.join(' · ')}
                    </div>

                    {/* Why This Issue */}
                    <p className="text-sm text-slate-300 pt-1">
                      <span className="font-semibold text-slate-100">Why this issue? </span>
                      {issue.whyThisIssue}
                    </p>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="flex flex-row lg:flex-col items-stretch gap-2.5 shrink-0">
                    <button
                      type="button"
                      disabled={isGeneratingPlan}
                      onClick={() => onSelectIssueForPlan(issue)}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
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
                      className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-950 border border-slate-800 hover:border-slate-600 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <span>GitHub Issue</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Bottom AI Issue Explanation Grid */}
                <div className="p-6 bg-slate-950/40 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-200">
                      AI Issue Explanation (Plain English)
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {issue.plainExplanation.summary}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-200">
                      Technical Context &amp; Subsystem
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {issue.plainExplanation.technicalContext}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-200">
                      Expected Contribution &amp; Likely Files
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {issue.plainExplanation.expectedOutcome}
                    </p>
                    {issue.likelyFiles.length > 0 && (
                      <div className="pt-1.5 text-xs font-mono text-sky-400">
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
