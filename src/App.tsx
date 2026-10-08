/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  GitPullRequest,
  LayoutGrid,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserSearch,
} from 'lucide-react';
import { Header, ActiveTab, DASHBOARD_DIRECTORY } from './components/Header';
import { RepoCommandBar } from './components/RepoCommandBar';
import { OverviewSection } from './components/OverviewSection';
import { RecommendedIssuesSection } from './components/RecommendedIssuesSection';
import { ContributionPlanSection } from './components/ContributionPlanSection';
import { MaintenanceRisksSection } from './components/MaintenanceRisksSection';
import { IssueExplorerSection } from './components/IssueExplorerSection';
import { PersonalContributionsSection } from './components/PersonalContributionsSection';
import { GeneralDiscussionSection } from './components/GeneralDiscussionSection';
import { GitHubAuthorizeModal } from './components/GitHubAuthorizeModal';
import { ContribBotWidget } from './components/ContribBotWidget';
import { exportRoadmapToPdf } from './utils/exportRoadmapPdf';
import { signInWithGitHubFirebasePopup, signOutFirebase } from './firebase';
import {
  analyzeRepoDirectFromGitHub,
  buildContributionPlanClientFallback,
  fetchGitHubUserAnalysisDirect,
  fetchUserProfileDirectFromGitHub,
} from './utils/clientGitHubDirect';
import {
  INITIAL_ANALYSIS_REPORT,
  INITIAL_CONTRIBUTION_PLAN,
} from './data/presetShowcase';
import {
  ContribLensAnalysisResponse,
  ContributionPlan,
  GitHubIssueItem,
  RecommendedIssue,
  SkillLevel,
  UserContributionProfile,
} from './types';

const SESSION_STORAGE_KEY = 'contriblens_gh_session_id';
const ACCESS_TOKEN_STORAGE_KEY = 'contriblens_gh_access_token';
const AUTHORIZED_CONFIRM_KEY = 'contriblens_gh_explicitly_authorized';
const THEME_STORAGE_KEY = 'contriblens_theme_mode';

const VALID_TABS: ActiveTab[] = [
  'overview',
  'recommendations',
  'plan',
  'risks',
  'issues',
  'discussion',
  'browse',
  'profile',
];

function getInitialTabFromHash(): ActiveTab {
  if (typeof window === 'undefined') return 'overview';
  const rawHash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (VALID_TABS.includes(rawHash as ActiveTab)) {
    return rawHash as ActiveTab;
  }
  return 'overview';
}

