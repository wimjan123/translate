# Live Translation Web App - Project Documentation

## Overview
Real-time audio translation web application supporting French to English translation with streaming and file upload capabilities.

## Tech Stack
- **Frontend**: Next.js 14+ (App Router), TailwindCSS, Lucide Icons
- **Backend**: Node.js custom server (Fastify + Socket.io)
- **Database**: PostgreSQL 16 with Prisma ORM
- **Speech-to-Text**: Deepgram SDK v3 (Nova-2 model)
- **Translation**: OpenRouter API (Gemini Flash / Llama 3)
- **Infrastructure**: Docker + Traefik reverse proxy
- **Domain**: translation.polibase.nl

## Architecture & Conventions

### Port Configuration
- **Development**:
  - App picks a random free port automatically (typically 3000-3010)
  - Check console output for actual URL
  - Port is dynamically allocated using Node.js net module

- **Production**:
  - Runs on PORT=4000 (set via environment variable)
  - Traefik routes external traffic to internal port 4000
  - WebSocket connections handled through same port

### WebSocket Communication
- **Production**: Client connects to `wss://translation.polibase.nl`
- **Development**: Client connects to relative path (handled by Next.js dev server)
- **Environment Variable**: Use `NEXT_PUBLIC_SOCKET_URL` for client-side configuration
- **Path**: Socket.io uses standard `/socket.io` path

### Translation Pipeline
1. **Audio Capture**: Browser MediaRecorder → WebSocket chunks
2. **Transcription**: Deepgram Nova-2/3 (smart_format=true, multi-language support)
3. **Instant Translation**: LibreTranslate for immediate feedback (rawTranslation)
4. **Buffering**: Collect `is_final=true` chunks for batch processing
5. **Polish Translation**: OpenRouter LLM for high-quality translation (polishedTranslation)
6. **Delivery**: Emit both instant and polished translations to client

### Critical Translation Rules
**IMPORTANT**: These rules MUST be followed to ensure translation quality and data integrity:

1. **ALWAYS send original language text to LLM**
   - Never send LibreTranslate output to OpenRouter
   - The LLM must receive the source language (Dutch, French, etc.) directly
   - This ensures highest translation accuracy

2. **Maintain data field separation**
   - `originalText`: Source language transcript from Deepgram
   - `rawTranslation`: LibreTranslate instant translation (fast, basic quality)
   - `polishedTranslation`: OpenRouter LLM translation (slower, high quality)
   - UI must fallback: polishedTranslation → rawTranslation → "Translating..."

3. **Prevent concurrent polishing operations**
   - Use session-level `isPolishing` flag as mutex
   - Check and acquire lock before any polish operation
   - Release lock in finally blocks to ensure cleanup
   - Both manual and automatic polish must respect the lock

4. **Supported Languages**
   - **Input**: French (fr), Dutch (nl), Spanish (es), German (de), Italian (it), Portuguese (pt), Russian (ru), Chinese (zh), Japanese (ja), Arabic (ar)
   - **Output**: English (en), French (fr), Dutch (nl), Spanish (es), German (de), Italian (it), Portuguese (pt), Russian (ru), Chinese (zh), Japanese (ja)

### Deepgram SDK v3 Integration
**Critical**: Use latest v3 syntax (NOT deprecated v2)
```javascript
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
const connection = deepgram.listen.live({
  model: 'nova-2',
  language: 'fr',
  smart_format: true,
  interim_results: true
});

connection.on(LiveTranscriptionEvents.Open, () => { /* ready */ });
connection.on(LiveTranscriptionEvents.Transcript, (data) => { /* handle */ });
```

## Development Commands

### Local Development
```bash
npm install                # Install dependencies
npm run dev                # Start dev server (random port)
npx prisma generate        # Generate Prisma client
npx prisma db push         # Sync database schema
npx prisma studio          # Open database GUI
```

### Production Deployment
```bash
docker compose build       # Build production image
docker compose up -d       # Start services in background
docker compose logs -f app # View application logs
docker compose down        # Stop all services
```

### Database Management
```bash
npx prisma migrate dev     # Create and apply migration
npx prisma migrate deploy  # Apply migrations (production)
npx prisma db push         # Quick schema sync (development)
```

## Environment Variables

### Required
- `DEEPGRAM_API_KEY`: Deepgram API key for speech-to-text
- `OPENROUTER_API_KEY`: OpenRouter API key for translation
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (production only, dev uses dynamic allocation)

### Optional
- `NODE_ENV`: Environment mode (development/production)
- `NEXT_PUBLIC_SOCKET_URL`: WebSocket URL for client connections

## Docker & Traefik Configuration

### Network Topology
- **External Network**: `traefik_traefik-network` (connects to existing Traefik)
- **Internal Network**: `internal_net` (app ↔ database communication)

### Traefik Labels
```yaml
traefik.http.routers.translator.rule=Host(`translation.polibase.nl`)
traefik.http.services.translator.loadbalancer.server.port=4000
```

### Verified Network Name
The existing Traefik network is: `traefik_traefik-network`

## Project Structure
```
/home/wvisser/translate/v1/
├── .claude/
│   ├── CLAUDE.md (this file)
│   └── agents/
│       └── translation-infra-specialist.md
├── src/
│   └── server.ts
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
├── lib/
│   └── openrouter-client.ts
├── prisma/
│   └── schema.prisma
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── next.config.js
└── .env.example
```

## Common Issues & Solutions

### Port Conflicts
- **Issue**: Port 3000 already in use
- **Solution**: Server automatically finds free port in development

### WebSocket Connection Failed
- **Issue**: Client can't connect to Socket.io
- **Production**: Verify Traefik labels and network configuration
- **Development**: Check that server started successfully and note the port

### Deepgram Connection Drops
- **Issue**: Connection closes after 10s silence
- **Solution**: Implement KeepAlive packets or handle reconnection

### Database Connection Error
- **Issue**: Can't connect to PostgreSQL
- **Solution**:
  - Check DATABASE_URL format
  - Ensure PostgreSQL container is running
  - Verify network connectivity (internal_net)

## Security Notes
- Never commit `.env` file with real API keys
- Use `.env.example` as template
- Traefik handles SSL/TLS certificates automatically
- CORS configured for production domain only

## Performance Optimization
- Buffer Deepgram transcripts until punctuation to reduce LLM calls
- Use Deepgram's `smart_format=true` for better punctuation
- Enable `interim_results` for faster user feedback
- Consider caching common translations

## Monitoring & Debugging
```bash
# View application logs
docker compose logs -f app

# Check container status
docker compose ps

# Inspect database
npx prisma studio

# Check Traefik routing
docker logs traefik

# Verify network connectivity
docker network inspect traefik_traefik-network
```

## Next Steps
1. Initialize database: `npx prisma db push`
2. Create `.env` with actual API keys
3. Test development server: `npm run dev`
4. Build production: `docker compose up --build`
5. Verify domain resolution and SSL certificate
