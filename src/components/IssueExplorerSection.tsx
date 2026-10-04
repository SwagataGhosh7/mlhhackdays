import React, { useState } from 'react';
import { ExternalLink, Search, ArrowRight } from 'lucide-react';
import { FileTreeItem, GitHubIssueItem } from '../types';

interface IssueExplorerSectionProps {
  openIssues: GitHubIssueItem[];
  fileTree: FileTreeItem[];
  onGeneratePlanFromRawIssue: (issue: GitHubIssueItem) => void;
  isGeneratingPlan: boolean;
}

export const IssueExplorerSection: React.FC<IssueExplorerSectionProps> = ({
  openIssues,
  fileTree,
  onGeneratePlanFromRawIssue,
  isGeneratingPlan,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLabel, setSelectedLabel] = useState<string>('All');
  const [fileFilter, setFileFilter] = useState<string>('');

  // Collect top unique labels
  const allLabels = Array.from(
    new Set(openIssues.flatMap((i) => i.labels))
  ).slice(0, 6);

  const filteredIssues = openIssues.filter((issue) => {
    const matchesLabel =
      selectedLabel === 'All' || issue.labels.includes(selectedLabel);
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      issue.title.toLowerCase().includes(q) ||
      String(issue.number).includes(q) ||
      issue.author.toLowerCase().includes(q) ||
      issue.labels.some((l) => l.toLowerCase().includes(q));
    return matchesLabel && matchesQuery;
  });

  const filteredFiles = fileTree.filter(
    (f) => !fileFilter.trim() || f.path.toLowerCase().includes(fileFilter.trim().toLowerCase())
  );

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch {
      return iso.slice(0, 10);
    }
  };

  return (
    <div className="space-y-10">
      {/* Live Open Issues Table */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              Open GitHub Issues Explorer ({openIssues.length} Sampled)
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Click “Generate Plan” on any open issue to build a custom step-by-step contribution roadmap.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search issue #, title, author..."
                aria-label="Search open issues"
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            {allLabels.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSelectedLabel('All')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedLabel === 'All'
                      ? 'bg-sky-400 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  All
                </button>
                {allLabels.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setSelectedLabel(label)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedLabel === label
                        ? 'bg-sky-400 text-slate-950 font-semibold'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* High-Density Data Table */}
        <div className="border border-slate-800 bg-slate-900/40 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-mono text-slate-400">
                  <th className="py-3 px-4 w-20">Issue #</th>
                  <th className="py-3 px-4">Title &amp; Unboxed Labels</th>
                  <th className="py-3 px-4 w-28">Author</th>
                  <th className="py-3 px-4 w-24 text-right">Comments</th>
                  <th className="py-3 px-4 w-28 text-right">Updated</th>
                  <th className="py-3 px-4 w-44 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {filteredIssues.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No open issues match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredIssues.map((issue) => (
                    <tr
                      key={issue.number}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono tabular-nums text-sky-400 font-medium align-top">
                        #{issue.number}
                      </td>
                      <td className="py-3 px-4 align-top space-y-1">
                        <div className="font-medium text-slate-100 text-sm">
                          {issue.title}
                        </div>
                        {issue.labels.length > 0 && (
                          <div className="text-xs font-mono text-slate-400">
                            {issue.labels.join(' · ')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 align-top">
                        @{issue.author}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-300 align-top">
                        {issue.comments}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-400 align-top">
                        {formatDate(issue.updatedAt)}
                      </td>
                      <td className="py-3 px-4 text-right align-top">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isGeneratingPlan}
                            onClick={() => onGeneratePlanFromRawIssue(issue)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-60 rounded-md transition-colors inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                          >
                            <span>Generate Plan</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <a
                            href={issue.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                            title="View on GitHub"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Repository Codebase File Tree Explorer */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Repository File Tree &amp; Module Paths ({fileTree.length} Indexed Paths)
            </h3>
            <p className="text-xs text-slate-400">
              Actual file paths indexed from the default branch used to ground AI contribution plans.
            </p>
          </div>
          <input
            type="text"
            value={fileFilter}
            onChange={(e) => setFileFilter(e.target.value)}
            placeholder="Filter file paths..."
            aria-label="Filter repository file paths"
            className="px-3 py-1.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
          />
        </div>

        <div className="border border-slate-800 bg-slate-900/40 rounded-xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-xs font-mono">
            {filteredFiles.map((item) => (
              <div
                key={item.path}
                className="py-1 border-b border-slate-800/50 flex items-center justify-between gap-2 truncate"
              >
                <span className="text-slate-300 truncate">{item.path}</span>
                <span className="text-slate-500 shrink-0">{item.type}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