export default function App() {
  const [activeTab, setActiveTabState] = useState<ActiveTab>(getInitialTabFromHash);

  const setActiveTab = useCallback((tab: ActiveTab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      const targetHash = `#/${tab}`;
      if (window.location.hash !== targetHash) {
        window.history.pushState(null, '', targetHash);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const nextTab = getInitialTabFromHash();
      setActiveTabState(nextTab);
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    } catch {
      return false;
    }
  });
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('Beginner');
  const [report, setReport] = useState<ContribLensAnalysisResponse>(INITIAL_ANALYSIS_REPORT);
  const [activePlan, setActivePlan] = useState<ContributionPlan>(INITIAL_CONTRIBUTION_PLAN);
  const [planCache, setPlanCache] = useState<Record<string, ContributionPlan>>({});
  const [hasAnalyzedRepo, setHasAnalyzedRepo] = useState<boolean>(false);

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedRoadmap, setCopiedRoadmap] = useState<boolean>(false);
  const [recentRepos, setRecentRepos] = useState<string[]>([]);

  // Separate state for Authenticated User Account vs Browsed Public GitHub Profile
  const [authProfile, setAuthProfile] = useState<UserContributionProfile | null>(null);
  const [pendingAuthProfile, setPendingAuthProfile] = useState<UserContributionProfile | null>(null);
  const [isAuthorizeModalOpen, setIsAuthorizeModalOpen] = useState<boolean>(false);
  const [isLoadingAuthProfile, setIsLoadingAuthProfile] = useState<boolean>(false);
  const [isConnectingGitHub, setIsConnectingGitHub] = useState<boolean>(false);
  const [authDiagnosticMessage, setAuthDiagnosticMessage] = useState<string | null>(null);

  const [browsedProfile, setBrowsedProfile] = useState<UserContributionProfile | null>(null);
  const [isLoadingBrowsedProfile, setIsLoadingBrowsedProfile] = useState<boolean>(false);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (storedSession) {
      headers.Authorization = `Bearer ${storedSession}`;
    }
    return headers;
  }, []);

  const fetchCandidateProfileFromCurrentSession = useCallback(async (): Promise<UserContributionProfile | null> => {
    try {
      const res = await fetch('/api/auth/github/profile', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data?.authenticated) {
            return data as UserContributionProfile;
          }
        }
      }
      const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
      if (storedAccessToken) {
        return await fetchUserProfileDirectFromGitHub(storedAccessToken);
      }
      return null;
    } catch {
      const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
      if (storedAccessToken) {
        try {
          return await fetchUserProfileDirectFromGitHub(storedAccessToken);
        } catch {
          return null;
        }
      }
      return null;
    }
  }, [getAuthHeaders]);

  const fetchUserProfile = useCallback(async () => {
    setIsLoadingAuthProfile(true);
    try {
      const candidate = await fetchCandidateProfileFromCurrentSession();
      setAuthProfile(candidate);
    } finally {
      setIsLoadingAuthProfile(false);
    }
  }, [fetchCandidateProfileFromCurrentSession]);

  const handleBrowseGitHubUser = useCallback(
    async (usernameInput: string) => {
      setActiveTab('browse');
      setIsLoadingBrowsedProfile(true);
      setErrorMessage(null);
      try {
        let fetchedBrowsed: UserContributionProfile | null = null;
        try {
          const res = await fetch('/api/user-analysis', {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify({ username: usernameInput }),
          });
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            fetchedBrowsed = (await res.json()) as UserContributionProfile;
          } else if (res.status === 404 || res.status === 400) {
            if (contentType.includes('application/json')) {
              const errJson = await res.json();
              throw new Error(errJson?.error || 'GitHub user not found.');
            }
          }
        } catch (err: any) {
          if ((err?.message || '').includes('not found')) {
            throw err;
          }
          // Static Vercel fallback: fetch directly from GitHub REST API
          const storedToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
          fetchedBrowsed = await fetchGitHubUserAnalysisDirect(usernameInput, storedToken);
        }

        if (!fetchedBrowsed) {
          const storedToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
          fetchedBrowsed = await fetchGitHubUserAnalysisDirect(usernameInput, storedToken);
        }

        setBrowsedProfile(fetchedBrowsed);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Unable to analyze GitHub user.');
      } finally {
        setIsLoadingBrowsedProfile(false);
      }
    },
    [getAuthHeaders]
  );

  // Listen for OAuth popup postMessage completion -> show Authorize Confirmation Modal first!
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        if (event.data?.sessionId) {
          localStorage.setItem(SESSION_STORAGE_KEY, event.data.sessionId);
        }
        setIsConnectingGitHub(true);
        setIsAuthorizeModalOpen(true);
        const candidate = await fetchCandidateProfileFromCurrentSession();
        setPendingAuthProfile(candidate);
        setIsConnectingGitHub(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchCandidateProfileFromCurrentSession]);

  // Only restore session on mount if user previously clicked "Authorize @username"
  useEffect(() => {
    const wasExplicitlyAuthorized = localStorage.getItem(AUTHORIZED_CONFIRM_KEY) === 'true';
    if (wasExplicitlyAuthorized) {
      fetchUserProfile();
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    const rootEl = document.documentElement;
    if (isDarkMode) {
      rootEl.classList.add('dark-mode');
    } else {
      rootEl.classList.remove('dark-mode');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage error
    }
  }, [isDarkMode]);

  const handleVerifyTokenForPreview = async (personalAccessToken: string) => {
    setErrorMessage(null);
    setAuthDiagnosticMessage(null);
    const cleaned = personalAccessToken.trim();
    if (!cleaned) {
      throw new Error('Please enter a valid GitHub Personal Access Token.');
    }

    const directProfile = await fetchUserProfileDirectFromGitHub(cleaned);
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, cleaned);

    try {
      const tokenRes = await fetch('/api/auth/github/token-session', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ accessToken: cleaned }),
      });
      const contentType = tokenRes.headers.get('content-type') || '';
      if (tokenRes.ok && contentType.includes('application/json')) {
        const tokenData = await tokenRes.json();
        if (tokenData.sessionId) {
          localStorage.setItem(SESSION_STORAGE_KEY, tokenData.sessionId);
        }
      }
    } catch {
      // Static Vercel deployment without /api server
    }

    // Show the "Do you want to authorize @username?" confirmation screen!
    setPendingAuthProfile(directProfile);
    setIsAuthorizeModalOpen(true);
  };

  const handleLaunchOAuthPopup = async (loginHint?: string) => {
    setIsConnectingGitHub(true);
    setErrorMessage(null);
    setAuthDiagnosticMessage(null);
    try {
      const { accessToken } = await signInWithGitHubFirebasePopup(loginHint);
      localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);

      try {
        const tokenRes = await fetch('/api/auth/github/token-session', {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({ accessToken }),
        });
        const contentType = tokenRes.headers.get('content-type') || '';
        if (tokenRes.ok && contentType.includes('application/json')) {
          const tokenData = await tokenRes.json();
          if (tokenData.sessionId) {
            localStorage.setItem(SESSION_STORAGE_KEY, tokenData.sessionId);
          }
        }
      } catch {
        // Static Vercel deployment without /api backend
      }

      const candidate = await fetchCandidateProfileFromCurrentSession();
      setPendingAuthProfile(candidate);
    } catch (firebaseErr: any) {
      const code = firebaseErr?.code || '';
      const msg = firebaseErr?.message || '';

      if (code === 'auth/popup-closed-by-user') {
        setIsConnectingGitHub(false);
        return;
      }

      // Check if server has a candidate session available to preview for authorization
      try {
        const linkRes = await fetch('/api/auth/github/link-session', {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
        });
        if (linkRes.ok) {
          const linkData = await linkRes.json();
          if (linkData.sessionId) {
            localStorage.setItem(SESSION_STORAGE_KEY, linkData.sessionId);
          }
          const candidate = await fetchCandidateProfileFromCurrentSession();
          if (candidate) {
            setPendingAuthProfile(candidate);
            return;
          }
        }
      } catch {
        // Ignore fallback error
      }

      if (
        code === 'auth/invalid-credential' ||
        msg.includes('CODE_EXCHANGE') ||
        msg.includes('malformed response')
      ) {
        setAuthDiagnosticMessage(
          'The Client ID or Client Secret saved in Firebase Console (Authentication → Sign-in method → GitHub) does not match your GitHub OAuth App credentials, so GitHub rejected Firebase\'s OAuth code exchange.'
        );
      } else if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setAuthDiagnosticMessage(
          `Add "${window.location.hostname}" to Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else {
        setAuthDiagnosticMessage(msg || 'GitHub Firebase authentication failed.');
      }
    } finally {
      setIsConnectingGitHub(false);
    }
  };

  const handleConnectGitHub = async () => {
    setIsAuthorizeModalOpen(true);
    await handleLaunchOAuthPopup();
  };

  const handleConfirmAuthorize = () => {
    if (!pendingAuthProfile) return;
    localStorage.setItem(AUTHORIZED_CONFIRM_KEY, 'true');
    setAuthProfile(pendingAuthProfile);
    setPendingAuthProfile(null);
    setIsAuthorizeModalOpen(false);
    setActiveTab('profile');
  };

  const handleCancelAuthorize = async () => {
    setIsAuthorizeModalOpen(false);
    setPendingAuthProfile(null);
    if (!authProfile) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      localStorage.removeItem(AUTHORIZED_CONFIRM_KEY);
    }
  };

  const handleDisconnectGitHub = async () => {
    try {
      await signOutFirebase();
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      }).catch(() => {});
    } finally {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      localStorage.removeItem(AUTHORIZED_CONFIRM_KEY);
      setAuthProfile(null);
      setPendingAuthProfile(null);
    }
  };

  const fetchOrLoadContributionPlan = async (
    currentReport: ContribLensAnalysisResponse,
    issueNumber: number,
    issueTitle: string,
    issueBody: string,
    issueUrl: string,
    switchToPlanTab: boolean
  ) => {
    if (switchToPlanTab) {
      setActiveTab('plan');
    }

    const cacheKey = `${currentReport.repo.fullName}#${issueNumber}`;
    if (planCache[cacheKey]) {
      setActivePlan(planCache[cacheKey]);
      return;
    }

    setIsGeneratingPlan(true);
    setErrorMessage(null);

    try {
      let generatedPlan: ContributionPlan | null = null;
      try {
        const response = await fetch('/api/contribution-plan', {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            repoFullName: currentReport.repo.fullName,
            issueNumber,
            issueTitle,
            issueBody,
            issueUrl,
            language: currentReport.repo.language,
            fileTree: currentReport.fileTree.map((f) => f.path),
            skillLevel: currentReport.targetSkillLevel || skillLevel,
          }),
        });
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          generatedPlan = (await response.json()) as ContributionPlan;
        }
      } catch {
        // Fallback below for static Vercel deployments
      }

      if (!generatedPlan) {
        generatedPlan = buildContributionPlanClientFallback(
          currentReport.repo.fullName,
          issueNumber,
          issueTitle,
          issueBody,
          issueUrl,
          currentReport.repo.language,
          currentReport.fileTree.map((f) => f.path),
          currentReport.targetSkillLevel || skillLevel
        );
      }

      setActivePlan(generatedPlan);
      setPlanCache((prev) => ({ ...prev, [cacheKey]: generatedPlan! }));
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not generate contribution plan.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleAnalyzeRepo = async (
    repoInput: string,
    targetLevel: SkillLevel,
    focusArea: string
  ) => {
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      let newReport: ContribLensAnalysisResponse | null = null;
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            repoInput,
            skillLevel: targetLevel,
            focusArea,
          }),
        });

        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          newReport = (await response.json()) as ContribLensAnalysisResponse;
        } else if (response.status === 400 || response.status === 404) {
          if (contentType.includes('application/json')) {
            const errJson = await response.json();
            throw new Error(errJson?.error || 'Repository not found.');
          }
        }
      } catch (serverErr: any) {
        // If static Vercel deployment (no /api server), analyze directly via GitHub REST API
        const storedToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        newReport = await analyzeRepoDirectFromGitHub(repoInput, targetLevel, storedToken);
      }

      if (!newReport) {
        const storedToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        newReport = await analyzeRepoDirectFromGitHub(repoInput, targetLevel, storedToken);
      }

      setReport(newReport);
      setHasAnalyzedRepo(true);
      if (activeTab === 'profile' || activeTab === 'browse' || activeTab === 'discussion') {
        setActiveTab('overview');
      }

      setRecentRepos((prev) => {
        const next = [
          newReport.repo.fullName,
          ...prev.filter((r) => r.toLowerCase() !== newReport.repo.fullName.toLowerCase()),
        ];
        return next.slice(0, 6);
      });

      // Automatically prepare the contribution plan for the top recommended issue
      if (newReport.recommendedIssues && newReport.recommendedIssues.length > 0) {
        const firstIssue = newReport.recommendedIssues[0];
        await fetchOrLoadContributionPlan(
          newReport,
          firstIssue.issueNumber,
          firstIssue.title,
          firstIssue.plainExplanation.summary,
          firstIssue.htmlUrl,
          false
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to analyze repository at this time.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectRecommendedIssue = (issue: RecommendedIssue) => {
    fetchOrLoadContributionPlan(
      report,
      issue.issueNumber,
      issue.title,
      `${issue.plainExplanation.summary}\n${issue.plainExplanation.technicalContext}`,
      issue.htmlUrl,
      true
    );
  };

  const handleSelectRawIssue = (issue: GitHubIssueItem) => {
    fetchOrLoadContributionPlan(
      report,
      issue.number,
      issue.title,
      issue.body,
      issue.htmlUrl,
      true
    );
  };

  const handleGenerateCustomPlan = (
    issueNumber: number,
    issueTitle: string,
    issueBody: string
  ) => {
    fetchOrLoadContributionPlan(
      report,
      issueNumber,
      issueTitle,
      issueBody,
      `https://github.com/${report.repo.fullName}/issues/${issueNumber}`,
      true
    );
  };

  const handleExportRoadmap = () => {
    exportRoadmapToPdf(report, activePlan);
    setCopiedRoadmap(true);
    setTimeout(() => setCopiedRoadmap(false), 2200);
  };

  const handleOpenBrowseProfileTab = () => {
    setActiveTab('browse');
  };

  const handleSelectTab = (tab: ActiveTab) => {
    if (tab === 'browse') {
      handleOpenBrowseProfileTab();
    } else {
      setActiveTab(tab);
    }
  };

  const separateDashboards: Array<{
    id: ActiveTab;
    label: string;
    subtitle: string;
    metricLabel: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'recommendations',
      label: 'Recommended Issues',
      subtitle: 'Skill-matched issues & impact scores',
      metricLabel: `${report.recommendedIssues.length} matched`,
      icon: <Sparkles className="w-4 h-4 text-[#15803D]" />,
    },
    {
      id: 'plan',
      label: 'Contribution Plan',
      subtitle: 'Step-by-step PR execution & simulator',
      metricLabel: `Issue #${activePlan.issueNumber}`,
      icon: <GitPullRequest className="w-4 h-4 text-[#15803D]" />,
    },
    {
      id: 'risks',
      label: 'Maintenance Risks',
      subtitle: 'Bus factor & review bottleneck audit',
      metricLabel: `${report.maintenanceRisks.length} risk signals`,
      icon: <ShieldAlert className="w-4 h-4 text-[#15803D]" />,
    },
    {
      id: 'issues',
      label: 'Issue Explorer',
      subtitle: 'Open GitHub issues & codebase tree',
      metricLabel: `${report.openIssues.length} open issues`,
      icon: <Compass className="w-4 h-4 text-[#15803D]" />,
    },
    {
      id: 'discussion',
      label: 'General Discussion',
      subtitle: 'Community Q&A & maintainer threads',
      metricLabel: 'Discussion hub',
      icon: <MessageSquare className="w-4 h-4 text-[#15803D]" />,
    },
    {
      id: 'browse',
      label: 'Browse Profile',
      subtitle: 'Inspect any public GitHub contributor',
      metricLabel: browsedProfile?.user?.login ? `@${browsedProfile.user.login}` : 'Public lookup',
      icon: <UserSearch className="w-4 h-4 text-[#15803D]" />,
    },
    {
      id: 'profile',
      label: 'My GitHub & Repos',
      subtitle: 'Your connected account & PR history',
      metricLabel: authProfile?.user?.login ? `@${authProfile.user.login}` : 'Account dashboard',
      icon: <UserCheck className="w-4 h-4 text-[#15803D]" />,
    },
  ];

  const activeDashboardMeta =
    DASHBOARD_DIRECTORY.find((d) => d.id === activeTab) || DASHBOARD_DIRECTORY[0];

  return (
    <div
      id="top"
      className={`min-h-screen flex flex-col bg-green-grid text-[#111827] ${
        isDarkMode ? 'dark-mode' : ''
      }`}
    >
      {/* Top Green Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#14532D] via-[#15803D] to-[#22C55E]" />

      {/* Top Product Navigation Header (ContribLens + Overview + Dashboards Selector + Connect GitHub) */}
      <Header
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onExportRoadmap={handleExportRoadmap}
        copiedRoadmap={copiedRoadmap}
        authenticatedUser={authProfile?.user || null}
        onConnectGitHub={handleConnectGitHub}
        isConnectingGitHub={isConnectingGitHub}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
      />

      {/* Home View: Repository Command Bar is displayed on Home (Overview) */}
      {activeTab === 'overview' ? (
        <RepoCommandBar
          repo={report.repo}
          hasAnalyzedRepo={hasAnalyzedRepo}
          skillLevel={skillLevel}
          onSkillLevelChange={(newLevel) => {
            setSkillLevel(newLevel);
          }}
          onAnalyzeRepo={handleAnalyzeRepo}
          onBrowseUser={handleBrowseGitHubUser}
          onOpenBrowseProfileTab={handleOpenBrowseProfileTab}
          isAnalyzing={isAnalyzing}
          errorMessage={errorMessage}
          recentRepos={recentRepos}
          userRepos={authProfile?.accessibleRepos || []}
        />
      ) : (
        /* Dedicated Dashboard Header Banner when redirected to a non-Overview dashboard */
        <section className="border-b-2 border-[#15803D] bg-green-grid-surface">
          <div className="max-w-7xl mx-auto px-6 py-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-[#15803D]">
                  <button
                    type="button"
                    onClick={() => handleSelectTab('overview')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#15803D]/40 text-[#15803D] font-semibold hover:bg-[#15803D] hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Overview (Home)</span>
                  </button>
                  <span className="text-[#64748B]">/</span>
                  <span className="font-semibold text-[#0B0F0D]">
                    {activeDashboardMeta.label}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] pt-1">
                  {activeDashboardMeta.description}
                </p>
              </div>

              {/* Separate Click Button Options to Redirect Between Dashboards */}
              <div className="flex flex-wrap items-center gap-2">
                {separateDashboards.map((dash) => {
                  const isCurrent = activeTab === dash.id;
                  return (
                    <button
                      key={dash.id}
                      type="button"
                      onClick={() => handleSelectTab(dash.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        isCurrent
                          ? 'bg-[#15803D] text-white border-[#15803D]'
                          : 'bg-white text-[#111827] border-[#DDE5DF] hover:border-[#15803D] hover:text-[#15803D]'
                      }`}
                    >
                      {dash.icon}
                      <span>{dash.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 pb-24">
        {activeTab === 'overview' && (
          <div className="space-y-10">
            {/* Separate Click Button Options for All Specialized Dashboards */}
            <section className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-[#15803D]" />
                  <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-[#0B0F0D]">
                    Workspace Dashboards — Click Any Option to Open Dashboard
                  </h2>
                </div>
                <span className="text-xs font-mono text-[#64748B]">
                  Overview is shown on Home · Click a button below to redirect to a dedicated dashboard
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                {separateDashboards.map((dash) => (
                  <button
                    key={dash.id}
                    type="button"
                    onClick={() => handleSelectTab(dash.id)}
                    className="group text-left p-3.5 rounded-xl bg-white/95 border border-[#166534]/40 hover:border-[#15803D] hover:shadow-sm transition-all flex flex-col justify-between gap-3 cursor-pointer"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="p-1.5 rounded-lg bg-[#F8FAF9] border border-[#DDE5DF] group-hover:border-[#15803D]/50 transition-colors">
                          {dash.icon}
                        </div>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#F1F5F3] text-[#15803D] border border-[#DDE5DF] truncate">
                          {dash.metricLabel}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-[#0B0F0D] group-hover:text-[#15803D] transition-colors">
                        {dash.label}
                      </div>
                      <p className="text-[11px] text-[#64748B] leading-snug line-clamp-2">
                        {dash.subtitle}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#DDE5DF]/70 flex items-center justify-between text-[11px] font-semibold text-[#15803D]">
                      <span>Open Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Home Overview Dashboard Content */}
            <OverviewSection
              report={report}
              onSelectIssueForPlan={handleSelectRecommendedIssue}
              onNavigateTab={handleSelectTab}
              isGeneratingPlan={isGeneratingPlan}
            />
          </div>
        )}

        {activeTab === 'recommendations' && (
          <RecommendedIssuesSection
            recommendedIssues={report.recommendedIssues}
            activePlanIssueNumber={activePlan.issueNumber}
            onSelectIssueForPlan={handleSelectRecommendedIssue}
            isGeneratingPlan={isGeneratingPlan}
          />
        )}

        {activeTab === 'plan' && (
          <ContributionPlanSection
            plan={activePlan}
            recommendedIssues={report.recommendedIssues}
            onSelectIssueForPlan={handleSelectRecommendedIssue}
            onGenerateCustomPlan={handleGenerateCustomPlan}
            isGeneratingPlan={isGeneratingPlan}
          />
        )}

        {activeTab === 'risks' && (
          <MaintenanceRisksSection
            risks={report.maintenanceRisks}
            stats={report.stats}
            onNavigateToRecommendations={() => setActiveTab('recommendations')}
          />
        )}

        {activeTab === 'issues' && (
          <IssueExplorerSection
            openIssues={report.openIssues}
            fileTree={report.fileTree}
            onGeneratePlanFromRawIssue={handleSelectRawIssue}
            isGeneratingPlan={isGeneratingPlan}
          />
        )}

        {activeTab === 'discussion' && (
          <GeneralDiscussionSection
            authenticatedUser={authProfile?.user || null}
          />
        )}

        {activeTab === 'browse' && (
          <PersonalContributionsSection
            mode="browse"
            profile={browsedProfile}
            isLoadingProfile={isLoadingBrowsedProfile}
            onConnectGitHub={handleConnectGitHub}
            onDisconnectGitHub={handleDisconnectGitHub}
            onRefreshProfile={() =>
              browsedProfile?.user?.login && handleBrowseGitHubUser(browsedProfile.user.login)
            }
            onBrowseGitHubUser={handleBrowseGitHubUser}
            onAnalyzeRepoByName={(fullName) =>
              handleAnalyzeRepo(fullName, skillLevel, 'All Areas')
            }
            isAnalyzingRepo={isAnalyzing}
          />
        )}

        {activeTab === 'profile' && (
          <PersonalContributionsSection
            mode="auth"
            profile={authProfile}
            isLoadingProfile={isLoadingAuthProfile}
            isConnectingGitHub={isConnectingGitHub}
            authDiagnosticMessage={authDiagnosticMessage}
            onConnectGitHub={handleConnectGitHub}
            onConnectWithToken={handleVerifyTokenForPreview}
            onDisconnectGitHub={handleDisconnectGitHub}
            onRefreshProfile={fetchUserProfile}
            onBrowseGitHubUser={handleBrowseGitHubUser}
            onAnalyzeRepoByName={(fullName) =>
              handleAnalyzeRepo(fullName, skillLevel, 'All Areas')
            }
            isAnalyzingRepo={isAnalyzing}
          />
        )}
      </main>

      {/* Explicit GitHub Account Authorization Confirmation Popup */}
      <GitHubAuthorizeModal
        isOpen={isAuthorizeModalOpen}
        pendingProfile={pendingAuthProfile}
        isLoading={isConnectingGitHub}
        diagnosticMessage={authDiagnosticMessage}
        onConfirmAuthorize={handleConfirmAuthorize}
        onCancel={handleCancelAuthorize}
        onLaunchOAuthPopup={handleLaunchOAuthPopup}
        onVerifyTokenForPreview={handleVerifyTokenForPreview}
      />

      {/* ContribBot Floating OSS Mentor & Troubleshooting Assistant (Only on Overview dashboard) */}
      {activeTab === 'overview' && (
        <ContribBotWidget
          report={report}
          activePlan={activePlan}
          skillLevel={skillLevel}
          activeUserLogin={authProfile?.user?.login || browsedProfile?.user?.login || null}
        />
      )}

      {/* Quiet Footer */}
      <footer className="border-t border-[#DDE5DF] bg-white py-6 px-6 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
          <div>ContribLens — Open-Source Contribution Platform</div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="hover:text-[#15803D] transition-colors cursor-pointer"
            >
              Project Health &amp; Maintenance
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recommendations')}
              className="hover:text-[#15803D] transition-colors cursor-pointer"
            >
              Recommended Issues
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('plan')}
              className="hover:text-[#15803D] transition-colors cursor-pointer"
            >
              Contribution Plan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="hover:text-[#15803D] transition-colors cursor-pointer"
            >
              My Contributions
            </button>
            <a
              href={report.repo.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#15803D] transition-colors"
            >
              GitHub Repository
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
