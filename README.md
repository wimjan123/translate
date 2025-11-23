# Live Translation Web App

Real-time French to English audio translation application using Deepgram for speech-to-text and OpenRouter for translation.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TailwindCSS
- **Backend**: Custom Node.js server (Fastify + Socket.io)
- **Database**: PostgreSQL 16 with Prisma ORM
- **Speech-to-Text**: Deepgram SDK v3 (Nova-2 model)
- **Translation**: OpenRouter API
- **Infrastructure**: Docker + Traefik reverse proxy
- **Production Domain**: translation.polibase.nl

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Deepgram API key ([Get one here](https://console.deepgram.com/))
- OpenRouter API key ([Get one here](https://openrouter.ai/keys))

### Local Development

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

3. **Initialize database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

   The server will automatically find a free port and display the URL in the console.

### Production Deployment

1. **Create `.env` file with production credentials:**
   ```bash
   cp .env.example .env
   # Add production API keys and database URL
   ```

2. **Build and start services:**
   ```bash
   docker compose up -d --build
   ```

3. **Run database migrations:**
   ```bash
   docker compose exec app npx prisma migrate deploy
   ```

4. **Verify deployment:**
   - Check logs: `docker compose logs -f app`
   - Visit: https://translation.polibase.nl

## Architecture

### Port Configuration

- **Development**: Dynamically allocated port (check console output)
- **Production**: PORT=4000 (configured in docker-compose.yml)
- **Traefik**: Routes translation.polibase.nl to internal port 4000

### Translation Pipeline

1. Browser captures audio via MediaRecorder
2. Audio chunks sent to server via Socket.io
3. Server forwards to Deepgram for transcription
4. Transcribed text sent to OpenRouter for translation
5. Translation emitted back to client in real-time

### Network Topology

- **External Network**: `traefik_traefik-network` (connects to Traefik)
- **Internal Network**: `internal_net` (app ↔ database)

## Available Commands

### Development
```bash
npm run dev              # Start development server
npm run build            # Build production bundle
npm run start            # Start production server
npm run lint             # Run ESLint
```

### Database
```bash
npx prisma generate      # Generate Prisma client
npx prisma db push       # Sync schema to database
npx prisma migrate dev   # Create and apply migration
npx prisma studio        # Open database GUI
```

### Docker
```bash
docker compose build     # Build images
docker compose up -d     # Start in background
docker compose down      # Stop services
docker compose logs -f   # View logs
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DEEPGRAM_API_KEY` | Deepgram API key | Yes |
| `OPENROUTER_API_KEY` | OpenRouter API key | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `PORT` | Server port (production only) | No (default: 4000) |
| `NODE_ENV` | Environment mode | No (default: development) |
| `NEXT_PUBLIC_SOCKET_URL` | Client WebSocket URL | No |

## Project Structure

```
/home/wvisser/translate/v1/
├── .claude/                  # Claude Code configuration
│   ├── CLAUDE.md            # Project documentation
│   └── agents/              # Custom agents
├── app/                     # Next.js App Router pages
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles
├── src/
│   └── server.ts            # Custom Fastify + Socket.io server
├── prisma/
│   └── schema.prisma        # Database schema
├── Dockerfile               # Production container image
├── docker-compose.yml       # Service orchestration
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── next.config.js           # Next.js configuration
```

## Troubleshooting

### Port Already in Use
The development server automatically finds a free port. Check the console output for the actual URL.

### WebSocket Connection Failed
- **Development**: Ensure the server started successfully
- **Production**: Verify Traefik labels and network configuration

### Database Connection Error
```bash
# Check if PostgreSQL is running
docker compose ps db

# View database logs
docker compose logs -f db

# Test connection
docker compose exec app npx prisma db push
```

### Deepgram Connection Drops
The Deepgram connection closes after 10 seconds of silence. This is normal behavior. Implement keep-alive packets if needed.

## Security Notes

- Never commit `.env` files with real API keys
- Use `.env.example` as a template
- Traefik handles SSL/TLS certificates automatically
- CORS is configured for the production domain

## Documentation

- **Project Documentation**: See `CLAUDE.md` for detailed architecture notes
- **Deepgram SDK**: https://developers.deepgram.com/home
- **Socket.io**: https://socket.io/docs/v4/
- **Prisma**: https://www.prisma.io/docs/

## License

MIT
