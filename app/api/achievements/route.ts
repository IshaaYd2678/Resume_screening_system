import { NextResponse } from "next/server";
import {
  appendPerformanceExtraction,
  createSessionWithDocument,
  loadSession,
  upsertSessionDocument
} from "@/lib/sessionStore";
import { parseIncomingDocument, assertScorableDocument } from "@/lib/server/document-workflow";
import { extractPerformanceReviewWithGemini } from "@/lib/scorer";
import type { AchievementsResponse } from "@/lib/types";

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
      rawText?: string;
      fileName?: string;
      fileBase64?: string;
    };

    const parsed = await parseIncomingDocument({
      documentType: "performance_review",
      rawText: body.rawText,
      fileName: body.fileName,
      fileBase64: body.fileBase64
    });
    assertScorableDocument(parsed);

    const extraction = await extractPerformanceReviewWithGemini(parsed.rawText);
    const documentRecord = {
      type: "performance_review" as const,
      rawText: parsed.rawText,
      filePath: body.fileName
    };

    let session = body.sessionId ? await loadSession(body.sessionId) : null;
    if (!session) {
      session = await createSessionWithDocument(documentRecord, { performanceExtraction: extraction });
    } else {
      session = await upsertSessionDocument(session, documentRecord);
      session = await appendPerformanceExtraction(session, extraction);
    }

    const response: AchievementsResponse = {
      sessionId: session.id,
      extraction
    };

    return NextResponse.json({
      ...response,
      parsedDocument: parsed
    });
  } catch (error) {
    return NextResponse.json({ error: fallbackMessage(error) }, { status: 500 });
  }
}
