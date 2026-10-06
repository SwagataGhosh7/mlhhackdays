import React, { useState } from 'react';
import { Check, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { ContributionPlan, RecommendedIssue } from '../types';

interface ContributionPlanSectionProps {
  plan: ContributionPlan;
  recommendedIssues: RecommendedIssue[];
  onSelectIssueForPlan: (issue: RecommendedIssue) => void;
  onGenerateCustomPlan: (issueNumber: number, issueTitle: string, issueBody: string) => void;
  isGeneratingPlan: boolean;
}

export const ContributionPlanSection: React.FC<ContributionPlanSectionProps> = ({
  plan,
  recommendedIssues,
  onSelectIssueForPlan,
  onGenerateCustomPlan,
  isGeneratingPlan,
}) => {
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [checkedPrItems, setCheckedPrItems] = useState<Record<number, boolean>>({});
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customIssueNum, setCustomIssueNum] = useState('');
  const [customIssueTitle, setCustomIssueTitle] = useState('');
  const [customIssueBody, setCustomIssueBody] = useState('');

  const toggleStep = (stepNumber: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber],
    }));
  };

  const togglePrItem = (idx: number) => {
    setCheckedPrItems((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const copyCommand = (stepNumber: number, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedStep(stepNumber);
    setTimeout(() => setCopiedStep(null), 1800);
  };

  const handleCustomPlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(customIssueNum) || 999;
    if (!customIssueTitle.trim()) return;
    onGenerateCustomPlan(num, customIssueTitle.trim(), customIssueBody.trim());
    setShowCustomForm(false);
  };

  const completedCount = plan.steps.filter((s) => completedSteps[s.stepNumber]).length;

  return (
    <div className="space-y-8">
      {/* Top Issue Selector Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#DDE5DF]">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#15803D] font-semibold">
            Active Contribution Plan · {plan.repoFullName}
          </div>
          <h2 className="text-xl font-bold text-[#0B0F0D] [text-wrap:balance]">
            Issue #{plan.issueNumber} — {plan.issueTitle}
          </h2>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono tabular-nums text-[#64748B]">
            <span>Difficulty: {plan.difficulty}</span>
            <span aria-hidden="true">·</span>
            <span>Estimated effort: {plan.estimatedEffort}</span>
            <span aria-hidden="true">·</span>
            <span>Skills: {plan.skills.join(' · ')}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#15803D] font-semibold">
              Progress: {completedCount}/{plan.steps.length} steps completed
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="px-3.5 py-2 text-xs font-medium text-[#111827] bg-white border border-[#DDE5DF] hover:border-[#15803D] hover:text-[#15803D] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            {showCustomForm ? 'Close Custom Issue' : 'Plan Custom Issue #'}
          </button>

          <a
            href={plan.issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 text-xs font-medium text-[#111827] bg-white border border-[#DDE5DF] hover:border-[#15803D] hover:text-[#15803D] rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>Open Issue on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Quick Switcher Between Recommended Issues */}
      {recommendedIssues.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#64748B] mr-1">Switch target issue:</span>
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F1F5F3] border border-[#DDE5DF] rounded-lg">
            {recommendedIssues.map((rec) => {
              const active = rec.issueNumber === plan.issueNumber;
              return (
                <button
                  key={rec.issueNumber}
                  type="button"
                  disabled={isGeneratingPlan}
                  onClick={() => onSelectIssueForPlan(rec)}
                  className={`px-3 py-1.5 rounded-md font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#15803D] text-white font-semibold'
                      : 'text-[#111827] hover:text-[#15803D] hover:bg-white'
                  }`}
                >
                  #{rec.issueNumber} {rec.title.slice(0, 32)}
                  {rec.title.length > 32 ? '...' : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Optional Custom Issue Input Form */}
      {showCustomForm && (
        <form
          onSubmit={handleCustomPlanSubmit}
          className="border border-[#DDE5DF] bg-white rounded-xl p-5 space-y-4"
        >
          <div className="text-sm font-semibold text-[#0B0F0D]">
            Generate Contribution Plan for Any Issue in {plan.repoFullName}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-[#64748B] mb-1">Issue Number</label>
              <input
                type="number"
                value={customIssueNum}
                onChange={(e) => setCustomIssueNum(e.target.value)}
                placeholder="e.g. 184"
                required
                className="w-full px-3 py-2 text-xs font-mono bg-[#F8FAF9] border border-[#DDE5DF] rounded-lg text-[#0B0F0D]"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs text-[#64748B] mb-1">Issue Title</label>
              <input
                type="text"
                value={customIssueTitle}
                onChange={(e) => setCustomIssueTitle(e.target.value)}
                placeholder="e.g. Improve CSV parser when handling quoted delimiters"
                required
                className="w-full px-3 py-2 text-xs bg-[#F8FAF9] border border-[#DDE5DF] rounded-lg text-[#0B0F0D]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#64748B] mb-1">
              Additional Issue Description or Stack Trace (Optional)
            </label>
            <textarea
              rows={2}
              value={customIssueBody}
              onChange={(e) => setCustomIssueBody(e.target.value)}
              placeholder="Paste issue description or reproduction steps..."
              className="w-full px-3 py-2 text-xs bg-[#F8FAF9] border border-[#DDE5DF] rounded-lg text-[#0B0F0D]"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isGeneratingPlan}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] rounded-lg transition-colors cursor-pointer"
            >
              Generate Contribution Plan
            </button>
          </div>
        </form>
      )}

      {/* Loading State When Generating a New Plan */}
      {isGeneratingPlan ? (
        <div className="border border-[#DDE5DF] bg-white rounded-xl p-12 text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-[#15803D] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#0B0F0D]">
            Building Step-by-Step Contribution Plan...
          </p>
          <p className="text-xs text-[#64748B]">
            Mapping issue requirements against {plan.repoFullName} directory structure and test suite.
          </p>
        </div>
      ) : (
        <>
          {/* Problem Breakdown Trio */}
          <div className="border border-[#DDE5DF] bg-white rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-[#DDE5DF] grid grid-cols-1 lg:grid-cols-3">
            <div className="p-5 space-y-1.5">
              <div className="text-xs font-semibold text-[#0B0F0D]">01. Reported Problem</div>
              <p className="text-xs text-[#111827] leading-relaxed">
                {plan.problemBreakdown.whatIsHappening}
              </p>
            </div>
            <div className="p-5 space-y-1.5">
              <div className="text-xs font-semibold text-[#0B0F0D]">02. Root Cause Hypothesis</div>
              <p className="text-xs text-[#111827] leading-relaxed">
                {plan.problemBreakdown.rootCauseHypothesis}
              </p>
            </div>
            <div className="p-5 space-y-1.5">
              <div className="text-xs font-semibold text-[#0B0F0D]">03. Acceptance Criteria</div>
              <p className="text-xs text-[#111827] leading-relaxed">
                {plan.problemBreakdown.acceptanceCriteria}
              </p>
            </div>
          </div>

          {/* Target Files to Examine */}
          <section className="space-y-3">
            <h3 className="text-base font-semibold text-[#0B0F0D]">
              Target Files to Examine &amp; Modify
            </h3>
            <div className="border border-[#DDE5DF] bg-white rounded-xl divide-y divide-[#DDE5DF]">
              {plan.filesToExamine.map((file) => (
                <div
                  key={file.path}
                  className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-baseline"
                >
                  <div className="lg:col-span-4 font-mono text-xs font-semibold text-[#15803D]">
                    {file.path}
                  </div>
                  <div className="lg:col-span-3 text-xs font-medium text-[#0B0F0D]">
                    {file.role}
                  </div>
                  <div className="lg:col-span-5 text-xs text-[#64748B]">{file.whatToInspect}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 6-Step Execution Roadmap */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-[#0B0F0D]">
                Step-by-Step Contribution Guide
              </h3>
              <span className="text-xs font-mono text-[#64748B]">
                Click any step to mark complete
              </span>
            </div>

            <div className="border border-[#DDE5DF] bg-white rounded-xl divide-y divide-[#DDE5DF]">
              {plan.steps.map((step) => {
                const isDone = Boolean(completedSteps[step.stepNumber]);
                return (
                  <div key={step.stepNumber} className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => toggleStep(step.stepNumber)}
                        className="flex items-start gap-3 text-left cursor-pointer group"
                      >
                        <span
                          className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center text-xs font-mono shrink-0 border transition-colors ${
                            isDone
                              ? 'bg-[#15803D] border-[#15803D] text-white font-bold'
                              : 'bg-[#F8FAF9] border-[#DDE5DF] text-[#64748B] group-hover:border-[#15803D]'
                          }`}
                        >
                          {isDone ? <Check className="w-3.5 h-3.5" /> : step.stepNumber}
                        </span>
                        <div>
                          <div
                            className={`text-sm font-semibold transition-colors ${
                              isDone ? 'line-through text-[#64748B]' : 'text-[#0B0F0D]'
                            }`}
                          >
                            {step.stepNumber}. {step.title}
                          </div>
                          <p className="text-xs text-[#111827] mt-1 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </button>

                      {step.codeOrCommandHint && (
                        <button
                          type="button"
                          onClick={() => copyCommand(step.stepNumber, step.codeOrCommandHint)}
                          className="px-2.5 py-1 text-xs font-mono text-[#111827] hover:text-[#15803D] bg-[#F8FAF9] border border-[#DDE5DF] rounded flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>
                            {copiedStep === step.stepNumber ? 'Copied' : 'Copy Snippet'}
                          </span>
                        </button>
                      )}
                    </div>

                    {step.codeOrCommandHint && (
                      <div className="pl-8">
                        <pre className="p-3.5 rounded-lg bg-[#0B0F0D] border border-[#111827] text-xs font-mono text-[#F8FAF9] overflow-x-auto">
                          <code>{step.codeOrCommandHint}</code>
                        </pre>
                      </div>
                    )}

                    <div className="pl-8 text-xs text-[#64748B]">
                      <span className="text-[#0B0F0D] font-medium">Verification: </span>
                      {step.verificationCheck}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Bottom Grid: Testing Strategy + Concepts + PR Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Testing Strategy */}
            <div className="lg:col-span-6 border border-[#DDE5DF] bg-white rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[#0B0F0D]">
                  Testing &amp; Regression Verification
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Run Command:{' '}
                  <code className="text-[#15803D] font-mono font-semibold">
                    {plan.testingStrategy.testRunnerCommand}
                  </code>
                </p>
              </div>

              <div className="text-xs font-mono text-[#64748B]">
                <span className="text-[#0B0F0D] font-semibold">Test Files: </span>
                {plan.testingStrategy.testFileLocations.join(' · ')}
              </div>

              <div className="space-y-2 pt-1 border-t border-[#DDE5DF]">
                <div className="text-xs font-medium text-[#0B0F0D]">
                  Required Regression Scenarios:
                </div>
                <ul className="space-y-1.5 text-xs text-[#111827] list-disc pl-4">
                  {plan.testingStrategy.regressionScenarios.map((scenario, idx) => (
                    <li key={idx}>{scenario}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Concepts & PR Checklist */}
            <div className="lg:col-span-6 border border-[#DDE5DF] bg-white rounded-xl divide-y divide-[#DDE5DF]">
              <div className="p-5 space-y-3">
                <h3 className="text-sm font-semibold text-[#0B0F0D]">
                  Core Concepts Needed for This Issue
                </h3>
                <div className="space-y-2.5">
                  {plan.conceptsToUnderstand.map((item) => (
                    <div key={item.concept} className="text-xs">
                      <span className="font-semibold text-[#0B0F0D]">{item.concept}: </span>
                      <span className="text-[#111827]">{item.explanation}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 space-y-3">
                <h3 className="text-sm font-semibold text-[#0B0F0D]">
                  Pull Request Readiness Checklist
                </h3>
                <div className="space-y-2">
                  {plan.prPreparationChecklist.map((item, idx) => {
                    const checked = Boolean(checkedPrItems[idx]);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => togglePrItem(idx)}
                        className="w-full flex items-start gap-2.5 text-left text-xs cursor-pointer"
                      >
                        <span
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            checked
                              ? 'bg-[#15803D] border-[#15803D] text-white'
                              : 'border-[#DDE5DF] bg-[#F8FAF9]'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" />}
                        </span>
                        <span className={checked ? 'line-through text-[#64748B]' : 'text-[#111827]'}>
                          {item}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
