import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  Maximize2,
  MessageSquare,
  Minimize2,
  RefreshCw,
  Send,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import {
  ContribLensAnalysisResponse,
  ContributionPlan,
  SkillLevel,
} from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ContribBotWidgetProps {
  report: ContribLensAnalysisResponse;
  activePlan: ContributionPlan;
  skillLevel: SkillLevel;
  activeUserLogin?: string | null;
}

const QUICK_PROMPTS = [
  'Best issue for me to start?',
  'How to set up & run tests?',
  'Fix Git rebase / PR conflict',
  'Help connecting GitHub',
];

function buildClientFallbackReply(
  userMessage: string,
  report: ContribLensAnalysisResponse,
  activePlan: ContributionPlan,
  skillLevel: SkillLevel
): string {
  const q = (userMessage || '').toLowerCase();
  const repoName = report.repo.fullName;
  const language = report.repo.language || 'Python';
  const activeIssueNum = activePlan.issueNumber;
  const activeIssueTitle = activePlan.issueTitle;
  const files = report.fileTree || [];
  const topIssues = report.recommendedIssues || [];

  const testCmd =
    activePlan.testingStrategy?.testRunnerCommand ||
    (language.toLowerCase().includes('python')
      ? 'pytest -v'
      : language.toLowerCase().includes('rust')
      ? 'cargo test'
      : language.toLowerCase().includes('go')
      ? 'go test ./...'
      : 'npm test');

  if (
    q.includes('connect') ||
    q.includes('oauth') ||
    q.includes('token') ||
    q.includes('auth') ||
    q.includes('code_exchange')
  ) {
    return `Here is how to resolve **GitHub Authentication & Connection** issues on ContribLens:

1. **Instant Sign-In via Personal Access Token (Recommended)**:
   - Click **Connect GitHub** (or open the **My GitHub & Repos** tab).
   - Generate a token at \`https://github.com/settings/tokens/new\` with \`repo\` and \`read:user\` scopes.
   - Paste your \`ghp_...\` or \`github_pat_...\` token and click **Authorize**. This works on both AI Studio and Vercel without needing OAuth callback URLs.
2. **Fixing Firebase \`CODE_EXCHANGE (auth/invalid-credential)\`**:
   - Open **GitHub Settings -> Developer settings -> OAuth Apps** and generate a fresh **Client secret**.
   - Paste both the **Client ID** and **Client secret** into **Firebase Console -> Authentication -> Sign-in method -> GitHub** and click **Save**.`;
  }

  if (
    q.includes('rebase') ||
    q.includes('conflict') ||
    q.includes('merge') ||
    q.includes('git') ||
    q.includes('pr') ||
    q.includes('pull request')
  ) {
    return `Here is the clean **Git & Pull Request Workflow** for **${repoName}**:

\`\`\`bash
# 1. Sync your fork with upstream main
git remote add upstream https://github.com/${repoName}.git
git fetch upstream
git checkout -b fix/issue-${activeIssueNum} upstream/main

# 2. Stage and commit your changes with a clear reference
git add -A
git commit -m "fix: resolve #${activeIssueNum} (${activeIssueTitle.slice(0, 48)})"

# 3. If your branch has merge conflicts with upstream/main:
git fetch upstream
git rebase upstream/main
# Resolve conflicts in your editor, then run:
git add <resolved-files>
git rebase --continue
\`\`\`

Before opening your PR, always run \`${testCmd}\` locally to verify no regressions were introduced.`;
  }

  if (
    q.includes('test') ||
    q.includes('setup') ||
    q.includes('install') ||
    q.includes('run') ||
    q.includes('local')
  ) {
    return `To set up **${repoName}** (${language}) locally and run the test suite:

\`\`\`bash
# 1. Clone the repository and create a feature branch
git clone https://github.com/${repoName}.git
cd ${repoName.split('/')[1] || 'repo'}
git checkout -b fix/issue-${activeIssueNum}

# 2. Run the automated test suite
${testCmd}
\`\`\`

**Key files to inspect for Issue #${activeIssueNum}:**
${
  activePlan.filesToExamine
    ?.slice(0, 4)
    .map((f) => `- \`${f.path}\` — ${f.whatToInspect}`)
    .join('\n') ||
  files
    .slice(0, 4)
    .map((f) => `- \`${f}\``)
    .join('\n')
}`;
  }

  if (
    q.includes('issue') ||
    q.includes('start') ||
    q.includes('recommend') ||
    q.includes('beginner') ||
    q.includes('first')
  ) {
    const issueList =
      topIssues.length > 0
        ? topIssues
            .slice(0, 3)
            .map(
              (iss) =>
                `- **#${iss.issueNumber}: ${iss.title}** (${iss.difficulty} · ${iss.estimatedEffort}) — Target files: \`${(iss.likelyFiles || []).slice(0, 2).join(', ') || 'core module'}\``
            )
            .join('\n')
        : `- **#${activeIssueNum}: ${activeIssueTitle}** (${skillLevel})`;

    return `Based on your **${skillLevel}** level in **${repoName}**, here are the best issues to tackle right now:

${issueList}

Open the **Contribution Plan** tab to follow the 6-step implementation guide for **#${activeIssueNum}**.`;
  }

  return `Here is the current workspace summary for **${repoName}** (${language}, Health Score: **${report.healthScore.overall}/100**):

- **Active Contribution Plan**: **#${activeIssueNum}** — *${activeIssueTitle}*
- **Root Cause Hypothesis**: ${activePlan.problemBreakdown.rootCauseHypothesis}
- **Test Runner Command**: \`${testCmd}\`

Ask me about:
- Choosing the best beginner or intermediate issue in **${repoName}**
- Setting up the local dev environment and running \`${testCmd}\`
- Resolving Git rebase / merge conflicts for your Pull Request
- Troubleshooting GitHub OAuth or Personal Access Token sign-in`;
}

