import { NextResponse } from "next/server";
import { appendJobMatch, getLatestDocumentText, loadSession } from "@/lib/sessionStore";
import { matchResumeWithGemini } from "@/lib/scorer";
import { normalizeText } from "@/lib/documents";
import type { MatchResponse } from "@/lib/types";

function fallbackMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("GEMINI_API_KEY")) {
      return "Gemini scoring is not configured yet. Add GEMINI_API_KEY to your environment.";
    }

    return error.message;
  }

  return "We had trouble reading your document. Try pasting as plain text.";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId?: string;
      jobDescription?: string;
    };

    if (!body.sessionId) {
      return NextResponse.json({ error: "Start with a resume checkup first." }, { status: 400 });
    }

    const jobDescription = normalizeText(body.jobDescription ?? "");
    if (!jobDescription) {
      return NextResponse.json({ error: "Paste a job description to check role readiness." }, { status: 400 });
    }

    const session = await loadSession(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: "Start with a fresh resume checkup." }, { status: 404 });
    }

    const resumeText =
      getLatestDocumentText(session, "resume") || getLatestDocumentText(session, "linkedin_export");
    if (!resumeText) {
      return NextResponse.json({ error: "Upload a resume or LinkedIn export first." }, { status: 400 });
    }

    const documentType = getLatestDocumentText(session, "resume") ? "resume" : "linkedin_export";
    const match = await matchResumeWithGemini(resumeText, jobDescription, documentType);
    const savedSession = await appendJobMatch(session, match);
    const response: MatchResponse = { sessionId: savedSession.id, match };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: fallbackMessage(error) }, { status: 500 });
  }
}
