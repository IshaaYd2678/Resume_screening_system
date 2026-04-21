ResumeReady - Codex Agent Prompt (AGENTS.md)

Drop this file at the repo root. Codex reads it automatically at the start of
every session and uses it as persistent project context.

Agent identity

You are the primary engineer on ResumeReady, a career fitness platform. Your role: implement
features autonomously, write tests before code, verify everything passes before marking a task
done. Bias for action - do not ask for clarification on things you can infer. Ask only when a
decision would be irreversible or architecturally load-bearing.

Reasoning effort: use medium for routine implementation tasks. Use high for scoring logic,
document parsing, and anything touching the Claude API prompt templates.

Project overview

ResumeReady scores career documents - not just resumes - across two modes:

Growth mode (Lens 4): always-on fitness score, section gap analysis, improvement
coaching. Audience: passive upskilling users.

Apply mode (Lens 1): job-specific match score, keyword gap analysis, fast fixes. Audience:
active job seekers.

The core emotional positioning: fitness tracker, not screener. Every piece of copy, every label,
every error message should reflect coaching, not judgment.

Tech stack

Layer
Choice
Framework
Next.js 14 (App Router), TypeScript
Styling
Tailwind CSS - no component libraries
AI scoring
Anthropic Claude API (
claude-sonnet-4-20250514 )
Document
parsing
pdf-parse (PDF),
mammoth (DOCX),
(presentations),
xlsx (spreadsheets),
pptx-parser
linkedin-api wrapper (LinkedIn exports), plain text fallback
Storage
Local JSON (MVP); schema must be Postgres-ready
Layer
Choice
Auth
None for MVP
Testing
Vitest + Testing Library

Accepted document types

ResumeReady accepts seven document categories. Each has its own parser, extraction strategy,
and scoring adapter. Implement parsers in
lib/parsers/ .

1. Resume (
.pdf ,
.docx ,
.txt )

Primary document type - full scoring pipeline applies

Extract: summary, experience, skills, education, certifications, keywords

Scoring: all 7 section scores + overall fitness score

2. LinkedIn profile export (
.zip containing CSV files)

Users export from LinkedIn Settings -> Data privacy -> Get a copy of your data

ZIP contains:
Profile.csv ,
Positions.csv ,
Skills.csv ,
Certifications.csv ,
Recommendations.csv
Education.csv ,

Parser: unzip in memory, read relevant CSVs, reconstruct resume-shaped text

Scoring: same pipeline as resume, but flag missing sections that LinkedIn doesn't capture
(e.g. summary/objective line)

Show a callout: "LinkedIn exports often lack a strong summary - this affects your score.
Add one to boost by ~8 pts."

3. Portfolio / personal website (URL input, not file upload)

User pastes a URL; backend fetches and scrapes the page

Extract: project titles, descriptions, tech stack mentions, measurable outcomes, contact info
presence

Scoring: adapted rubric - weight projects and outcomes heavily, penalize missing contact
info or GitHub link

Flag: "Portfolio scores are advisory - use alongside a resume for best results"

4. Cover letter (
.pdf ,
.docx ,
.txt )

Standalone scoring mode separate from resume fitness

Extract: opening hook strength, role-specific tailoring, tone, call to action, length
appropriateness (target: 250-400 words)

Scoring dimensions: relevance, personalization, clarity, persuasiveness, length discipline

In apply mode: cross-score cover letter + resume against the same job description and flag
contradictions or gaps

5. GitHub profile (URL input)

User pastes their GitHub profile URL

Fetch via GitHub REST API (unauthenticated for MVP, rate-limit gracefully)

Extract: top repos, languages used, contribution frequency, README quality, star counts,
pinned project descriptions

Scoring: adapted for technical roles - weight contribution consistency, project diversity,
documentation quality

Use this as a supplement to resume scoring, not a standalone fitness score

Show: "GitHub supplements your resume score for technical roles."

6. Portfolio deck / case study (
.pdf ,
.pptx )

Common for designers, PMs, consultants uploading work samples

Extract: slide count, project titles, problem/solution framing, measurable outcomes, visual
consistency signals (number of distinct layouts detected), presentation flow

Scoring: problem clarity, outcome quantification, storytelling structure, length (target: 10
20 slides), professional tone in text content

Flag if slide count is under 8 or over 30

7. Performance review / self-assessment (
.pdf ,
.docx )

Users upload past perf reviews to extract resume-worthy achievements

Do NOT score the review itself - instead, extract quotable accomplishments and suggest
how to reframe them as resume bullets

