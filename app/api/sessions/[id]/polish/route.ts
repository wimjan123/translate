import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { translateText } from '@/src/lib/openrouter-client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { openRouterKey, openRouterModel, sourceLang, targetLang } = body;

    if (!openRouterKey || !openRouterModel) {
      return NextResponse.json(
        { error: 'Missing API keys or model' },
        { status: 400 }
      );
    }

    // Fetch session with segments
    const session = await prisma.session.findUnique({
      where: { id: params.id },
      include: { segments: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.segments.length === 0) {
      return NextResponse.json(
        { error: 'No segments to polish' },
        { status: 400 }
      );
    }

    // Polish each segment
    const polishedSegments = [];
    for (const segment of session.segments) {
      // Use polishing mode (more natural, refined translation)
      const polishedText = await translateText({
        text: segment.originalText,
        sourceLang: sourceLang || 'fr',
        targetLang: targetLang || 'en',
        model: openRouterModel,
        apiKey: openRouterKey,
        isPolishing: true,
      });

      // Update segment with polished text
      const updated = await prisma.transcriptSegment.update({
        where: { id: segment.id },
        data: { polishedText },
      });

      polishedSegments.push(updated);
    }

    return NextResponse.json({
      success: true,
      segmentsPolished: polishedSegments.length,
      segments: polishedSegments,
    });
  } catch (error) {
    console.error('Failed to polish session:', error);
    return NextResponse.json(
      { error: 'Failed to polish session' },
      { status: 500 }
    );
  }
}
