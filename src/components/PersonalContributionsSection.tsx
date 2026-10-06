import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Copy,
  ExternalLink,
  Github,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  UserSearch,
} from 'lucide-react';
import { UserContributionProfile } from '../types';

interface PersonalContributionsSectionProps {
  mode: 'browse' | 'auth';
  profile: UserContributionProfile | null;
  isLoadingProfile: boolean;
  isConnectingGitHub?: boolean;
  authDiagnosticMessage?: string | null;
  onConnectGitHub: () => void;
  onConnectWithToken?: (token: string) => Promise<void>;
  onDisconnectGitHub: () => void;
  onRefreshProfile: () => void;
  onBrowseGitHubUser: (username: string) => void;
  onAnalyzeRepoByName: (fullName: string) => void;
  isAnalyzingRepo: boolean;
}

export const PersonalContributionsSection: React.FC<PersonalContributionsSectionProps> = ({
  mode,
  profile,
  isLoadingProfile,
  isConnectingGitHub = false,
  authDiagnosticMessage = null,
  onConnectGitHub,
  onConnectWithToken,
  onDisconnectGitHub,
  onRefreshProfile,
  onBrowseGitHubUser,
  onAnalyzeRepoByName,
  isAnalyzingRepo,
}) => {
  const [usernameQuery, setUsernameQuery] = useState<string>('');
  const [patInput, setPatInput] = useState<string>('');
  const [isConnectingPat, setIsConnectingPat] = useState<boolean>(false);
  const [patError, setPatError] = useState<string | null>(null);
  const [repoVisibilityFilter, setRepoVisibilityFilter] = useState<'all' | 'private' | 'public'>('all');
  const [repoSearch, setRepoSearch] = useState<string>('');
  const [historyTab, setHistoryTab] = useState<'prs' | 'issues' | 'commits'>('prs');
  const [copiedCallback, setCopiedCallback] = useState<boolean>(false);
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);

  useEffect(() => {
    setAvatarFailed(false);
    if (mode === 'browse' && profile?.user?.login) {
      setUsernameQuery(`https://github.com/${profile.user.login}`);
    }
  }, [mode, profile?.user?.login]);

  const callbackUrl = 'https://contriblens.firebaseapp.com/__/auth/handler';
  const currentDomain =
    typeof window !== 'undefined'
      ? window.location.hostname
      : 'ais-dev-ieg7g7orgwz77ba3sdsqdi-826198571216.asia-southeast1.run.app';

  const handleCopyCallback = () => {
    navigator.clipboard?.writeText(callbackUrl);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  const handleUserSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = usernameQuery.trim();
    if (!raw || isLoadingProfile) return;
    const cleaned = raw.replace(/^@+/, '').replace(/\/+$/, '');
    const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s?#]+)/i);
    const targetUsername = urlMatch ? urlMatch[1] : cleaned;
    onBrowseGitHubUser(targetUsername);
  };

  const handlePatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedToken = patInput.trim();
    if (!cleanedToken || !onConnectWithToken) return;
    setIsConnectingPat(true);
    setPatError(null);
    try {
      await onConnectWithToken(cleanedToken);
      setPatInput('');
    } catch (err: any) {
      setPatError(err?.message || 'Invalid GitHub Personal Access Token.');
    } finally {
      setIsConnectingPat(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch {
      return (iso || '').slice(0, 10);
    }
  };

  return (
    <div className="space-y-10">
      {/* Top Bar when in BROWSE PROFILE mode */}
      {mode === 'browse' && (
        <div className="border border-[#DDE5DF] bg-white rounded-xl p-6 space-y-4">
          <div className="space-y-1">
            <div className="text-xs font-mono text-[#15803D] font-semibold">
              Browse Any GitHub Profile · ContribLens Developer Profile Analysis
            </div>
            <h2 className="text-xl font-bold text-[#0B0F0D]">
              Paste a GitHub user URL to view their profile picture, listed repos, preferred languages, and improvements.
            </h2>
          </div>

          <form onSubmit={handleUserSearchSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-9 relative flex items-center">
              <UserSearch className="w-4 h-4 text-[#15803D] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={usernameQuery}
                onChange={(e) => setUsernameQuery(e.target.value)}
                placeholder="Paste GitHub user URL (e.g. https://github.com/torvalds, https://github.com/tiangolo, or @username)"
                aria-label="Paste GitHub user profile URL"
                className="w-full pl-10 pr-4 py-2.5 text-sm font-mono bg-[#F8FAF9] border border-[#DDE5DF] rounded-lg text-[#0B0F0D] placeholder:text-[#64748B] focus:outline-none focus:border-[#15803D] transition-colors"
              />
            </div>

            <div className="lg:col-span-3">
              <button
                type="submit"
                disabled={isLoadingProfile}
                className="w-full h-full px-4 py-2.5 text-sm font-semibold text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                {isLoadingProfile ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Loading Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Browse Profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Top Banner when in AUTHENTICATED MY GITHUB mode and not yet connected */}
      {mode === 'auth' && !isLoadingProfile && (!profile || !profile.authenticated) && (
        <div className="border border-[#DDE5DF] bg-white rounded-xl p-8 max-w-4xl space-y-6">
          <div className="space-y-2">
            <div className="text-xs font-mono text-[#15803D] font-semibold">
              GitHub Authentication &amp; Personal Repository Analysis
            </div>
            <h2 className="text-2xl font-bold text-[#0B0F0D] [text-wrap:balance]">
              Connect your GitHub account to analyze your private &amp; public repositories.
            </h2>
            <p className="text-sm text-[#111827] leading-relaxed">
              Sign in via GitHub OAuth or paste a GitHub Personal Access Token (<code className="font-mono text-[#15803D]">ghp_...</code> / <code className="font-mono text-[#15803D]">github_pat_...</code>) to unlock your private repositories, run deep repository analysis on your own projects, and track your personal pull requests, issues, and commit velocity.
            </p>
          </div>

          {authDiagnosticMessage && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2.5 text-xs text-amber-950">
              <div className="font-semibold text-amber-900">
                Why Firebase returned &ldquo;CODE_EXCHANGE (auth/invalid-credential)&rdquo;:
              </div>
              <p className="text-[#111827] leading-relaxed">
                {authDiagnosticMessage}
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[#111827]">
                <li>
                  Open{' '}
                  <a
                    href="https://github.com/settings/developers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#15803D] underline font-medium"
                  >
                    GitHub Settings → Developer settings → OAuth Apps
                  </a>{' '}
                  (must be an <strong>OAuth App</strong>, not a GitHub App) and click{' '}
                  <strong>Generate a new client secret</strong>.
                </li>
                <li>
                  Open{' '}
                  <a
                    href="https://console.firebase.google.com/project/contriblens/authentication/providers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#15803D] underline font-medium"
                  >
                    Firebase Console → Authentication → Sign-in method → GitHub
                  </a>{' '}
                  and paste the exact <strong>Client ID</strong> and new <strong>Client secret</strong> (no spaces), then click <strong>Save</strong>.
                </li>
                <li>
                  <strong>Or bypass Firebase OAuth right now:</strong> Generate a token at{' '}
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo,read:user,user:email&description=ContribLens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#15803D] underline font-semibold"
                  >
                    github.com/settings/tokens/new
                  </a>{' '}
                  and paste it into the instant token box below.
                </li>
              </ol>
            </div>
          )}

          {/* Option 1: Direct GitHub Personal Access Token Connect (Bypasses CODE_EXCHANGE) */}
          <div className="p-5 bg-[#F8FAF9] border border-[#15803D]/30 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs font-mono text-[#15803D] font-semibold">
                  Instant Sign-In · Works on AI Studio &amp; Vercel without OAuth Callback Setup
                </div>
                <h3 className="text-sm font-semibold text-[#0B0F0D] mt-0.5">
                  Connect with GitHub Personal Access Token
                </h3>
              </div>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,read:user,user:email&description=ContribLens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[#15803D] hover:underline inline-flex items-center gap-1"
              >
                <span>Create GitHub Token (repo, read:user)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <form onSubmit={handlePatSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8">
                <input
                  type="password"
                  value={patInput}
                  onChange={(e) => setPatInput(e.target.value)}
                  placeholder="Paste GitHub token (ghp_... or github_pat_...)"
                  aria-label="GitHub Personal Access Token"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#DDE5DF] rounded-lg text-[#0B0F0D] placeholder:text-[#64748B] focus:outline-none focus:border-[#15803D] transition-colors"
                />
              </div>
              <div className="sm:col-span-4">
                <button
                  type="submit"
                  disabled={isConnectingPat || !patInput.trim()}
                  className="w-full h-full px-4 py-2.5 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Github className="w-4 h-4" />
                  <span>{isConnectingPat ? 'Verifying Token...' : 'Connect with Token'}</span>
                </button>
              </div>
            </form>

            {patError && (
              <div className="text-xs text-red-700 font-mono">{patError}</div>
            )}
          </div>

          {/* Option 2: Firebase OAuth Popup */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-[#DDE5DF]">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-[#0B0F0D]">
                Or Connect via Firebase GitHub OAuth Popup
              </div>
              <div className="text-xs text-[#64748B]">
                Requires matching OAuth App Client ID &amp; Client Secret in Firebase Console.
              </div>
            </div>
            <button
              type="button"
              disabled={isConnectingGitHub}
              onClick={onConnectGitHub}
              className="px-4 py-2 text-xs font-semibold text-[#111827] bg-[#F8FAF9] hover:bg-[#F1F5F3] border border-[#DDE5DF] disabled:opacity-60 rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Github className="w-3.5 h-3.5" />
              <span>{isConnectingGitHub ? 'Connecting...' : 'Launch GitHub OAuth Popup'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="pt-4 border-t border-[#DDE5DF] space-y-3">
            <div className="text-xs font-semibold text-[#111827]">
              Firebase GitHub Auth Configuration (`contriblens.firebaseapp.com`)
            </div>
            <div className="flex items-center justify-between gap-3 p-3 bg-[#F8FAF9] border border-[#DDE5DF] rounded-lg">
              <div className="truncate">
                <span className="text-xs text-[#64748B] mr-2">GitHub Callback URL:</span>
                <code className="text-xs font-mono text-[#15803D]">{callbackUrl}</code>
              </div>
              <button
                type="button"
                onClick={handleCopyCallback}
                className="px-2.5 py-1 text-xs font-mono text-[#111827] hover:text-[#15803D] bg-white border border-[#DDE5DF] rounded flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedCallback ? 'Copied' : 'Copy URI'}</span>
              </button>
            </div>
            <p className="text-xs text-[#64748B]">
              Ensure <code className="text-[#0B0F0D] font-mono">{currentDomain}</code> is added under{' '}
              <span className="text-[#0B0F0D] font-medium">
                Firebase Console → Authentication → Settings → Authorized domains
              </span>
              .
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoadingProfile && (
        <div className="border border-[#DDE5DF] bg-white rounded-xl p-12 text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-[#15803D] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#0B0F0D]">
            Loading GitHub profile, listed repositories, preferred languages, and developer analysis...
          </p>
        </div>
      )}

      {/* Active Profile & Developer Analysis View */}
      {!isLoadingProfile && profile && profile.authenticated && (
        <>
          {/* 01. Developer Profile, Impact Score & Executive Summary */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#0B0F0D]">
                {mode === 'auth'
                  ? `01. Authenticated GitHub Account (@${profile.user.login}) & Analysis`
                  : `01. Developer Profile on ContribLens & Analysis`}
              </h2>
              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={profile.user.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>View on GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() =>
                    mode === 'browse'
                      ? onBrowseGitHubUser(profile.user.login)
                      : onRefreshProfile()
                  }
                  className="px-3 py-1.5 text-xs font-medium text-[#111827] bg-white border border-[#DDE5DF] hover:border-[#15803D] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Telemetry</span>
                </button>
                {mode === 'auth' && (
                  <button
                    type="button"
                    onClick={onDisconnectGitHub}
                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-[#DDE5DF] hover:border-red-600 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect GitHub</span>
                  </button>
                )}
              </div>
            </div>

            <div className="border border-[#DDE5DF] bg-white rounded-xl divide-y divide-[#DDE5DF]">
              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 flex items-start gap-5">
                  {profile.user.avatarUrl && !avatarFailed ? (
                    <img
                      src={profile.user.avatarUrl}
                      alt={`${profile.user.login} GitHub avatar`}
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarFailed(true)}
                      className="w-20 h-20 rounded-full border-2 border-[#15803D]/60 object-cover shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full border-2 border-[#15803D]/60 bg-[#F1F5F3] flex items-center justify-center text-xl font-bold font-mono text-[#15803D] shrink-0">
                      {profile.user.login.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold text-[#0B0F0D]">{profile.user.name}</h3>
                      <span className="text-xs font-mono text-[#15803D] font-semibold">
                        @{profile.user.login}
                      </span>
                      <a
                        href={profile.user.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 text-xs font-semibold text-[#15803D] bg-[#F8FAF9] border border-[#15803D]/30 hover:border-[#15803D] rounded-md inline-flex items-center gap-1.5 transition-colors"
                      >
                        <span>View on GitHub</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {profile.developerAnalysis?.archetype && (
                        <>
                          <span className="text-[#64748B]" aria-hidden="true">·</span>
                          <span className="text-xs font-mono text-[#166534] font-semibold">
                            {profile.developerAnalysis.archetype}
                          </span>
                        </>
                      )}
                    </div>

                    {profile.user.bio && (
                      <p className="text-sm text-[#111827] max-w-2xl">{profile.user.bio}</p>
                    )}

                    {profile.developerAnalysis?.executiveSummary && (
                      <p className="text-xs text-[#111827] leading-relaxed max-w-2xl">
                        {profile.developerAnalysis.executiveSummary}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono tabular-nums text-[#64748B] pt-1">
                      <span>{profile.user.publicRepos} public repos</span>
                      {profile.stats.privateReposCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-700 font-semibold">
                            {profile.stats.privateReposCount} private repos
                          </span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{profile.user.followers.toLocaleString()} followers</span>
                      {profile.user.location && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{profile.user.location}</span>
                        </>
                      )}
                      {profile.user.company && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{profile.user.company}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Developer Impact Score Panel */}
                {profile.developerAnalysis && (
                  <div className="lg:col-span-4 border border-[#DDE5DF] bg-[#F8FAF9] rounded-lg p-4 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-mono text-[#64748B]">
                        Developer Impact Score
                      </span>
                      <span className="text-2xl font-bold font-mono tabular-nums text-[#15803D]">
                        {profile.developerAnalysis.impactScore}/100
                      </span>
                    </div>
                    <p className="text-xs text-[#111827] leading-relaxed">
                      {profile.developerAnalysis.contributionStyle}
                    </p>
                  </div>
                )}
              </div>

              {/* Quantitative Contribution Metrics Strip */}
              <div className="px-6 py-4 bg-[#F8FAF9] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <div className="text-xs text-[#64748B]">Total Authored PRs</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-[#0B0F0D] mt-0.5">
                    {profile.stats.totalPrsAuthored.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#64748B]">Merged / Resolved PRs</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-[#15803D] mt-0.5">
                    {profile.stats.mergedPrsCount} sampled
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#64748B]">Issues Authored</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-[#0B0F0D] mt-0.5">
                    {profile.stats.totalIssuesAuthored.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#64748B]">Stars Across Sampled Repos</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-[#166534] mt-0.5">
                    {(profile.stats.totalStarsEarned ?? 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#64748B]">Preferred Languages</div>
                  <div className="text-sm font-bold font-mono text-[#0B0F0D] mt-1 truncate">
                    {profile.stats.topLanguages.slice(0, 3).join(' / ') || 'Multi-language'}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 02. Preferred Languages & Ecosystem Breakdown */}
          {profile.languageBreakdown && profile.languageBreakdown.length > 0 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-[#0B0F0D]">
                  02. Preferred Languages &amp; Ecosystem Footprint
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Language distribution calculated across @{profile.user.login}&apos;s active repositories and earned stars.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Language Bars */}
                <div className="lg:col-span-7 border border-[#DDE5DF] bg-white rounded-xl p-6 space-y-4">
                  {profile.languageBreakdown.map((langItem) => (
                    <div key={langItem.language} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                        <span className="font-semibold text-[#0B0F0D]">{langItem.language}</span>
                        <span className="text-[#64748B]">
                          {langItem.percentage}% · {langItem.repoCount} repos ·{' '}
                          {langItem.totalStars.toLocaleString()} stars
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#F1F5F3] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#15803D] rounded-full"
                          style={{ width: `${Math.max(4, langItem.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Strengths & Recommended Target Ecosystems */}
                {profile.developerAnalysis && (
                  <div className="lg:col-span-5 border border-[#DDE5DF] bg-white rounded-xl p-6 space-y-5">
                    <div className="space-y-2.5">
                      <h3 className="text-sm font-semibold text-[#0B0F0D]">
                        Key Engineering Strengths
                      </h3>
                      <ul className="space-y-2 text-xs text-[#111827] leading-relaxed">
                        {profile.developerAnalysis.strengths.map((str, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="font-mono text-[#15803D] font-semibold shrink-0">0{idx + 1}.</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-4 border-t border-[#DDE5DF] space-y-2">
                      <h4 className="text-xs font-mono text-[#15803D] font-semibold">
                        Recommended Next Contribution Ecosystems
                      </h4>
                      <ul className="space-y-1.5 text-xs text-[#111827]">
                        {profile.developerAnalysis.recommendedNextRepoTypes.map((recType, i) => (
                          <li key={i} className="font-mono text-[#111827]">
                            · {recType}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 03. Actionable Improvements & Profile Growth Roadmap */}
          {profile.developerAnalysis?.improvements &&
            profile.developerAnalysis.improvements.length > 0 && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#0B0F0D]">
                    03. Recommended Improvements &amp; Open-Source Growth Plan
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Concrete, metric-backed improvements to elevate @{profile.user.login}&apos;s GitHub portfolio and contribution impact.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {profile.developerAnalysis.improvements.map((imp) => (
                    <div
                      key={imp.id}
                      className="border border-[#DDE5DF] bg-white rounded-xl p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center gap-x-2 text-xs font-mono">
                          <span
                            className={
                              imp.priority === 'High Impact'
                                ? 'text-amber-700 font-semibold'
                                : imp.priority === 'Quick Win'
                                ? 'text-[#15803D] font-semibold'
                                : 'text-[#166534] font-semibold'
                            }
                          >
                            {imp.priority}
                          </span>
                          <span className="text-[#64748B]" aria-hidden="true">·</span>
                          <span className="text-[#64748B]">{imp.category}</span>
                        </div>

                        <h3 className="text-base font-bold text-[#0B0F0D]">{imp.title}</h3>

                        <div className="text-xs font-mono text-[#64748B]">
                          Evidence: {imp.metricEvidence}
                        </div>

                        <p className="text-xs text-[#111827] leading-relaxed">
                          {imp.currentObservation}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#DDE5DF] space-y-1">
                        <div className="text-xs font-mono text-[#15803D] font-semibold">
                          Actionable Improvement Step:
                        </div>
                        <p className="text-xs text-[#0B0F0D] leading-relaxed">
                          {imp.actionableSteps}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* 04. Listed Repositories */}
          <section className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#0B0F0D]">
                  04. Listed Repositories for @{profile.user.login} ({profile.accessibleRepos.length})
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Click &ldquo;Analyze Repo&rdquo; to inspect its health score and contribution plan on ContribLens, or &ldquo;View on GitHub&rdquo;.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    placeholder="Filter repositories..."
                    aria-label="Filter repositories"
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#DDE5DF] rounded-lg text-[#111827] placeholder:text-[#64748B] focus:outline-none focus:border-[#15803D]"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-[#F1F5F3] border border-[#DDE5DF] rounded-lg">
                  {(
                    [
                      { id: 'all', label: `All (${profile.accessibleRepos.length})` },
                      { id: 'private', label: `Private (${profile.stats.privateReposCount})` },
                      { id: 'public', label: `Public (${profile.stats.publicReposCount})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setRepoVisibilityFilter(tab.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        repoVisibilityFilter === tab.id
                          ? 'bg-[#15803D] text-white font-semibold'
                          : 'text-[#64748B] hover:text-[#111827]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border border-[#DDE5DF] bg-white rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#DDE5DF] bg-[#F8FAF9] text-xs font-mono text-[#64748B]">
                      <th className="py-3 px-4">Repository</th>
                      <th className="py-3 px-4 w-28">Visibility</th>
                      <th className="py-3 px-4 w-32">Language</th>
                      <th className="py-3 px-4 w-24 text-right">Stars</th>
                      <th className="py-3 px-4 w-28 text-right">Open Issues</th>
                      <th className="py-3 px-4 w-28 text-right">Last Push</th>
                      <th className="py-3 px-4 w-64 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDE5DF] text-xs">
                    {profile.accessibleRepos
                      .filter((r) => {
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
                      })
                      .map((repoItem) => (
                        <tr
                          key={repoItem.fullName}
                          className="hover:bg-[#F8FAF9] transition-colors"
                        >
                          <td className="py-3 px-4 align-top space-y-0.5">
                            <div className="font-mono font-semibold text-[#0B0F0D] text-sm">
                              {repoItem.fullName}
                            </div>
                            {repoItem.description && (
                              <div className="text-xs text-[#64748B] line-clamp-1">
                                {repoItem.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono align-top">
                            {repoItem.isPrivate ? (
                              <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span>Private</span>
                              </span>
                            ) : (
                              <span className="text-[#64748B]">Public</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[#111827] align-top">
                            {repoItem.language}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-right text-[#111827] align-top">
                            {repoItem.stars.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-right text-[#111827] align-top">
                            {repoItem.openIssuesCount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-right text-[#64748B] align-top">
                            {formatDate(repoItem.pushedAt)}
                          </td>
                          <td className="py-3 px-4 text-right align-top">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={repoItem.htmlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 text-xs font-medium text-[#111827] hover:text-[#15803D] bg-[#F8FAF9] border border-[#DDE5DF] hover:border-[#15803D] rounded-md inline-flex items-center gap-1 whitespace-nowrap"
                                title="View repository on GitHub"
                              >
                                <span>View on GitHub</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <button
                                type="button"
                                disabled={isAnalyzingRepo}
                                onClick={() => onAnalyzeRepoByName(repoItem.fullName)}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 rounded-md transition-colors inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                              >
                                <span>Analyze Repo</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* 05. Pull Requests, Issues & Commit History */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#0B0F0D]">
                  05. @{profile.user.login}&apos;s Contribution History
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Recent pull requests, reported issues, and pushed commits across GitHub.
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-[#F1F5F3] border border-[#DDE5DF] rounded-lg self-start">
                {(
                  [
                    {
                      id: 'prs',
                      label: `Pull Requests (${profile.recentPullRequests.length})`,
                    },
                    { id: 'issues', label: `Issues (${profile.recentIssues.length})` },
                    {
                      id: 'commits',
                      label: `Recent Commits (${profile.recentCommits.length})`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setHistoryTab(tab.id)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      historyTab === tab.id
                        ? 'bg-[#15803D] text-white font-semibold'
                        : 'text-[#64748B] hover:text-[#111827]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-[#DDE5DF] bg-white rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#DDE5DF] bg-[#F8FAF9] text-xs font-mono text-[#64748B]">
                      <th className="py-3 px-4 w-28">Ref</th>
                      <th className="py-3 px-4 w-52">Repository</th>
                      <th className="py-3 px-4">Contribution Title / Message</th>
                      <th className="py-3 px-4 w-24">State</th>
                      <th className="py-3 px-4 w-28 text-right">Date</th>
                      <th className="py-3 px-4 w-48 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDE5DF] text-xs">
                    {(historyTab === 'prs'
                      ? profile.recentPullRequests
                      : historyTab === 'issues'
                      ? profile.recentIssues
                      : profile.recentCommits
                    ).map((item) => (
                      <tr
                        key={`${item.type}-${item.id}`}
                        className="hover:bg-[#F8FAF9] transition-colors"
                      >
                        <td className="py-3 px-4 font-mono tabular-nums text-[#15803D] font-semibold align-top">
                          {item.number ? `#${item.number}` : item.sha || item.type.toUpperCase()}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#111827] align-top truncate max-w-[200px]">
                          {item.repoFullName}
                        </td>
                        <td className="py-3 px-4 text-[#0B0F0D] font-medium align-top">
                          {item.title}
                        </td>
                        <td className="py-3 px-4 font-mono align-top">
                          <span
                            className={
                              item.state === 'merged' || item.state === 'committed'
                                ? 'text-[#15803D] font-semibold'
                                : item.state === 'open'
                                ? 'text-[#166534]'
                                : 'text-[#64748B]'
                            }
                          >
                            {item.state}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-right text-[#64748B] align-top">
                          {formatDate(item.updatedAt || item.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right align-top">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={isAnalyzingRepo}
                              onClick={() => onAnalyzeRepoByName(item.repoFullName)}
                              className="text-xs font-semibold text-[#15803D] hover:underline whitespace-nowrap cursor-pointer"
                            >
                              Analyze Repo
                            </button>
                            <a
                              href={item.htmlUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 text-xs text-[#111827] hover:text-[#15803D] bg-[#F8FAF9] border border-[#DDE5DF] rounded inline-flex items-center gap-1"
                              title="View on GitHub"
                            >
                              <span>View on GitHub</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
