import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import Next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { translateText } from './lib/openrouter-client';
import { translateWithLibreTranslate } from './lib/libretranslate-client';
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
          const translatedText = await translateText({
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
            translatedText,
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

        const translatedText = await translateText({
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
          translatedText,
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
        deepgramModel = 'nova-2',
        openRouterKey,
        openRouterModel = 'google/gemini-flash-1.5',
        inputLang = 'fr',
        outputLang = 'en',
        enablePolishing = false,
      } = auth;

      console.log('Client config:', { deepgramModel, openRouterModel, inputLang, outputLang, enablePolishing });

      if (!deepgramKey || !openRouterKey) {
        socket.emit('error', { message: 'Missing API keys' });
        socket.disconnect();
        return;
      }

      // Create database session
      let dbSession;
      try {
        dbSession = await prisma.session.create({
          data: {},
        });
        console.log('Created database session:', dbSession.id);
        socket.emit('session-created', { sessionId: dbSession.id });
      } catch (error) {
        console.error('Failed to create session:', error);
        socket.emit('error', { message: 'Failed to create session' });
        socket.disconnect();
        return;
      }

      // Initialize Deepgram with dynamic config
      const deepgram = createClient(deepgramKey);
      const dgConnection = deepgram.listen.live({
        model: deepgramModel,
        language: inputLang,
        smart_format: true,
        interim_results: true,
      });

      let sessionStartTime = Date.now();

      dgConnection.on(LiveTranscriptionEvents.Open, () => {
        console.log('Deepgram connection opened');
        socket.emit('deepgram-ready');
      });

      dgConnection.on(LiveTranscriptionEvents.Transcript, async (data) => {
        const transcript = data.channel?.alternatives[0]?.transcript;
        const isFinal = data.is_final;

        if (!transcript) return;

        console.log('Deepgram transcript:', { transcript, isFinal });

        // Emit original transcript immediately
        socket.emit('transcript', {
          text: transcript,
          isFinal,
          language: inputLang,
        });

        // Only translate final transcripts
        if (isFinal && transcript.trim().length > 0) {
          try {
            console.log('Translating final transcript:', transcript);

            // Instant translation using LibreTranslate
            const instantTranslation = await translateWithLibreTranslate({
              text: transcript,
              sourceLang: inputLang,
              targetLang: outputLang,
            });

            console.log('Instant translation:', instantTranslation);

            const now = new Date();
            const segment: TranscriptSegment = {
              startOffsetMs: Date.now() - sessionStartTime,
              endOffsetMs: Date.now() - sessionStartTime,
              originalText: transcript,
              translatedText: instantTranslation,
              isFinal: true,
            };

            // Save to database
            try {
              await prisma.transcriptSegment.create({
                data: {
                  sessionId: dbSession.id,
                  startTime: now,
                  endTime: now,
                  originalText: transcript,
                  translatedText: instantTranslation,
                  isFinal: true,
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

            socket.emit('instant-translation', segment);
          } catch (error) {
            console.error('Instant translation error:', error);
            socket.emit('error', { message: 'Translation failed' });
          }
        }
      });

      dgConnection.on(LiveTranscriptionEvents.Error, (error) => {
        console.error('Deepgram error:', error);
        socket.emit('error', { message: 'Transcription error' });
      });

      socket.on('audio-chunk', (data) => {
        if (dgConnection.getReadyState() === 1) {
          console.log('Received audio chunk, sending to Deepgram');
          dgConnection.send(data);
        } else {
          console.warn('Deepgram not ready, skipping chunk');
        }
      });

      socket.on('disconnect', async () => {
        console.log('Client disconnected', socket.id);
        dgConnection.finish();

        // Update session duration
        try {
          const duration = Math.floor((Date.now() - sessionStartTime) / 1000); // seconds
          await prisma.session.update({
            where: { id: dbSession.id },
            data: { duration },
          });
          console.log('Updated session duration:', duration, 'seconds');
        } catch (error) {
          console.error('Failed to update session duration:', error);
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
