import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import Next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { translateText } from './lib/openrouter-client';
import { translateWithLibreTranslate } from './lib/libretranslate-client';
import { livePolishingManager } from './lib/live-polishing-manager';
import { getDeepgramLanguageCode, getLibreTranslateLanguageCode } from './lib/language-config';
import { detectDominantLanguage } from './lib/language-detection';
import { prisma } from './lib/prisma';
import type { SocketAuth, TranscriptSegment } from './types/settings';

const dev = process.env.NODE_ENV !== 'production';
// Dynamic port logic: Use env PORT in prod, or 0 (random free port) in dev
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 0;

console.log(`Starting server in ${dev ? 'development' : 'production'} mode on port ${port || 'dynamic'}`);

// Next.js always uses 'localhost' for internal routing, regardless of deployment
const app = Next({ dev, hostname: 'localhost', port: port || 3000 });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const fastify = Fastify({ logger: true });

  // Register plugins
  await fastify.register(multipart);
  await fastify.register(cors, { origin: '*' });

  // Polish Session Route (direct Fastify endpoint to avoid Next.js conflicts)
  fastify.post('/api/sessions/:id/polish', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const { openRouterKey, openRouterModel, sourceLang, targetLang } = body;

      if (!openRouterKey || !openRouterModel) {
        return reply.code(400).send({ error: 'Missing API keys or model' });
      }

      // Fetch session with segments ORDERED BY TIME
      const session = await prisma.session.findUnique({
        where: { id },
        include: {
          segments: {
            orderBy: { startTime: 'asc' }, // Ensure chronological order
          },
        },
      });

      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      if (session.segments.length === 0) {
        return reply.code(400).send({ error: 'No segments to polish' });
      }

      // Combine all segments with numbered markers for batch processing
      const numberedSegments = session.segments
        .map((seg, idx) => `[SEGMENT_${idx + 1}]\n${seg.originalText}\n[END_SEGMENT_${idx + 1}]`)
        .join('\n\n');

      // Send ALL segments in one API call with full context
      const polishedResponse = await translateText({
        text: numberedSegments,
        sourceLang: sourceLang || 'fr',
        targetLang: targetLang || 'en',
        model: openRouterModel,
        apiKey: openRouterKey,
        isPolishing: true,
        isBatch: true, // New flag for batch mode
      });

      // Parse the response back into individual segments
      const segmentPattern = /\[SEGMENT_(\d+)\]([\s\S]*?)\[END_SEGMENT_\d+\]/g;
      const polishedSegmentsMap = new Map<number, string>();

      let match;
      while ((match = segmentPattern.exec(polishedResponse)) !== null) {
        const segmentNum = parseInt(match[1]);
        const polishedText = match[2].trim();
        polishedSegmentsMap.set(segmentNum - 1, polishedText); // 0-indexed
      }

      // Update all segments in parallel with proper error handling
      const updatePromises = session.segments.map(async (segment, idx) => {
        const polishedTranslation = polishedSegmentsMap.get(idx) || segment.rawTranslation; // Fallback to raw translation if parsing failed

        if (!polishedSegmentsMap.has(idx)) {
          fastify.log.warn(`Failed to parse polished text for segment ${idx + 1}, using original translation`);
        }

        return prisma.transcriptSegment.update({
          where: { id: segment.id },
          data: { polishedTranslation },
        });
      });

      const updatedSegments = await Promise.all(updatePromises);

      return reply.send({
        success: true,
        segmentsPolished: updatedSegments.length,
        segments: updatedSegments,
      });
    } catch (error) {
      fastify.log.error(error, 'Failed to polish session');

      // Pass through the actual error message from OpenRouter API
      const errorMessage = error instanceof Error ? error.message : 'Failed to polish session';

      return reply.code(500).send({ error: errorMessage });
    }
  });

  // File Upload Route
  fastify.post('/api/upload', async (req, reply) => {
    try {
      const data = await req.file();
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      // Extract config from headers
      const deepgramKey = req.headers['x-deepgram-key'] as string;
      const deepgramModel = (req.headers['x-deepgram-model'] as string) || 'nova-2';
      const openRouterKey = req.headers['x-openrouter-key'] as string;
      const openRouterModel = (req.headers['x-openrouter-model'] as string) || 'google/gemini-flash-1.5';
      const inputLang = (req.headers['x-input-lang'] as string) || 'fr';
      const outputLang = (req.headers['x-output-lang'] as string) || 'en';

      if (!deepgramKey || !openRouterKey) {
        return reply.code(400).send({ error: 'Missing API keys in headers' });
      }

      // Convert file to buffer
      const buffer = await data.toBuffer();

      // Transcribe with Deepgram Prerecorded API
      const deepgram = createClient(deepgramKey);
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        buffer,
        {
          model: deepgramModel,
          language: inputLang,
          smart_format: true,
          punctuate: true,
        }
      );

      if (error) {
        throw error;
      }

      // Extract transcript segments
      const segments: TranscriptSegment[] = [];
      const words = result.results?.channels[0]?.alternatives[0]?.words || [];

      if (words.length === 0) {
        return reply.send({ segments: [], message: 'No speech detected' });
      }

      // Group words into sentences based on punctuation
      let currentSentence: typeof words = [];

      for (const word of words) {
        currentSentence.push(word);

        if (word.punctuated_word?.match(/[.!?。！？]$/)) {
          const originalText = currentSentence.map(w => w.punctuated_word || w.word).join(' ');
          const startOffsetMs = Math.floor((currentSentence[0].start || 0) * 1000);
          const endOffsetMs = Math.floor((currentSentence[currentSentence.length - 1].end || 0) * 1000);

          // Translate
          const rawTranslation = await translateText({
            text: originalText,
            sourceLang: inputLang,
            targetLang: outputLang,
            model: openRouterModel,
            apiKey: openRouterKey,
          });

          segments.push({
            startOffsetMs,
            endOffsetMs,
            originalText,
            rawTranslation,
            isFinal: true,
          });

          currentSentence = [];
        }
      }

      // Handle remaining words
      if (currentSentence.length > 0) {
        const originalText = currentSentence.map(w => w.punctuated_word || w.word).join(' ');
        const startOffsetMs = Math.floor((currentSentence[0].start || 0) * 1000);
        const endOffsetMs = Math.floor((currentSentence[currentSentence.length - 1].end || 0) * 1000);

        const rawTranslation = await translateText({
          text: originalText,
          sourceLang: inputLang,
          targetLang: outputLang,
          model: openRouterModel,
          apiKey: openRouterKey,
        });

        segments.push({
          startOffsetMs,
          endOffsetMs,
          originalText,
          rawTranslation,
          isFinal: true,
        });
      }

      return reply.send({ segments });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Processing failed' });
    }
  });

  // Handle all Next.js requests (must be last)
  fastify.setNotFoundHandler(async (req, reply) => {
    reply.hijack();
    await handle(req.raw, reply.raw);
  });

  // Start Server
  try {
    const address = await fastify.listen({ port, host: '0.0.0.0' });
    const actualPort = (fastify.server.address() as any).port;
    console.log(`> Server ready on ${address} (Port: ${actualPort})`);

    // Initialize Socket.io
    const io = new SocketIOServer(fastify.server, {
      path: '/socket.io',
      cors: { origin: '*' }
    });

    io.on('connection', async (socket) => {
      console.log('Client connected', socket.id);

      // Extract dynamic config from handshake
      const auth = socket.handshake.auth as SocketAuth;
      const {
        deepgramKey,
        deepgramModel = 'nova-3',
        openRouterKey,
        openRouterModel = 'google/gemini-flash-1.5',
        inputLang = 'fr',
        outputLang = 'en',
        enableLivePolishing = false,
        polishingInterval = 30,
        polishingBatchSize = 5,
        // 2-way mode fields
        sessionMode = 'one-way',
        languageA,
        languageB,
      } = auth;

      const isTwoWayMode = sessionMode === 'two-way' && languageA && languageB;

      console.log('Client config:', {
        deepgramModel, openRouterModel, inputLang, outputLang,
        enableLivePolishing, polishingInterval, polishingBatchSize,
        sessionMode, languageA, languageB
      });

      if (!deepgramKey || !openRouterKey) {
        socket.emit('error', { message: 'Missing API keys' });
        socket.disconnect();
        return;
      }

      // Session will be created lazily on first audio chunk
      let dbSession: any = null;
      let sessionCreated = false;

      // Initialize Deepgram with dynamic config
      const deepgram = createClient(deepgramKey);
      // For 2-way mode, use 'multi' for multilingual detection; otherwise use configured language
      const deepgramLangCode = isTwoWayMode ? 'multi' : getDeepgramLanguageCode(inputLang);
      let dgConnection: any = null;
      let dgConnectionReady = false;
      let pendingAudioChunk: any = null;
      let isRecreatingConnection = false;

      let sessionStartTime = Date.now();

      // Function to create Deepgram connection
      const createDeepgramConnection = () => {
        // Mark that we're intentionally recreating
        isRecreatingConnection = true;

        // Close existing connection if any
        if (dgConnection) {
          try {
            dgConnection.finish();
          } catch (e) {
            console.log('Error closing previous Deepgram connection:', e);
          }
          dgConnection = null;
          dgConnectionReady = false;
        }

        console.log('Creating new Deepgram connection...');
        dgConnection = deepgram.listen.live({
          model: deepgramModel,
          language: deepgramLangCode,
          smart_format: true,
          interim_results: true,
        });

        dgConnection.on(LiveTranscriptionEvents.Open, () => {
          console.log('Deepgram connection opened');
          dgConnectionReady = true;
          isRecreatingConnection = false;
          socket.emit('deepgram-ready');

          // Send any pending audio chunk
          if (pendingAudioChunk) {
            console.log('Sending pending audio chunk after reconnection');
            dgConnection.send(pendingAudioChunk);
            pendingAudioChunk = null;
          }
        });

        dgConnection.on(LiveTranscriptionEvents.Close, () => {
          console.log('Deepgram connection closed');
          dgConnectionReady = false;
          // Only notify client if this was an unexpected close, not during recreation
          if (!isRecreatingConnection) {
            socket.emit('deepgram-closed');
          }
        });

        dgConnection.on(LiveTranscriptionEvents.Transcript, async (data: any) => {
        const transcript = data.channel?.alternatives[0]?.transcript;
        const words = data.channel?.alternatives[0]?.words || [];
        const isFinal = data.is_final;

        if (!transcript) return;

        console.log('Deepgram transcript:', { transcript, isFinal, wordCount: words.length });

        // Determine source and target languages
        let sourceLang = inputLang;
        let targetLang = outputLang;
        let detectedLanguage: string | undefined;
        let translationDirection: 'A_to_B' | 'B_to_A' | undefined;

        // For 2-way mode, detect language from words
        if (isTwoWayMode && words.length > 0) {
          const detection = detectDominantLanguage(words, languageA!, languageB!);
          sourceLang = detection.language;
          targetLang = detection.other;
          detectedLanguage = detection.language;
          translationDirection = detection.language === languageA ? 'A_to_B' : 'B_to_A';
          console.log('2-way language detection:', { detected: detectedLanguage, confidence: detection.confidence, direction: translationDirection });
        }

        // Emit original transcript immediately
        socket.emit('transcript', {
          text: transcript,
          isFinal,
          language: detectedLanguage || inputLang,
        });

        // Only translate final transcripts
        if (isFinal && transcript.trim().length > 0) {
          try {
            console.log('Translating final transcript:', transcript, 'from', sourceLang, 'to', targetLang);

            // Instant translation using LibreTranslate
            const sourceLibreLang = getLibreTranslateLanguageCode(sourceLang);
            const targetLibreLang = getLibreTranslateLanguageCode(targetLang);
            const instantTranslation = await translateWithLibreTranslate({
              text: transcript,
              sourceLang: sourceLibreLang,
              targetLang: targetLibreLang,
            });

            console.log('Instant translation:', instantTranslation);

            const now = new Date();
            const segment: TranscriptSegment = {
              startOffsetMs: Date.now() - sessionStartTime,
              endOffsetMs: Date.now() - sessionStartTime,
              originalText: transcript,
              rawTranslation: instantTranslation,
              isFinal: true,
              // 2-way mode fields
              detectedLanguage,
              translationDirection,
            };

            // Save to database (only if session was created)
            if (sessionCreated && dbSession) {
              try {
                await prisma.transcriptSegment.create({
                  data: {
                    sessionId: dbSession.id,
                    startTime: now,
                    endTime: now,
                    originalText: transcript,
                    rawTranslation: instantTranslation,
                    isFinal: true,
                    detectedLanguage,
                    translationDirection,
                  },
                });

                // Update session segment count
                await prisma.session.update({
                  where: { id: dbSession.id },
                  data: {
                    segmentCount: { increment: 1 },
                  },
                });

                console.log('Saved segment to database');
              } catch (error) {
                console.error('Failed to save segment:', error);
              }
            }

            // Emit the appropriate event based on mode
            socket.emit(isTwoWayMode ? 'two-way-translation' : 'instant-translation', segment);
          } catch (error) {
            console.error('Instant translation error:', error);
            socket.emit('error', { message: 'Translation failed' });
          }
        }
        });

        dgConnection.on(LiveTranscriptionEvents.Error, (error: any) => {
          console.error('Deepgram error:', error);
          dgConnectionReady = false;
          socket.emit('error', { message: 'Transcription error' });
        });
      };

      // Create initial Deepgram connection
      createDeepgramConnection();

      socket.on('audio-chunk', async (data) => {
        // Create session lazily on first audio chunk
        if (!sessionCreated) {
          try {
            dbSession = await prisma.session.create({
              data: {
                inputLanguage: isTwoWayMode ? languageA! : inputLang,
                outputLanguage: isTwoWayMode ? languageB! : outputLang,
                mode: sessionMode,
                languageA: isTwoWayMode ? languageA : null,
                languageB: isTwoWayMode ? languageB : null,
              },
            });
            sessionCreated = true;
            sessionStartTime = Date.now(); // Reset start time when recording actually begins
            console.log('Created database session on first audio chunk:', dbSession.id, 'mode:', sessionMode);
            socket.emit('session-created', { sessionId: dbSession.id });

            // Start background polishing if enabled
            if (enableLivePolishing) {
              livePolishingManager.startBackgroundPolishing(dbSession.id, {
                enableLivePolishing,
                polishingInterval,
                polishingBatchSize,
              }, openRouterKey, openRouterModel);
            }
          } catch (error) {
            console.error('Failed to create session:', error);
            socket.emit('error', { message: 'Failed to create session' });
            return;
          }
        }

        // Check Deepgram connection state and recreate if needed
        if (!dgConnectionReady) {
          console.log('Deepgram connection not ready, recreating...');
          pendingAudioChunk = data; // Buffer this chunk
          createDeepgramConnection();
        } else {
          dgConnection.send(data);
        }
      });

      // Handle manual polish request
      socket.on('polish-current-session', async () => {
        if (!sessionCreated || !dbSession) {
          socket.emit('polish-error', { message: 'No active session' });
          return;
        }

        console.log('Manual polish requested for session:', dbSession.id);
        socket.emit('polish-started');

        try {
          const result = await livePolishingManager.attemptPolishing(dbSession.id, true, openRouterKey, openRouterModel);

          if (result.status === 'success') {
            // Fetch updated segments
            const updatedSession = await prisma.session.findUnique({
              where: { id: dbSession.id },
              include: {
                segments: {
                  orderBy: { startTime: 'asc' },
                },
              },
            });

            socket.emit('polish-completed', {
              segments: updatedSession?.segments || [],
              polishedCount: result.polishedCount,
            });
          } else if (result.status === 'busy') {
            socket.emit('polish-busy', { message: result.message });
          } else {
            socket.emit('polish-error', { message: result.message });
          }
        } catch (error) {
          console.error('Manual polish error:', error);
          socket.emit('polish-error', {
            message: error instanceof Error ? error.message : 'Polish failed'
          });
        }
      });

      socket.on('disconnect', async () => {
        console.log('Client disconnected', socket.id);
        if (dgConnection) {
          try {
            dgConnection.finish();
          } catch (e) {
            console.log('Error closing Deepgram connection on disconnect:', e);
          }
        }

        // Stop background polishing
        if (sessionCreated && dbSession) {
          livePolishingManager.stopBackgroundPolishing(dbSession.id);
        }

        // Clean up session
        if (sessionCreated && dbSession) {
          try {
            // Fetch session to check segment count
            const session = await prisma.session.findUnique({
              where: { id: dbSession.id },
              select: { segmentCount: true },
            });

            if (session && session.segmentCount === 0) {
              // Delete session with 0 segments
              await prisma.session.delete({
                where: { id: dbSession.id },
              });
              console.log('Deleted empty session:', dbSession.id);
            } else {
              // Update session duration for sessions with segments
              const duration = Math.floor((Date.now() - sessionStartTime) / 1000); // seconds
              await prisma.session.update({
                where: { id: dbSession.id },
                data: { duration },
              });
              console.log('Updated session duration:', duration, 'seconds');
            }
          } catch (error) {
            console.error('Failed to clean up session:', error);
          }
        }
      });
    });

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}).catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
