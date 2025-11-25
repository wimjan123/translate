import { PrismaClient, Session, TranscriptSegment } from '@prisma/client';
import { translateTextWithLLM } from './openrouter-client';

const prisma = new PrismaClient();

export interface PolishingConfig {
  enableLivePolishing: boolean;
  polishingInterval: number; // seconds
  polishingBatchSize: number; // minimum segments before polishing
}

export class LivePolishingManager {
  private polishingTimers = new Map<string, NodeJS.Timeout>();
  private activePolishingSessions = new Set<string>();

  /**
   * Attempt to polish segments for a session with concurrency safety
   * @param sessionId - The session to polish
   * @param manual - Whether this was manually triggered
   * @param apiKey - OpenRouter API key
   * @param model - OpenRouter model to use
   * @returns Status of the polishing attempt
   */
  async attemptPolishing(
    sessionId: string,
    manual = false,
    apiKey?: string,
    model?: string
  ): Promise<{ status: 'success' | 'busy' | 'error'; message?: string; polishedCount?: number }> {
    // Check if already polishing (in-memory check for immediate response)
    if (this.activePolishingSessions.has(sessionId)) {
      return { status: 'busy', message: 'Session is already being polished' };
    }

    try {
      // Add to active set
      this.activePolishingSessions.add(sessionId);

      // Acquire database lock
      const session = await prisma.session.update({
        where: {
          id: sessionId,
          isPolishing: false // Only update if not already polishing
        },
        data: {
          isPolishing: true,
          polishingStatus: 'processing'
        },
        include: {
          segments: {
            where: {
              polishedTranslation: null,
              rawTranslation: { not: null }
            },
            orderBy: { startTime: 'asc' }
          }
        }
      }).catch(() => null);

      if (!session) {
        // Already polishing or session not found
        return { status: 'busy', message: 'Session is already being polished or not found' };
      }

      // Check if we have enough segments to polish
      const unpolishedSegments = session.segments;

      if (unpolishedSegments.length === 0) {
        // Nothing to polish, release lock
        await this.releaseLock(sessionId, 'idle');
        return { status: 'success', message: 'No segments to polish', polishedCount: 0 };
      }

      // For manual trigger, polish all. For automatic, check batch size
      if (!manual && unpolishedSegments.length < 5) {
        // Not enough segments for automatic polishing
        await this.releaseLock(sessionId, 'idle');
        return {
          status: 'success',
          message: `Waiting for more segments (${unpolishedSegments.length}/5)`,
          polishedCount: 0
        };
      }

      let totalPolished = 0;

      // Check if this is a 2-way session
      const isTwoWayMode = session.mode === 'two-way' && session.languageA && session.languageB;

      if (isTwoWayMode) {
        // Group segments by translation direction for 2-way mode
        const aToBSegments = unpolishedSegments.filter(s => s.translationDirection === 'A_to_B');
        const bToASegments = unpolishedSegments.filter(s => s.translationDirection === 'B_to_A');

        // Polish A->B segments (source=languageA, target=languageB)
        if (aToBSegments.length > 0) {
          const polished = await this.polishSegmentGroup(
            aToBSegments,
            session.languageA!,
            session.languageB!,
            apiKey,
            model
          );
          totalPolished += polished;
        }

        // Polish B->A segments (source=languageB, target=languageA)
        if (bToASegments.length > 0) {
          const polished = await this.polishSegmentGroup(
            bToASegments,
            session.languageB!,
            session.languageA!,
            apiKey,
            model
          );
          totalPolished += polished;
        }
      } else {
        // Original 1-way polishing logic
        const polished = await this.polishSegmentGroup(
          unpolishedSegments,
          session.inputLanguage,
          session.outputLanguage,
          apiKey,
          model
        );
        totalPolished = polished;
      }

      // Update session with completion info
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          lastPolishedAt: new Date(),
          lastPolishedIndex: totalPolished,  // Store count of polished segments
          polishingStatus: 'idle',
          isPolishing: false
        }
      });

      return {
        status: 'success',
        message: `Successfully polished ${totalPolished} segments`,
        polishedCount: totalPolished
      };

    } catch (error) {
      console.error('Polishing error:', error);
      await this.releaseLock(sessionId, 'error');
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    } finally {
      // Remove from active set
      this.activePolishingSessions.delete(sessionId);
    }
  }

  /**
   * Polish a group of segments with the same translation direction
   */
  private async polishSegmentGroup(
    segments: TranscriptSegment[],
    sourceLang: string,
    targetLang: string,
    apiKey?: string,
    model?: string
  ): Promise<number> {
    if (segments.length === 0) return 0;

    // Prepare segments for batch translation
    const originalTexts = segments.map(s => s.originalText);
    const numberedText = originalTexts
      .map((text, idx) => `[${idx + 1}] ${text}`)
      .join('\n');

    console.log(`Polishing ${segments.length} segments (${sourceLang} -> ${targetLang})`);

    // Call LLM for batch translation
    const polishedResult = await translateTextWithLLM({
      text: numberedText,
      sourceLang,
      targetLang,
      apiKey: apiKey || process.env.OPENROUTER_API_KEY || '',
      model: model || 'google/gemini-flash-1.5',
      isPolishing: true
    });

    // Parse the polished result back into segments
    const polishedSegmentsMap = this.parsePolishedResult(polishedResult);

    // Update segments in parallel
    const updatePromises = segments.map(async (segment, idx) => {
      const polishedTranslation = polishedSegmentsMap.get(idx) || segment.rawTranslation;

      if (!polishedSegmentsMap.has(idx)) {
        console.warn(`Failed to parse polished text for segment ${idx + 1}, using raw translation`);
      }

      return prisma.transcriptSegment.update({
        where: { id: segment.id },
        data: { polishedTranslation },
      });
    });

    const updatedSegments = await Promise.all(updatePromises);
    return updatedSegments.length;
  }

  /**
   * Start background polishing for a session
   */
  startBackgroundPolishing(
    sessionId: string,
    config: PolishingConfig,
    apiKey?: string,
    model?: string
  ): void {
    if (!config.enableLivePolishing) {
      return;
    }

    // Clear existing timer if any
    this.stopBackgroundPolishing(sessionId);

    // Set new timer
    const timer = setInterval(async () => {
      console.log(`Background polishing triggered for session ${sessionId}`);
      const result = await this.attemptPolishing(sessionId, false, apiKey, model);
      console.log(`Background polishing result:`, result);
    }, config.polishingInterval * 1000);

    this.polishingTimers.set(sessionId, timer);
    console.log(`Started background polishing for session ${sessionId} every ${config.polishingInterval}s`);
  }

  /**
   * Stop background polishing for a session
   */
  stopBackgroundPolishing(sessionId: string): void {
    const timer = this.polishingTimers.get(sessionId);
    if (timer) {
      clearInterval(timer as any);
      this.polishingTimers.delete(sessionId);
      console.log(`Stopped background polishing for session ${sessionId}`);
    }
  }

  /**
   * Stop all background polishing timers
   */
  stopAllBackgroundPolishing(): void {
    this.polishingTimers.forEach((timer, sessionId) => {
      clearInterval(timer as any);
      console.log(`Stopped background polishing for session ${sessionId}`);
    });
    this.polishingTimers.clear();
  }

  /**
   * Parse the numbered polished result back into a map
   */
  private parsePolishedResult(polishedText: string): Map<number, string> {
    const segmentsMap = new Map<number, string>();

    // Match numbered segments [1], [2], etc.
    const regex = /\[(\d+)\]\s*([^\[]+)/g;
    let match;

    while ((match = regex.exec(polishedText)) !== null) {
      const segmentNum = parseInt(match[1]);
      const polishedSegment = match[2].trim();
      segmentsMap.set(segmentNum - 1, polishedSegment); // 0-indexed
    }

    return segmentsMap;
  }

  /**
   * Release the polishing lock for a session
   */
  private async releaseLock(sessionId: string, status: string): Promise<void> {
    try {
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          isPolishing: false,
          polishingStatus: status
        }
      });
    } catch (error) {
      console.error(`Failed to release lock for session ${sessionId}:`, error);
    }
  }

  /**
   * Get polishing status for a session
   */
  async getPolishingStatus(sessionId: string): Promise<{
    isPolishing: boolean;
    status: string;
    lastPolishedAt: Date | null;
  }> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        isPolishing: true,
        polishingStatus: true,
        lastPolishedAt: true
      }
    });

    return {
      isPolishing: session?.isPolishing || false,
      status: session?.polishingStatus || 'idle',
      lastPolishedAt: session?.lastPolishedAt || null
    };
  }
}

// Export singleton instance
export const livePolishingManager = new LivePolishingManager();