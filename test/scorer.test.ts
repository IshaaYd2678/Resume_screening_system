import { describe, expect, it } from "vitest";
import {
  buildCoverLetterPrompt,
  buildGithubPrompt,
  buildJobMatchPrompt,
  buildPerformanceReviewPrompt,
  buildPortfolioPrompt,
  buildResumeScoringPrompt,
  parseCoverLetterScore,
  parseJobMatchScore,
  parsePerformanceReviewExtraction,
  parsePortfolioScore,
  parseResumeScore,
  extractPerformanceReviewWithGemini,
  matchResumeWithGemini,
  scoreCoverLetterWithGemini,
  scorePortfolioWithGemini,
  scoreResumeWithGemini
} from "../lib/scorer";

describe("score prompt builders", () => {
  it("builds the resume scoring prompt", () => {
    expect(buildResumeScoringPrompt("Resume text")).toContain("Return this exact shape");
  });

  it("builds the cover letter and portfolio prompts", () => {
    expect(buildCoverLetterPrompt("Cover letter body", "Job description")).toContain("lengthDiscipline");
    expect(buildPortfolioPrompt("Portfolio text")).toContain("Project clarity");
    expect(buildGithubPrompt("GitHub profile text")).toContain("Contribution consistency");
    expect(buildPerformanceReviewPrompt("Review text")).toContain("identify 5-10 specific accomplishments");
    expect(buildJobMatchPrompt("Resume", "Job")).toContain("missingKeywords");
  });
});

describe("score JSON parsing", () => {
  it("parses a valid resume score", () => {
    const score = parseResumeScore(
      JSON.stringify({
        overall: 74,
        percentile: 61,
        delta: 0,
        sections: [
          {
            name: "Impact metrics in experience",
            score: 68,
            impact: "high",
            impactWeight: 0.9,
            suggestion: "Add revenue, time saved, or adoption metrics."
          }
        ],
        insightMessage: "Add measurable outcomes to your strongest project.",
        scoredAt: "2026-04-18T00:00:00.000Z"
      }),
      "resume"
    );

    expect(score.documentType).toBe("resume");
    expect(score.sections[0].impact).toBe("high");
  });

  it("extracts JSON from markdown-like model output", () => {
    const score = parseResumeScore(
      '```json\n{"overall":81,"percentile":70,"delta":0,"sections":[{"name":"Skills relevance","score":80,"impact":"medium","impactWeight":0.5,"suggestion":"Group skills by role relevance."}],"insightMessage":"Sharpen your skills section.","scoredAt":"now"}\n```',
      "resume"
    );

    expect(score.overall).toBe(81);
  });

  it("parses a job match score", () => {
    const match = parseJobMatchScore(
      JSON.stringify({
        overall: 74,
        percentile: 61,
        delta: 0,
        sections: [
          {
            name: "Work experience",
            score: 72,
            impact: "high",
            impactWeight: 0.9,
            suggestion: "Lead with quantified outcomes."
          }
        ],
        insightMessage: "Add cloud keywords from the role.",
        scoredAt: "2026-04-18T00:00:00.000Z",
        jobTitle: "Product analyst",
        matchScore: 66,
        matchLabel: "Moderate - key skills missing",
        missingKeywords: ["SQL", "Experimentation"],
        roleGaps: [
          {
            name: "SQL evidence",
            score: 35,
            impact: "high",
            impactWeight: 0.85,
            suggestion: "Add one SQL-heavy project bullet."
          }
        ]
      }),
      "resume"
    );

    expect(match.matchScore).toBe(66);
    expect(match.missingKeywords).toContain("SQL");
  });

  it("parses cover letter, portfolio, and performance review outputs", () => {
    const coverLetter = parseCoverLetterScore(
      JSON.stringify({
        overall: 79,
        dimensions: {
          relevance: 81,
          personalization: 74,
          clarity: 80,
          persuasiveness: 78,
          lengthDiscipline: 82
        },
        wordCount: 318,
        insightMessage: "Add a sharper company-specific reason for the move.",
        scoredAt: "2026-04-18T00:00:00.000Z"
      })
    );

    const portfolio = parsePortfolioScore(
      JSON.stringify({
        overall: 83,
        projectCount: 4,
        sections: [
          {
            name: "Outcome quantification",
            score: 86,
            impact: "high",
            impactWeight: 0.8,
            suggestion: "Keep leading with measurable wins."
          }
        ],
        insightMessage: "Show one deeper process walkthrough to add more proof.",
        scoredAt: "2026-04-18T00:00:00.000Z"
      }),
      "url"
    );

    const extraction = parsePerformanceReviewExtraction(
      JSON.stringify({
        achievements: [
          {
            raw: "Improved activation from 58% to 71%.",
            bulletForm: "Improved day-14 activation from 58% to 71% by redesigning onboarding flows.",
            impactCategory: "quantified"
          }
        ],
        extractedAt: "2026-04-18T00:00:00.000Z"
      })
    );

    expect(coverLetter.wordCount).toBe(318);
    expect(portfolio.sourceType).toBe("url");
    expect(extraction.achievements[0].impactCategory).toBe("quantified");
  });
});

describe("local fallback scoring", () => {
  it("returns a usable resume score without Gemini", async () => {
    const score = await scoreResumeWithGemini(
      "Summary\nProduct manager with six years of experience. Experience\nLed onboarding improvements that increased activation by 15 percent. Skills\nSQL, experimentation, analytics, roadmap planning. Education\nB.S. in Computer Science.",
      "resume"
    );

    expect(score.documentType).toBe("resume");
    expect(score.sections).toHaveLength(7);
    expect(score.overall).toBeGreaterThan(0);
  });

  it("returns local cover letter, portfolio, match, and extraction results", async () => {
    const coverLetter = await scoreCoverLetterWithGemini(
      "I am excited to apply for this product role because your team is improving customer onboarding. I led experiments that improved activation by 15 percent and would welcome the chance to discuss how I can help.",
      "Looking for a product manager with onboarding, experimentation, analytics, and SQL experience."
    );

    const portfolio = await scorePortfolioWithGemini(
      "Project Alpha\nProblem: activation was low.\nProcess: redesigned onboarding.\nOutcome: increased activation by 15 percent.",
      "url"
    );

    const match = await matchResumeWithGemini(
      "Product manager with SQL, analytics, experimentation, and onboarding experience. Increased activation by 15 percent.",
      "Product manager role requiring SQL, analytics, experimentation, and stakeholder communication.",
      "resume"
    );

    const extraction = await extractPerformanceReviewWithGemini(
      "Led a cross-functional onboarding redesign that increased activation by 15 percent. Mentored two junior PMs and improved planning rituals across the team."
    );

    expect(coverLetter.wordCount).toBeGreaterThan(0);
    expect(portfolio.projectCount).toBeGreaterThan(0);
    expect(match.matchScore).toBeGreaterThan(0);
    expect(extraction.achievements.length).toBeGreaterThan(0);
  });
});
