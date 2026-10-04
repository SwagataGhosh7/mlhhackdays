import { jsPDF } from 'jspdf';
import { ContribLensAnalysisResponse, ContributionPlan } from '../types';

export function exportRoadmapToPdf(
  report: ContribLensAnalysisResponse,
  activePlan: ContributionPlan
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  let y = 44;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 48) {
      doc.addPage();
      y = 44;
    }
  };

  const writeSectionHeading = (title: string) => {
    ensureSpace(36);
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y);
    y += 6;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.75);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;
  };

  const writeWrappedText = (
    text: string,
    options?: {
      fontSize?: number;
      fontStyle?: 'normal' | 'bold' | 'italic';
      fontFamily?: 'helvetica' | 'courier';
      color?: [number, number, number];
      indent?: number;
      lineSpacing?: number;
    }
  ) => {
    const fontSize = options?.fontSize ?? 9.5;
    const fontStyle = options?.fontStyle ?? 'normal';
    const fontFamily = options?.fontFamily ?? 'helvetica';
    const color = options?.color ?? [51, 65, 85];
    const indent = options?.indent ?? 0;
    const lineSpacing = options?.lineSpacing ?? 13.5;

    doc.setFont(fontFamily, fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);

    const lines: string[] = doc.splitTextToSize(text || '', contentWidth - indent);
    for (const line of lines) {
      ensureSpace(lineSpacing + 4);
      doc.text(line, margin + indent, y);
      y += lineSpacing;
    }
  };

  // Top Header Box
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 82, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(248, 250, 252);
  doc.text('ContribLens — Open-Source Contribution Roadmap', margin, 34);

  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(56, 189, 248);
  doc.text(
    `Repository: ${report.repo.fullName} (${report.repo.isPrivate ? 'Private' : 'Public'})  |  Powered by GitHub & Gemma 4`,
    margin,
    52
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Language: ${report.repo.language}  ·  License: ${report.repo.license}  ·  Stars: ${report.repo.stars.toLocaleString()}  ·  Target Profile: ${report.targetSkillLevel}`,
    margin,
    67
  );

  y = 104;

  // Section 1: Project Health Score & Overview
  writeSectionHeading('01. Project Health Score & Repository Summary');
  writeWrappedText(
    `Overall Health Score: ${report.healthScore.overall}/100 (${report.healthScore.statusLabel})`,
    { fontSize: 10.5, fontStyle: 'bold', color: [15, 23, 42] }
  );
  y += 2;
  writeWrappedText(report.healthScore.summary);
  y += 4;

  const dims = report.healthScore.dimensions;
  const dimItems = [
    dims.commitVelocity,
    dims.issueResponsiveness,
    dims.prMergeFlow,
    dims.documentationQuality,
    dims.contributorDiversity,
  ];
  for (const d of dimItems) {
    writeWrappedText(`• ${d.label}: ${d.score}/100 (${d.status}) — ${d.detail}`, {
      fontSize: 9,
      indent: 8,
    });
  }

  // Section 2: Active Contribution Plan Target Issue
  writeSectionHeading(
    `02. Target Contribution: Issue #${activePlan.issueNumber} — ${activePlan.issueTitle}`
  );
  writeWrappedText(
    `Difficulty: ${activePlan.difficulty}   |   Estimated Effort: ${activePlan.estimatedEffort}   |   Skills: ${activePlan.skills.join(', ')}`,
    { fontSize: 9, fontFamily: 'courier', color: [15, 23, 42] }
  );
  y += 4;

  writeWrappedText('Reported Problem:', { fontSize: 9.5, fontStyle: 'bold', color: [15, 23, 42] });
  writeWrappedText(activePlan.problemBreakdown.whatIsHappening, { indent: 8 });
  y += 3;

  writeWrappedText('Root Cause Hypothesis:', {
    fontSize: 9.5,
    fontStyle: 'bold',
    color: [15, 23, 42],
  });
  writeWrappedText(activePlan.problemBreakdown.rootCauseHypothesis, { indent: 8 });
  y += 3;

  writeWrappedText('Acceptance Criteria:', {
    fontSize: 9.5,
    fontStyle: 'bold',
    color: [15, 23, 42],
  });
  writeWrappedText(activePlan.problemBreakdown.acceptanceCriteria, { indent: 8 });

  // Section 3: Target Files to Examine
  writeSectionHeading('03. Target Files to Examine & Modify');
  for (const file of activePlan.filesToExamine) {
    writeWrappedText(`${file.path}  (${file.role})`, {
      fontSize: 9.5,
      fontStyle: 'bold',
      fontFamily: 'courier',
      color: [15, 23, 42],
    });
    writeWrappedText(file.whatToInspect, { fontSize: 9, indent: 10 });
    y += 3;
  }

  // Section 4: Step-by-Step Contribution Execution Plan
  writeSectionHeading('04. Step-by-Step Contribution Execution Plan');
  for (const step of activePlan.steps) {
    ensureSpace(56);
    writeWrappedText(`${step.stepNumber}. ${step.title}`, {
      fontSize: 10,
      fontStyle: 'bold',
      color: [15, 23, 42],
    });
    writeWrappedText(step.description, { fontSize: 9.5, indent: 12 });

    if (step.codeOrCommandHint) {
      const codeLines: string[] = doc.splitTextToSize(
        step.codeOrCommandHint,
        contentWidth - 28
      );
      const boxHeight = codeLines.length * 12 + 12;
      ensureSpace(boxHeight + 10);

      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin + 12, y - 6, contentWidth - 12, boxHeight, 4, 4, 'FD');

      doc.setFont('courier', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      let codeY = y + 6;
      for (const cLine of codeLines) {
        doc.text(cLine, margin + 20, codeY);
        codeY += 12;
      }
      y += boxHeight + 6;
    }

    writeWrappedText(`Verification: ${step.verificationCheck}`, {
      fontSize: 8.5,
      fontStyle: 'italic',
      color: [71, 85, 105],
      indent: 12,
    });
    y += 6;
  }

  // Section 5: Testing Strategy & PR Readiness Checklist
  writeSectionHeading('05. Testing Strategy & Pull Request Checklist');
  writeWrappedText(`Test Runner Command: ${activePlan.testingStrategy.testRunnerCommand}`, {
    fontSize: 9.5,
    fontFamily: 'courier',
    fontStyle: 'bold',
    color: [15, 23, 42],
  });
  if (activePlan.testingStrategy.testFileLocations.length > 0) {
    writeWrappedText(
      `Test Files: ${activePlan.testingStrategy.testFileLocations.join(', ')}`,
      { fontSize: 9, fontFamily: 'courier', indent: 8 }
    );
  }
  y += 4;
  writeWrappedText('Regression Scenarios:', {
    fontSize: 9.5,
    fontStyle: 'bold',
    color: [15, 23, 42],
  });
  for (const scenario of activePlan.testingStrategy.regressionScenarios) {
    writeWrappedText(`• ${scenario}`, { fontSize: 9, indent: 10 });
  }

  y += 6;
  writeWrappedText('Pull Request Readiness Checklist:', {
    fontSize: 9.5,
    fontStyle: 'bold',
    color: [15, 23, 42],
  });
  for (const item of activePlan.prPreparationChecklist) {
    writeWrappedText(`[ ] ${item}`, { fontSize: 9, indent: 10 });
  }

  const safeSlug = report.repo.fullName.replace(/[^a-zA-Z0-9_-]/g, '-');
  doc.save(`ContribLens-Roadmap-${safeSlug}-Issue-${activePlan.issueNumber}.pdf`);
}