export const ContribBotWidget: React.FC<ContribBotWidgetProps> = ({
  report,
  activePlan,
  skillLevel,
  activeUserLogin,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const repoDisplayName = report.repo.fullName || 'Open-Source Workspace';
  const initialMessage: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content: `Hi! I'm your **Contribution Mentor**, here to help you navigate open-source repositories and contributions.

I'm ready to help with **${repoDisplayName}** and Issue **#${activePlan.issueNumber}**. Ask me anything about picking an issue, setting up tests, fixing Git/PR conflicts, or connecting your GitHub account!`,
    timestamp: 'Just now',
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    if (!textOverride) {
      setInput('');
    }
    setIsSending(true);

    const contextPayload = {
      repoFullName: report.repo.fullName,
      repoLanguage: report.repo.language,
      healthScore: report.healthScore.overall,
      skillLevel,
      activeIssueNumber: activePlan.issueNumber,
      activeIssueTitle: activePlan.issueTitle,
      recommendedIssues: report.recommendedIssues.slice(0, 3),
      fileTreeSample: report.fileTree.slice(0, 25),
      activeUserLogin: activeUserLogin || null,
    };

    try {
      let replyText = '';
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedHistory.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            context: contextPayload,
          }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data?.reply) {
            replyText = data.reply;
          }
        }
      } catch {
        // Static deployment fallback
      }

      if (!replyText) {
        replyText = buildClientFallbackReply(text, report, activePlan, skillLevel);
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Chat reset! I'm tracking **${repoDisplayName}** and Issue **#${activePlan.issueNumber}**. How can I help you contribute today?`,
        timestamp: 'Just now',
      },
    ]);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCodeIdx(id);
    setTimeout(() => setCopiedCodeIdx(null), 1800);
  };

  const renderFormattedContent = (content: string, msgId: string) => {
    const segments = content.split(/(```[\s\S]*?```)/g);
    return segments.map((segment, idx) => {
      if (segment.startsWith('```') && segment.endsWith('```')) {
        const lines = segment.slice(3, -3).trim().split('\n');
        const firstLine = lines[0]?.trim() || '';
        const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
        const codeContent = hasLang ? lines.slice(1).join('\n') : lines.join('\n');
        const blockId = `${msgId}-code-${idx}`;

        return (
          <div
            key={blockId}
            className="my-2.5 rounded-lg overflow-hidden border border-[#111827] bg-[#0B0F0D]"
          >
            <div className="px-3 py-1.5 bg-[#111827] border-b border-[#111827] flex items-center justify-between text-[11px] font-mono text-[#F1F5F3]">
              <span>{hasLang ? firstLine : 'terminal'}</span>
              <button
                type="button"
                onClick={() => handleCopyCode(codeContent, blockId)}
                className="text-[#F1F5F3] hover:text-[#22C55E] inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedCodeIdx === blockId ? (
                  <>
                    <Check className="w-3 h-3 text-[#22C55E]" />
                    <span className="text-[#22C55E]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 text-xs font-mono text-[#F8FAF9] overflow-x-auto leading-relaxed">
              <code>{codeContent}</code>
            </pre>
          </div>
        );
      }

      return (
        <div key={`${msgId}-txt-${idx}`} className="space-y-1.5 leading-relaxed">
          {segment
            .trim()
            .split('\n')
            .map((line, lineIdx) => {
              if (!line.trim()) return <div key={lineIdx} className="h-1" />;
              // Format bold **text** and inline `code`
              const inlineParts = line.split(/(\*\*.*?\*\*|`[^`]+`)/g);
              return (
                <p key={lineIdx} className="text-xs">
                  {inlineParts.map((part, pIdx) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return (
                        <strong key={pIdx} className="font-semibold text-[#0B0F0D]">
                          {part.slice(2, -2)}
                        </strong>
                      );
                    }
                    if (part.startsWith('`') && part.endsWith('`')) {
                      return (
                        <code
                          key={pIdx}
                          className="px-1.5 py-0.5 rounded bg-[#F1F5F3] border border-[#DDE5DF] font-mono text-[11px] text-[#15803D]"
                        >
                          {part.slice(1, -1)}
                        </code>
                      );
                    }
                    return <span key={pIdx}>{part}</span>;
                  })}
                </p>
              );
            })}
        </div>
      );
    });
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {/* Floating Launcher Button when closed */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-4 py-3 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white font-semibold text-xs shadow-lg border border-[#14532D] transition-all flex items-center gap-2.5 cursor-pointer"
          aria-label="Open Contribution Mentor"
        >
          <Bot className="w-4 h-4" />
          <span>Contribution Mentor</span>
        </button>
      )}

      {/* Open Chat Panel */}
      {isOpen && (
        <div
          className={`flex flex-col bg-white border border-[#DDE5DF] rounded-2xl shadow-xl overflow-hidden transition-all ${
            isExpanded
              ? 'w-[92vw] sm:w-[560px] h-[78vh] max-h-[680px]'
              : 'w-[90vw] sm:w-[410px] h-[540px] max-h-[80vh]'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-[#F8FAF9] border-b border-[#DDE5DF] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#15803D]/10 border border-[#15803D]/30 flex items-center justify-center text-[#15803D] shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-[#0B0F0D]">Contribution Mentor</h3>
                  <span className="text-[10px] font-mono text-[#15803D] font-semibold">
                    · ContribLens
                  </span>
                </div>
                <p className="text-[11px] font-mono text-[#64748B] truncate">
                  {repoDisplayName} · #{activePlan.issueNumber}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 text-[#64748B] hover:text-[#0B0F0D] rounded-lg transition-colors cursor-pointer"
                title="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="p-1.5 text-[#64748B] hover:text-[#0B0F0D] rounded-lg transition-colors cursor-pointer"
                title={isExpanded ? 'Compact size' : 'Expand size'}
              >
                {isExpanded ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-[#64748B] hover:text-[#0B0F0D] rounded-lg transition-colors cursor-pointer"
                title="Close Contribution Mentor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-white">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-xl px-3.5 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-[#15803D] text-white font-medium'
                      : 'bg-[#F8FAF9] border border-[#DDE5DF] text-[#111827]'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-xs leading-relaxed">{msg.content}</p>
                  ) : (
                    renderFormattedContent(msg.content, msg.id)
                  )}
                </div>
                <span className="text-[10px] font-mono text-[#64748B] mt-1 px-1">
                  {msg.role === 'user' ? 'You' : 'Mentor'} · {msg.timestamp}
                </span>
              </div>
            ))}

            {isSending && (
              <div className="flex items-center gap-2 text-xs text-[#15803D] font-mono px-2 py-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing repository context...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Troubleshooting Prompts */}
          <div className="px-3 py-2 bg-[#F8FAF9] border-t border-[#DDE5DF] flex items-center gap-1.5 overflow-x-auto">
            <Terminal className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={isSending}
                onClick={() => handleSendMessage(prompt)}
                className="px-2.5 py-1 text-[11px] font-mono text-[#111827] hover:text-[#15803D] bg-white hover:bg-[#F1F5F3] border border-[#DDE5DF] rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-[#DDE5DF] flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4 text-[#64748B] ml-1 shrink-0" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about ${repoDisplayName}, Git PRs, or OAuth...`}
              aria-label="Ask Contribution Mentor a question"
              className="flex-1 bg-transparent text-xs text-[#0B0F0D] placeholder:text-[#64748B] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="p-2 rounded-lg bg-[#15803D] hover:bg-[#166534] disabled:opacity-40 text-white transition-colors cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
