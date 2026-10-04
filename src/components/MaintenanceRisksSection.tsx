import React, { useState } from 'react';
import { MaintenanceRisk, RepoActivityStats } from '../types';

interface MaintenanceRisksSectionProps {
  risks: MaintenanceRisk[];
  stats: RepoActivityStats;
  onNavigateToRecommendations: () => void;
}

export const MaintenanceRisksSection: React.FC<MaintenanceRisksSectionProps> = ({
  risks,
  stats,
  onNavigateToRecommendations,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');

  const filteredRisks = risks.filter(
    (r) => severityFilter === 'All' || r.severity === severityFilter
  );

  const getSeverityStyle = (severity: MaintenanceRisk['severity']) => {
    if (severity === 'High') return 'text-rose-400';
    if (severity === 'Medium') return 'text-amber-400';
    return 'text-emerald-400';
  };

  return (
    <div className="space-y-8">
      {/* Header & Severity Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            Maintenance Risks &amp; Bottleneck Analysis
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Structural maintenance risks detected from commit distribution, issue staleness, and PR flow.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg self-start">
          {(['All', 'High', 'Medium', 'Low'] as const).map((level) => {
            const active = severityFilter === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => setSeverityFilter(level)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-sky-400 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {level === 'All' ? 'All Severities' : `${level} Severity`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quantitative Risk Indicators Strip */}
      <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-5 grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <div className="text-xs text-slate-400">Primary Maintainer Share</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-100 mt-1">
            {stats.topContributorSharePercent}%
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Single-author commit concentration
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Top 3 Maintainers Share</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-100 mt-1">
            {stats.top3ContributorsSharePercent}%
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Bus factor concentration index
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Stale Sampled Issues (&gt;30d)</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-100 mt-1">
            {stats.staleIssuesSampledCount}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Open issues awaiting recent activity
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Open vs Closed PR Velocity</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-100 mt-1">
            {stats.openPrsSampled} / {stats.mergedOrClosedPrsSampled}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {stats.prMergeRatioPercent}% resolution rate in sample
          </div>
        </div>
      </div>

      {/* Risks List */}
      {filteredRisks.length === 0 ? (
        <div className="border border-slate-800 bg-slate-900/40 rounded-xl p-8 text-center space-y-3">
          <p className="text-sm text-slate-300">No maintenance risks match this severity filter.</p>
          <button
            type="button"
            onClick={() => setSeverityFilter('All')}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg cursor-pointer"
          >
            Show All Risks
          </button>
        </div>
      ) : (
        <div className="border border-slate-800 bg-slate-900/40 rounded-xl divide-y divide-slate-800">
          {filteredRisks.map((risk, index) => (
            <div key={risk.id} className="p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-400">
                  <span className="text-slate-200 font-semibold">0{index + 1}. {risk.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className={`font-semibold ${getSeverityStyle(risk.severity)}`}>
                    Severity: {risk.severity}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Evidence: {risk.metricEvidence}</span>
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-100">{risk.title}</h3>

              <p className="text-sm text-slate-300 leading-relaxed">{risk.description}</p>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800/70">
                <p className="text-xs text-slate-300">
                  <span className="font-semibold text-sky-400">
                    How Contributors Can Help:{' '}
                  </span>
                  {risk.contributorOpportunity}
                </p>
                <button
                  type="button"
                  onClick={onNavigateToRecommendations}
                  className="text-xs font-semibold text-sky-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  See Matched Issues →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
