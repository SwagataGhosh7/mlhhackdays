/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Header, ActiveTab } from './components/Header';
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

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
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

  const mobileTabs: Array<{ id: ActiveTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'recommendations', label: 'Recommended' },
    { id: 'plan', label: 'Contribution Plan' },
    { id: 'risks', label: 'Risks' },
    { id: 'issues', label: 'Issues' },
    { id: 'discussion', label: 'Discussion' },
    { id: 'browse', label: 'Browse Profile' },
    { id: 'profile', label: 'My GitHub & Repos' },
  ];

  return (
    <div id="top" className="min-h-screen flex flex-col bg-green-grid text-[#111827]">
      {/* Top Green Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#14532D] via-[#15803D] to-[#22C55E]" />

      {/* 3-Zone Top Navigation Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onExportRoadmap={handleExportRoadmap}
        copiedRoadmap={copiedRoadmap}
        authenticatedUser={authProfile?.user || null}
        onConnectGitHub={handleConnectGitHub}
        isConnectingGitHub={isConnectingGitHub}
      />

      {/* Mobile Navigation Bar */}
      <div className="xl:hidden flex items-center gap-1 px-4 py-2 bg-white border-b border-[#DDE5DF] overflow-x-auto">
        {mobileTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleSelectTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#15803D] text-white font-semibold'
                : 'text-[#64748B] hover:text-[#111827]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Repository Input & Skill Targeting Command Bar */}
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

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <OverviewSection
            report={report}
            onSelectIssueForPlan={handleSelectRecommendedIssue}
            onNavigateTab={handleSelectTab}
            isGeneratingPlan={isGeneratingPlan}
          />
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

      {/* ContribBot Floating OSS Mentor & Troubleshooting Assistant */}
      <ContribBotWidget
        report={report}
        activePlan={activePlan}
        skillLevel={skillLevel}
        activeUserLogin={authProfile?.user?.login || browsedProfile?.user?.login || null}
      />

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
