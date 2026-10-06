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
    if (severity === 'High') return 'text-red-700';
    if (severity === 'Medium') return 'text-amber-700';
    return 'text-[#15803D]';
  };

  return (
    <div className="space-y-8">
      {/* Header & Severity Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B0F0D]">
            Maintenance Risks &amp; Bottleneck Analysis
          </h2>
          <p className="text-sm text-[#64748B] mt-0.5">
            Structural maintenance risks detected from commit distribution, issue staleness, and PR flow.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#F1F5F3] border border-[#DDE5DF] rounded-lg self-start">
          {(['All', 'High', 'Medium', 'Low'] as const).map((level) => {
            const active = severityFilter === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => setSeverityFilter(level)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#15803D] text-white font-semibold'
                    : 'text-[#64748B] hover:text-[#111827]'
                }`}
              >
                {level === 'All' ? 'All Severities' : `${level} Severity`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quantitative Risk Indicators Strip */}
      <div className="border border-[#DDE5DF] bg-white rounded-xl p-5 grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <div className="text-xs text-[#64748B]">Primary Maintainer Share</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#0B0F0D] mt-1">
            {stats.topContributorSharePercent}%
          </div>
          <div className="text-xs text-[#64748B] mt-0.5">
            Single-author commit concentration
          </div>
        </div>
        <div>
          <div className="text-xs text-[#64748B]">Top 3 Maintainers Share</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#0B0F0D] mt-1">
            {stats.top3ContributorsSharePercent}%
          </div>
          <div className="text-xs text-[#64748B] mt-0.5">
            Bus factor concentration index
          </div>
        </div>
        <div>
          <div className="text-xs text-[#64748B]">Stale Sampled Issues (&gt;30d)</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#0B0F0D] mt-1">
            {stats.staleIssuesSampledCount}
          </div>
          <div className="text-xs text-[#64748B] mt-0.5">
            Open issues awaiting recent activity
          </div>
        </div>
        <div>
          <div className="text-xs text-[#64748B]">Open vs Closed PR Velocity</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#0B0F0D] mt-1">
            {stats.openPrsSampled} / {stats.mergedOrClosedPrsSampled}
          </div>
          <div className="text-xs text-[#64748B] mt-0.5">
            {stats.prMergeRatioPercent}% resolution rate in sample
          </div>
        </div>
      </div>

      {/* Risks List */}
      {filteredRisks.length === 0 ? (
        <div className="border border-[#DDE5DF] bg-white rounded-xl p-8 text-center space-y-3">
          <p className="text-sm text-[#111827]">No maintenance risks match this severity filter.</p>
          <button
            type="button"
            onClick={() => setSeverityFilter('All')}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] rounded-lg cursor-pointer"
          >
            Show All Risks
          </button>
        </div>
      ) : (
        <div className="border border-[#DDE5DF] bg-white rounded-xl divide-y divide-[#DDE5DF]">
          {filteredRisks.map((risk, index) => (
            <div key={risk.id} className="p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[#64748B]">
                  <span className="text-[#0B0F0D] font-semibold">0{index + 1}. {risk.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className={`font-semibold ${getSeverityStyle(risk.severity)}`}>
                    Severity: {risk.severity}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Evidence: {risk.metricEvidence}</span>
                </div>
              </div>

              <h3 className="text-base font-bold text-[#0B0F0D]">{risk.title}</h3>

              <p className="text-sm text-[#111827] leading-relaxed">{risk.description}</p>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#DDE5DF]">
                <p className="text-xs text-[#111827]">
                  <span className="font-semibold text-[#15803D]">
                    How Contributors Can Help:{' '}
                  </span>
                  {risk.contributorOpportunity}
                </p>
                <button
                  type="button"
                  onClick={onNavigateToRecommendations}
                  className="text-xs font-semibold text-[#15803D] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
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
