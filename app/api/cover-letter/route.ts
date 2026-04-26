import { NextResponse } from "next/server";
import {
  createSessionWithDocument,
  getLatestDocumentText,
  loadSession,
  saveCoverLetterScore,
  upsertSessionDocument
} from "@/lib/sessionStore";
import { normalizeText } from "@/lib/documents";
import { parseIncomingDocument, assertScorableDocument } from "@/lib/server/document-workflow";
import { scoreCoverLetterWithGemini } from "@/lib/scorer";

export const runtime = "nodejs";

function fallbackMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("GEMINI_API_KEY")) {
      return "Gemini scoring is not configured yet. Add GEMINI_API_KEY to your environment.";
    }

    return error.message;
  }

  return "We had trouble reading your document. Try pasting as plain text.";
}

function collectContradictionFlags(resumeText: string, coverLetterText: string) {
  const flags: string[] = [];
  const lowerResume = resumeText.toLowerCase();
  const lowerCoverLetter = coverLetterText.toLowerCase();

  const signals = ["sql", "python", "product strategy", "analytics", "leadership"];
  for (const signal of signals) {
    if (lowerCoverLetter.includes(signal) && !lowerResume.includes(signal)) {
      flags.push(`Cover letter mentions "${signal}" without matching proof in the resume.`);
    }
  }

  return flags.slice(0, 4);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId?: string;
      coverLetterText?: string;
      fileName?: string;
      fileBase64?: string;
      jobDescription?: string;
      resumeText?: string;
    };

    const parsed = await parseIncomingDocument({
      documentType: "cover_letter",
      rawText: body.coverLetterText,
      fileName: body.fileName,
      fileBase64: body.fileBase64
    });
    assertScorableDocument(parsed);

    const score = await scoreCoverLetterWithGemini(parsed.rawText, normalizeText(body.jobDescription ?? ""));
    const documentRecord = {
      type: "cover_letter" as const,
      rawText: parsed.rawText,
      filePath: body.fileName
    };

    let session = body.sessionId ? await loadSession(body.sessionId) : null;
    if (!session) {
      session = await createSessionWithDocument(documentRecord, { coverLetterScore: score });
    } else {
      session = await upsertSessionDocument(session, documentRecord);
      session = await saveCoverLetterScore(session, score);
    }

    const directResumeText = normalizeText(body.resumeText ?? "");
    const sessionResumeText =
      getLatestDocumentText(session, "resume") || getLatestDocumentText(session, "linkedin_export");
    const resumeText = directResumeText || sessionResumeText;
    const contradictionFlags = resumeText
      ? collectContradictionFlags(resumeText, parsed.rawText)
      : [];

    return NextResponse.json({
      sessionId: session.id,
      score,
      contradictionFlags,
      parsedDocument: parsed
    });
  } catch (error) {
    return NextResponse.json({ error: fallbackMessage(error) }, { status: 500 });
  }
}
