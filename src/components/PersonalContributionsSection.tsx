import React, { useState } from 'react';
import {
  ArrowRight,
  Copy,
  ExternalLink,
  Lock,
  LogOut,
  RefreshCw,
  Search,
} from 'lucide-react';
import { UserContributionProfile } from '../types';

interface PersonalContributionsSectionProps {
  profile: UserContributionProfile | null;
  isLoadingProfile: boolean;
  onConnectGitHub: () => void;
  onDisconnectGitHub: () => void;
  onRefreshProfile: () => void;
  onAnalyzeRepoByName: (fullName: string) => void;
  isAnalyzingRepo: boolean;
}

export const PersonalContributionsSection: React.FC<PersonalContributionsSectionProps> = ({
  profile,
  isLoadingProfile,
  onConnectGitHub,
  onDisconnectGitHub,
  onRefreshProfile,
  onAnalyzeRepoByName,
  isAnalyzingRepo,
}) => {
  const [repoVisibilityFilter, setRepoVisibilityFilter] = useState<'all' | 'private' | 'public'>('all');
  const [repoSearch, setRepoSearch] = useState<string>('');
  const [historyTab, setHistoryTab] = useState<'prs' | 'issues' | 'commits'>('prs');
  const [copiedCallback, setCopiedCallback] = useState<boolean>(false);
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);

  const callbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : 'https://ais-dev-ieg7g7orgwz77ba3sdsqdi-826198571216.asia-southeast1.run.app/auth/callback';

  const handleCopyCallback = () => {
    navigator.clipboard?.writeText(callbackUrl);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch {
      return (iso || '').slice(0, 10);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="border border-slate-800 bg-slate-900/40 rounded-xl p-12 text-center space-y-3">
        <RefreshCw className="w-6 h-6 text-sky-400 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-200">
          Syncing your GitHub account, private repositories, and contribution history...
        </p>
      </div>
    );
  }

  if (!profile || !profile.authenticated) {
    return (
      <div className="space-y-8">
        <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-8 max-w-3xl space-y-6">
          <div className="space-y-2">
            <div className="text-xs font-mono text-sky-400">
              GitHub OAuth &amp; Personal Account Integration
            </div>
            <h2 className="text-2xl font-bold text-slate-100 [text-wrap:balance]">
              Link your GitHub account to analyze private repositories and track your contribution history.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Connecting your personal GitHub account authorizes ContribLens to inspect your private and organization repositories, audit your historical pull requests and commits, and calibrate issue recommendations to your primary programming languages.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80 text-xs">
            <div className="space-y-1">
              <div className="font-semibold text-slate-200">01. Private Repository Access</div>
              <p className="text-slate-400">
                Analyze private and internal repositories with full file tree, issue, and PR telemetry.
              </p>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-slate-200">02. Personal PR &amp; Commit Ledger</div>
              <p className="text-slate-400">
                Track your authored pull requests, open issues, and recent commits across all repositories.
              </p>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-slate-200">03. Repo-Specific Impact</div>
              <p className="text-slate-400">
                See your exact commit share and historical PRs inside any analyzed repository.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onConnectGitHub}
              className="px-5 py-2.5 text-sm font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>Connect GitHub Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* OAuth Callback Configuration Reference */}
          <div className="pt-5 border-t border-slate-800/80 space-y-2">
            <div className="text-xs font-semibold text-slate-300">
              GitHub OAuth App Callback URL (for custom OAuth App configuration)
            </div>
            <div className="flex items-center justify-between gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <code className="text-xs font-mono text-sky-400 truncate">{callbackUrl}</code>
              <button
                type="button"
                onClick={handleCopyCallback}
                className="px-2.5 py-1 text-xs font-mono text-slate-300 hover:text-slate-100 bg-slate-900 border border-slate-700 rounded flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedCallback ? 'Copied' : 'Copy URI'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { user, accessibleRepos, recentPullRequests, recentIssues, recentCommits, stats } = profile;

  const filteredRepos = accessibleRepos.filter((r) => {
    const matchesVis =
      repoVisibilityFilter === 'all' ||
      (repoVisibilityFilter === 'private' && r.isPrivate) ||
      (repoVisibilityFilter === 'public' && !r.isPrivate);
    const q = repoSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      r.fullName.toLowerCase().includes(q) ||
      r.language.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q);
    return matchesVis && matchesSearch;
  });

  const activeHistoryItems =
    historyTab === 'prs'
      ? recentPullRequests
      : historyTab === 'issues'
      ? recentIssues
      : recentCommits;

  return (
    <div className="space-y-10">
      {/* 01. Developer Profile & Personal Contribution Telemetry */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-100">
            01. Linked GitHub Account &amp; Contribution Telemetry
          </h2>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onRefreshProfile}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Activity</span>
            </button>
            <button
              type="button"
              onClick={onDisconnectGitHub}
              className="px-3 py-1.5 text-xs font-medium text-rose-300 bg-slate-900 border border-slate-800 hover:border-rose-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>

        <div className="border border-slate-800 bg-slate-900/50 rounded-xl divide-y divide-slate-800">
          {/* Profile Identity Row */}
          <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {user.avatarUrl && !avatarFailed ? (
                <img
                  src={user.avatarUrl}
                  alt={`${user.login} GitHub avatar`}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="w-14 h-14 rounded-full border border-slate-700 object-cover shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center text-lg font-bold font-mono text-sky-400 shrink-0">
                  {user.login.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold text-slate-100">{user.name}</h3>
                  <a
                    href={user.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>@{user.login}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {user.bio && <p className="text-xs text-slate-300 max-w-2xl">{user.bio}</p>}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono tabular-nums text-slate-400">
                  <span>{user.publicRepos} public repos</span>
                  <span aria-hidden="true">·</span>
                  <span>{stats.privateReposCount} accessible private repos</span>
                  <span aria-hidden="true">·</span>
                  <span>{user.followers} followers</span>
                  {stats.topLanguages.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-200">
                        Primary languages: {stats.topLanguages.join(' / ')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quantitative Personal Contribution Stats */}
          <div className="px-6 py-4 bg-slate-950/50 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <div className="text-xs text-slate-400">Total Authored PRs</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-100 mt-0.5">
                {stats.totalPrsAuthored}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Merged / Closed PRs</div>
              <div className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                {stats.mergedPrsCount} sampled
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Active Open PRs</div>
              <div className="text-xl font-bold font-mono tabular-nums text-sky-400 mt-0.5">
                {stats.openPrsCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Issues Authored</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-100 mt-0.5">
                {stats.totalIssuesAuthored}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Private Repositories</div>
              <div className="text-xl font-bold font-mono tabular-nums text-amber-400 mt-0.5">
                {stats.privateReposCount}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 02. Accessible Private & Public Repositories */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              02. Your Private &amp; Public Repositories ({accessibleRepos.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any private or public repository below to run a full ContribLens intelligence analysis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                placeholder="Search your repositories..."
                aria-label="Search your repositories"
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
              {(
                [
                  { id: 'all', label: `All (${accessibleRepos.length})` },
                  { id: 'private', label: `Private (${stats.privateReposCount})` },
                  { id: 'public', label: `Public (${stats.publicReposCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRepoVisibilityFilter(tab.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    repoVisibilityFilter === tab.id
                      ? 'bg-sky-400 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border border-slate-800 bg-slate-900/40 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-mono text-slate-400">
                  <th className="py-3 px-4">Repository</th>
                  <th className="py-3 px-4 w-28">Visibility</th>
                  <th className="py-3 px-4 w-32">Language</th>
                  <th className="py-3 px-4 w-24 text-right">Stars</th>
                  <th className="py-3 px-4 w-28 text-right">Open Issues</th>
                  <th className="py-3 px-4 w-28 text-right">Last Push</th>
                  <th className="py-3 px-4 w-44 text-right">Analyze</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {filteredRepos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No repositories match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredRepos.map((repoItem) => (
                    <tr
                      key={repoItem.fullName}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 align-top space-y-0.5">
                        <div className="font-mono font-semibold text-slate-100 text-sm">
                          {repoItem.fullName}
                        </div>
                        {repoItem.description && (
                          <div className="text-xs text-slate-400 line-clamp-1">
                            {repoItem.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono align-top">
                        {repoItem.isPrivate ? (
                          <span className="text-amber-400 inline-flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Private</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Public</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300 align-top">
                        {repoItem.language}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-300 align-top">
                        {repoItem.stars.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-300 align-top">
                        {repoItem.openIssuesCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-400 align-top">
                        {formatDate(repoItem.pushedAt)}
                      </td>
                      <td className="py-3 px-4 text-right align-top">
                        <button
                          type="button"
                          disabled={isAnalyzingRepo}
                          onClick={() => onAnalyzeRepoByName(repoItem.fullName)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-60 rounded-md transition-colors inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                        >
                          <span>Analyze Repo</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 03. Personal Contribution History Ledger */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              03. Personal Contribution History
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Your recent pull requests, reported issues, and pushed commits across GitHub.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg self-start">
            {(
              [
                { id: 'prs', label: `Pull Requests (${recentPullRequests.length})` },
                { id: 'issues', label: `Issues (${recentIssues.length})` },
                { id: 'commits', label: `Recent Commits (${recentCommits.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHistoryTab(tab.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  historyTab === tab.id
                    ? 'bg-sky-400 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-slate-800 bg-slate-900/40 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-mono text-slate-400">
                  <th className="py-3 px-4 w-28">Ref</th>
                  <th className="py-3 px-4 w-52">Repository</th>
                  <th className="py-3 px-4">Contribution Title / Message</th>
                  <th className="py-3 px-4 w-24">State</th>
                  <th className="py-3 px-4 w-28 text-right">Date</th>
                  <th className="py-3 px-4 w-40 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {activeHistoryItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No recent items recorded in this category.
                    </td>
                  </tr>
                ) : (
                  activeHistoryItems.map((item) => (
                    <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums text-sky-400 align-top">
                        {item.number ? `#${item.number}` : item.sha || item.type.toUpperCase()}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300 align-top truncate max-w-[200px]">
                        {item.repoFullName}
                      </td>
                      <td className="py-3 px-4 text-slate-100 font-medium align-top">
                        {item.title}
                      </td>
                      <td className="py-3 px-4 font-mono align-top">
                        <span
                          className={
                            item.state === 'merged' || item.state === 'committed'
                              ? 'text-emerald-400'
                              : item.state === 'open'
                              ? 'text-sky-400'
                              : 'text-slate-400'
                          }
                        >
                          {item.state}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-400 align-top">
                        {formatDate(item.updatedAt || item.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right align-top">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isAnalyzingRepo}
                            onClick={() => onAnalyzeRepoByName(item.repoFullName)}
                            className="text-xs font-medium text-sky-400 hover:underline whitespace-nowrap cursor-pointer"
                          >
                            Analyze Repo
                          </button>
                          <a
                            href={item.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-slate-200"
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
    </div>
  );
};
