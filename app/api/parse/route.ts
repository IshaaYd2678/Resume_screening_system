import { NextResponse } from "next/server";
import { parseIncomingDocument } from "@/lib/server/document-workflow";
import type { DocumentCategory } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      documentType?: DocumentCategory;
      rawText?: string;
      fileName?: string;
      fileBase64?: string;
      sourceUrl?: string;
    };

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

    return NextResponse.json({ parsedDocument: parsed });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "We had trouble reading that file."
      },
      { status: 400 }
    );
  }
}
