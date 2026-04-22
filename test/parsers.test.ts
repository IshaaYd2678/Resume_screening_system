import { readFileSync } from "fs";
import path from "path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { extractResumeText, isResumeLongEnough } from "../lib/parser";
import { parseCoverLetter } from "../lib/parsers/cover-letter";
import { summarizeGithubProfile } from "../lib/parsers/github";
import { parseLinkedInExport } from "../lib/parsers/linkedin";
import { parsePortfolioDeck } from "../lib/parsers/portfolio-deck";
import { summarizePortfolioHtml } from "../lib/parsers/portfolio-url";
import { parseResume } from "../lib/parsers/resume";

const fixturesDir = path.join(process.cwd(), "data", "fixtures");

describe("shared text normalization", () => {
  it("normalizes pasted document text", () => {
    expect(extractResumeText("  Alex\tKim\r\n\r\n\r\nBuilt   systems  ")).toBe("Alex Kim\n\nBuilt systems");
  });

  it("rejects short document text", () => {
    expect(isResumeLongEnough("short resume")).toBe(false);
  });
});

describe("file parsers", () => {
  it("parses a text resume fixture", async () => {
    const buffer = readFileSync(path.join(fixturesDir, "sample-resume.txt"));
    const parsed = await parseResume({ fileName: "sample-resume.txt", buffer });

    expect(parsed.category).toBe("resume");
    expect(parsed.wordCount).toBeGreaterThan(100);
    expect(parsed.rawText).toContain("product");
  });

  it("parses a text cover letter fixture", async () => {
    const buffer = readFileSync(path.join(fixturesDir, "sample-cover-letter.txt"));
    const parsed = await parseCoverLetter({ fileName: "sample-cover-letter.txt", buffer });

    expect(parsed.category).toBe("cover_letter");
    expect(parsed.wordCount).toBeGreaterThan(150);
  });

  it("parses a mock LinkedIn export zip", async () => {
    const zip = new JSZip();
    const linkedInDir = path.join(fixturesDir, "sample-linkedin-export");
    const files = [
      "Profile.csv",
      "Positions.csv",
      "Skills.csv",
      "Certifications.csv",
      "Education.csv",
      "Recommendations.csv"
    ];

    for (const fileName of files) {
      zip.file(fileName, readFileSync(path.join(linkedInDir, fileName), "utf8"));
    }

    const buffer = Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
    const parsed = await parseLinkedInExport({ fileName: "linkedin-export.zip", buffer });

    expect(parsed.category).toBe("linkedin_export");
    expect(parsed.rawText).toContain("Jordan Lee");
    expect(parsed.rawText).toContain("Skills");
  });

  it("parses extracted deck text through the PDF/PPTX deck pathway", async () => {
    const deckText = readFileSync(path.join(fixturesDir, "sample-portfolio-deck.txt"));
    const zip = new JSZip();

    const slides = deckText
      .toString("utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => line.replace(/^Slide \d+:\s*/, ""));

    slides.forEach((slide, index) => {
      zip.file(
        `ppt/slides/slide${index + 1}.xml`,
        `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${slide}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`
      );
    });

    const buffer = Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
    const parsed = await parsePortfolioDeck({ fileName: "portfolio-case-study.pptx", buffer });

    expect(parsed.category).toBe("portfolio_deck");
    expect(parsed.metadata.slideCount).toBe(12);
    expect(parsed.rawText).toContain("activation increased");
  });
});

describe("URL summarizers", () => {
  it("summarizes portfolio HTML without fetching", () => {
    const summary = summarizePortfolioHtml(
      "https://jordansite.dev",
      `
        <html>
          <head><title>Jordan Lee Portfolio</title></head>
          <body>
            <h1>Onboarding redesign</h1>
            <p>Improved activation by 13% after redesigning setup flow.</p>
            <a href="mailto:jordan@example.com">Email</a>
            <a href="https://github.com/jordanlee">GitHub</a>
          </body>
        </html>
      `
    );

    expect(summary.projectCount).toBeGreaterThan(0);
    expect(summary.hasContactSignal).toBe(true);
    expect(summary.hasGithubLink).toBe(true);
  });

  it("summarizes GitHub profile data without network calls", () => {
    const summary = summarizeGithubProfile(
      {
        login: "jordanlee",
        name: "Jordan Lee",
        bio: "PM building analytics products",
        public_repos: 12,
        followers: 18,
        following: 4
      },
      [
        {
          name: "analytics-workbench",
          description: "Experiment tracking dashboard",
          language: "TypeScript",
          stargazers_count: 24,
          fork: false,
          updated_at: "2026-04-20T00:00:00.000Z"
        }
      ]
    );

    expect(summary.text).toContain("analytics-workbench");
    expect(summary.topLanguages).toContain("TypeScript");
  });
});
