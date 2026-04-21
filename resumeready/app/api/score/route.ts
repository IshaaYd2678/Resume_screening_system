import { NextResponse } from "next/server";
import {
  createSessionWithDocument,
  loadSession,
  saveCoverLetterScore,
  saveGeneralScore,
  savePortfolioScore,
  upsertSessionDocument
} from "@/lib/sessionStore";
import { parseIncomingDocument, assertScorableDocument } from "@/lib/server/document-workflow";
import {
  scoreCoverLetterWithGemini,
  scoreGithubWithGemini,
  scorePortfolioWithGemini,
  scoreResumeWithGemini
} from "@/lib/scorer";
import type { DocumentCategory, ScoreResponse } from "@/lib/types";

type ScoreRouteBody = {
  sessionId?: string;
  documentType?: DocumentCategory;
  rawText?: string;
  fileName?: string;
  fileBase64?: string;
  sourceUrl?: string;
  previousOverall?: number;
};

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
    const body = (await request.json()) as ScoreRouteBody;
    if (!body.documentType) {
      return NextResponse.json({ error: "Choose a document type to continue." }, { status: 400 });
    }

    const parsed = await parseIncomingDocument({
      documentType: body.documentType,
      rawText: body.rawText,
      fileName: body.fileName,
      fileBase64: body.fileBase64,
      sourceUrl: body.sourceUrl
    });

    assertScorableDocument(parsed);

    let score: ScoreResponse["score"];
    if (body.documentType === "cover_letter") {
      score = await scoreCoverLetterWithGemini(parsed.rawText);
    } else if (body.documentType === "portfolio_url") {
      score = await scorePortfolioWithGemini(parsed.rawText, "url");
    } else if (body.documentType === "portfolio_deck") {
      score = await scorePortfolioWithGemini(parsed.rawText, "deck");
    } else if (body.documentType === "github_url") {
      score = await scoreGithubWithGemini(parsed.rawText);
    } else {
      score = await scoreResumeWithGemini(parsed.rawText, body.documentType);
      const baseline =
        typeof body.previousOverall === "number" && Number.isFinite(body.previousOverall)
          ? body.previousOverall
          : undefined;
      if (baseline !== undefined) {
        score.delta = Math.round(score.overall - baseline);
      }
    }

    const documentRecord = {
      type: body.documentType,
      rawText: parsed.rawText,
      filePath: body.fileName,
      sourceUrl: body.sourceUrl
    };

    let session = body.sessionId ? await loadSession(body.sessionId) : null;

    if (!session) {
      if ("documentType" in score) {
        session = await createSessionWithDocument(documentRecord, { generalScore: score });
      } else if ("dimensions" in score) {
        session = await createSessionWithDocument(documentRecord, { coverLetterScore: score });
      } else {
        session = await createSessionWithDocument(documentRecord, { portfolioScore: score });
      }
    } else {
      session = await upsertSessionDocument(session, documentRecord);
      if ("documentType" in score) {
        session = await saveGeneralScore(session, score);
      } else if ("dimensions" in score) {
        session = await saveCoverLetterScore(session, score);
      } else {
        session = await savePortfolioScore(session, score);
      }
    }

    const response: ScoreResponse = {
      sessionId: session.id,
      score
    };

    return NextResponse.json({
      ...response,
      parsedDocument: parsed
    });
  } catch (error) {
    return NextResponse.json({ error: fallbackMessage(error) }, { status: 500 });
  }
}