Output: a list of 5-10 extracted achievements in resume bullet format ("Increased X by Y,
resulting in Z")

Show under a separate tab: "Achievements extracted from your review"

This is a utility feature, not a fitness score

Core data types

Define in
lib/types.ts . Do not deviate from these shapes.

```typescript
type ImpactLevel = 'high' | 'medium' | 'low'
type DocumentCategory =
| 'resume'
| 'linkedin_export'
| 'portfolio_url'
| 'cover_letter'
| 'github_url'
| 'portfolio_deck'
| 'performance_review'
interface ResumeSection {
  name: string
  score: number // 0-100
  impact: ImpactLevel
  impactWeight: number // 0.0-1.0
  suggestion: string // max 15 words
}
interface ResumeScore {
  overall: number
  percentile: number
  delta: number // vs previous scan; 0 on first
  sections: ResumeSection[]
  insightMessage: string // max 25 words, coaching tone
  scoredAt: string // ISO timestamp
  documentType: DocumentCategory
}
interface JobMatchScore extends ResumeScore {
  jobTitle: string
  matchScore: number
  matchLabel: string // e.g. "Strong - minor gaps"
  missingKeywords: string[]
  roleGaps: ResumeSection[]
}
interface CoverLetterScore {
  overall: number
  dimensions: {
    relevance: number
    personalization: number
    clarity: number
    persuasiveness: number
    lengthDiscipline: number
}
  wordCount: number
  insightMessage: string
  scoredAt: string
}
interface PortfolioScore {
  overall: number
  projectCount: number
  sections: ResumeSection[]
  insightMessage: string
  scoredAt: string
  sourceType: 'url' | 'deck'
}
interface ExtractedAchievement {
  raw: string // Original text from perf review
  bulletForm: string // Rewritten as resume bullet
  impactCategory: 'quantified' | 'qualitative' | 'leadership' | 'technical'
}
interface PerformanceReviewExtraction {
  achievements: ExtractedAchievement[]
  extractedAt: string
}
interface Session {
  id: string
  documents: {
    type: DocumentCategory
    rawText: string
    filePath?: string
    sourceUrl?: string
}[]
  generalScore: ResumeScore | null
  coverLetterScore: CoverLetterScore | null
  portfolioScore: PortfolioScore | null
  performanceExtractions: PerformanceReviewExtraction[]
  jobMatches: JobMatchScore[]
  createdAt: string
  updatedAt: string
}
```

Project structure

/
+
-- app/
|
+
-- page.tsx
|
+
-- dashboard/page.tsx
|
+
-- achievements/page.tsx
|   \\-- api/
|
+
-- score/route.ts
|
|
|
|
+
-- match/route.ts
+
-- cover-letter/route.ts
+
-- portfolio/route.ts
\\-- achievements/route.ts
+
-- components/
|
+
-- DocumentUploader.tsx
|
+
-- DocumentTypeSelector.tsx
|
+
-- ScoreCard.tsx
|
+
-- SectionList.tsx
|
+
-- ModeToggle.tsx
|
+
-- InsightBox.tsx
|
+
-- AchievementCard.tsx
|   \\-- CrossScorePanel.tsx
+
-- lib/
|
+
-- parsers/
|   |
+
-- resume.ts
|   |
+
-- linkedin.ts
|   |
+
-- portfolio-url.ts
|   |
+
-- github.ts
|   |
+
-- cover-letter.ts
|   |
+
-- portfolio-deck.ts
|   |   \\-- perf-review.ts
|
+
-- scorer.ts
|
+
-- types.ts
|   \\-- session.ts
+
-- data/
|
+
-- sessions/
|   \\-- fixtures/
|
|
|
|
+
-- sample-resume.txt
+
-- sample-cover-letter.txt
+
-- sample-linkedin-export/
\\-- sample-perf-review.txt
\\-- AGENTS.md

# Upload / onboarding entry
# Main scoring dashboard
# Perf review extraction view
# POST: general resume score
# POST: job match score
# POST: cover letter score
# POST: portfolio/deck score
# POST: perf review extraction
# Multi-type upload + URL inputs
# Picker for document category
# Extracted perf review bullets
# Resume + cover letter vs job
# PDF/DOCX/TXT -> plain text
# ZIP -> reconstructed resume text
# URL -> scraped text
# GitHub API -> profile summary
# PDF/DOCX/TXT -> plain text
# PDF/PPTX -> slide text
# PDF/DOCX -> plain text
# All Claude API prompt builders
# Shared interfaces (above)
# Session read/write helpers
# JSON session files
# Mock LinkedIn CSV files
# This file

API routes

POST
/api/score

Input:  { sessionId, documentType, rawText }

Output: ResumeScore | PortfolioScore | CoverLetterScore

Route to the correct scoring prompt based on
documentType . Save result to session. Return
typed score object.

POST
/api/match

Input:  { sessionId, jobDescription }

Output: JobMatchScore

Requires an existing
generalScore in the session. Appends to
JobMatchScore .

POST
/api/cover-letter
session.jobMatches . Returns

Input:  { sessionId, coverLetterText, jobDescription? }

Output: CoverLetterScore

If
jobDescription is provided, include alignment score. If both a resume and cover letter are in
session, also return contradiction flags.

POST
/api/portfolio

Input:  { sessionId, sourceType: 'url' | 'deck', content: string }

Output: PortfolioScore

POST
/api/achievements

Input:  { sessionId, rawText }

Output: PerformanceReviewExtraction

Does not score - only extracts and reformats bullets.

Scoring prompts (embed in
lib/scorer.ts )

Resume scoring prompt

You are an expert resume coach and talent acquisition specialist.
Cover letter scoring prompt
Analyze the resume below and return ONLY valid JSON - no preamble, no markdown.
Score these sections:- Summary / objective- Work experience (impact and quantification)- Skills relevance- Education formatting- Certifications and extras- Keywords and ATS optimization- Structure and readability
For each section return: name, score (0-100), impact ("high"|"medium"|"low"),
impactWeight (0.0-1.0), suggestion (max 15 words, specific and actionable).
Also return:- overall: weighted score (0-100)- percentile: estimated industry percentile (0-100)- insightMessage: highest-leverage improvement (max 25 words, warm coaching tone)- delta: 0- scoredAt: ISO timestamp
Return this exact shape: { overall, percentile, delta, sections[], insightMessage,
scoredAt }
Resume:
{{RESUME_TEXT}}
You are an expert career coach reviewing a cover letter.
Return ONLY valid JSON - no preamble, no markdown.
Score these dimensions (0-100 each):- relevance: how specific to the role/company- personalization: evidence of research beyond the job posting- clarity: clear structure, no fluff- persuasiveness: compelling reason to interview- lengthDiscipline: penalize if under 200 or over 500 words
Return wordCount and insightMessage (max 20 words, warm tone).
overall = average of the five dimension scores.
Shape: { overall, dimensions: { relevance, personalization, clarity,
persuasiveness, lengthDiscipline }, wordCount, insightMessage, scoredAt }
Cover letter:
{{COVER_LETTER_TEXT}}
{{JOB_DESCRIPTION_IF_PROVIDED}}

Portfolio scoring prompt

You are a senior creative director and portfolio reviewer.
Analyze this portfolio content and return ONLY valid JSON.
Score:- Project clarity: are problems and solutions clearly stated?- Outcome quantification: are results measurable?- Storytelling structure: logical flow from problem -> process -> outcome- Range and diversity: variety of project types and skills shown- Professional presentation: tone, grammar, consistency
Return: overall (0-100), projectCount (integer), sections[] with same shape as
resume sections, insightMessage (max 20 words).
Shape: { overall, projectCount, sections[], insightMessage, scoredAt }
Portfolio content:
{{PORTFOLIO_TEXT}}

Performance review extraction prompt

You are a career coach helping someone extract resume bullets from a performance
review.
Return ONLY valid JSON - no preamble, no markdown.
Read the review and identify 5-10 specific accomplishments.
For each, return:- raw: the original sentence or phrase from the review- bulletForm: rewritten as a strong resume bullet starting with an action verb,
including a metric if present ("Increased X by Y, resulting in Z")- impactCategory: "quantified" | "qualitative" | "leadership" | "technical"
Do not score. Only extract and rewrite.
Shape: { achievements: [{ raw, bulletForm, impactCategory }], extractedAt }
Performance review:
{{REVIEW_TEXT}}

Job match prompt

You are an ATS specialist and resume coach.
Analyze how well this resume matches the job description.
Return ONLY valid JSON - no preamble, no markdown.
Return:- matchScore (0-100): fit for this specific role- matchLabel: short descriptor e.g. "Strong - minor gaps"- missingKeywords: up to 5 specific terms from JD missing from resume- roleGaps: up to 4 sections most needing improvement for THIS role, each with
name, score, impact, impactWeight, suggestion (max 15 words)- insightMessage: single fastest fix to raise match score (max 25 words)- Also include full general score fields: overall, percentile, sections[]
Resume:
{{RESUME_TEXT}}
Shape: { overall, percentile, delta: 0, sections[], insightMessage, scoredAt,
jobTitle, matchScore, matchLabel, missingKeywords[], roleGaps[] }
Job Description:
{{JOB_DESCRIPTION}}

Document upload UX rules

Implement in
DocumentUploader.tsx and
DocumentTypeSelector.tsx :

Show a document type selector before or during upload - seven cards, one per category,
with a one-line description of what each does

File types accepted per category:

Resume:
.pdf ,
.docx ,
.txt

LinkedIn export:
.zip

Portfolio URL: text input (validate as URL)

Cover letter:
.pdf ,
.docx ,
.txt

GitHub: text input (validate as github.com URL)

Portfolio deck:
.pdf ,
.pptx

Performance review:
.pdf ,
.docx

Max file size: 10MB. Reject with: "That file is too large. Try exporting as plain text or
compressing the PDF."

Show a parsing progress state: "Reading your [document type]..."

After parsing, show a word count and document type confirmation before scoring

Copy and tone

Avoid
Use instead
"Screening score"
"Fitness score"
"Failed sections"
"Areas to strengthen"
"ATS rejection risk"
"Quick wins to unlock more callbacks"
"Your resume is weak"
"Here's where the biggest gains are"
"Error parsing file"
"We had trouble reading that file"
"No data found"
"Add more detail here to improve your score"

Always sentence case. No exclamation marks. No ALL CAPS in UI copy.

Build order

Complete each phase fully - all tests passing - before moving to the next.
Include steps to reproduce issues, validate features, and run linting checks.

Phase 1 - Foundation

Scaffold Next.js + TypeScript + Tailwind

Define all types in
lib/types.ts

Implement all 7 parsers in
lib/parsers/

Write unit tests for each parser against fixture files

Implement
lib/scorer.ts with all 5 prompt builders

Done when:
npm test passes for parsers with fixture inputs

Phase 2 - API routes

All 5 API routes implemented and returning correct types

Session persistence working in
data/sessions/

Error handling: bad JSON from Claude, empty documents, oversized files

Done when: all routes return correct shapes for fixture inputs via
curl

Landing page with DocumentTypeSelector and DocumentUploader

Dashboard: ScoreCard (overall + percentile), SectionList, InsightBox

ModeToggle: Growth mode active, Apply mode stub

Done when: full flow works end-to-end with a pasted resume

Phase 4 - Apply mode

Job description input, match score card, roleGaps list

CrossScorePanel: shows resume + cover letter side by side vs job

MissingKeywords list with inline "where to add this" hints

Done when: apply mode flow works end-to-end for a resume + JD

Phase 5 - Extended document types

LinkedIn ZIP upload and parsing

GitHub URL scoring

Portfolio URL scraping and scoring

Portfolio deck (.pptx) parsing and scoring

Cover letter scoring (standalone + vs job)

Performance review extraction + AchievementCard UI

Done when: all 7 document types flow through upload -> parse -> score/extract

Phase 6 - Polish

Score delta tracking between sessions

Skeleton loading states

Empty states for each document type

Responsive layout (375px minimum)

Dark mode

Error handling rules

Claude returns malformed JSON -> retry once -> surface: "We had trouble reading your
document. Try pasting as plain text."

Document text under 100 characters -> reject before API call: "Paste your full document to
get an accurate score."

GitHub API rate limit hit -> show cached result or: "GitHub rate limit reached. Try again in a
few minutes."

LinkedIn ZIP missing expected CSVs -> list which files are missing and link to LinkedIn's
export instructions

PPTX with no extractable text (image-only slides) -> flag: "This deck appears to be mostly
images. Add slide notes or text for a better score."

Never expose raw API errors, stack traces, or Claude prompt text in the UI

Testing fixtures

Create these files in
data/fixtures/ before Phase 1 tests:

sample-resume.txt - realistic but fictional resume, 400-600 words

sample-cover-letter.txt - 300-word cover letter for a PM role

sample-linkedin-export/ - mock CSVs matching LinkedIn's actual export format

sample-perf-review.txt - fictional Q4 performance review with 6-8 achievements

sample-portfolio-deck.txt - extracted text from a 12-slide PM case study deck

Out of scope for MVP

Do not build:

User accounts or auth

Resume editing inside the app

PDF export

Email / sharing

Paid tier / paywall

Mobile app

Scaffold the data layer to support these but do not implement.




