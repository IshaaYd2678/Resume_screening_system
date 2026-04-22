import { NextResponse } from "next/server";
import {
  createSessionWithDocument,
  loadSession,
  savePortfolioScore,
  upsertSessionDocument
} from "@/lib/sessionStore";
import { parseIncomingDocument, assertScorableDocument } from "@/lib/server/document-workflow";
import { scorePortfolioWithGemini } from "@/lib/scorer";

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
      sourceType?: "url" | "deck";
      content?: string;
      sourceUrl?: string;
      fileName?: string;
      fileBase64?: string;
    };

    if (!body.sourceType) {
      return NextResponse.json({ error: "Choose a portfolio source to continue." }, { status: 400 });
    }

    const documentType = body.sourceType === "url" ? "portfolio_url" : "portfolio_deck";
    const parsed = await parseIncomingDocument({
      documentType,
      rawText: body.content,
      sourceUrl: body.sourceUrl,
      fileName: body.fileName,
      fileBase64: body.fileBase64
    });
    assertScorableDocument(parsed);

    const score = await scorePortfolioWithGemini(parsed.rawText, body.sourceType);
    const documentRecord = {
      type: documentType as "portfolio_url" | "portfolio_deck",
      rawText: parsed.rawText,
      filePath: body.fileName,
      sourceUrl: body.sourceUrl
    };

    let session = body.sessionId ? await loadSession(body.sessionId) : null;
    if (!session) {
      session = await createSessionWithDocument(documentRecord, { portfolioScore: score });
    } else {
      session = await upsertSessionDocument(session, documentRecord);
      session = await savePortfolioScore(session, score);
    }

    return NextResponse.json({
      sessionId: session.id,
      score,
      parsedDocument: parsed
    });
  } catch (error) {
    return NextResponse.json({ error: fallbackMessage(error) }, { status: 500 });
  }
}
