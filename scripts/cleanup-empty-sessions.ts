import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupEmptySessions() {
  try {
    console.log('Starting cleanup of sessions with 0 segments...');

    // Find all sessions with 0 segments
    const emptySessions = await prisma.session.findMany({
      where: {
        segmentCount: 0,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    console.log(`Found ${emptySessions.length} sessions with 0 segments`);

    if (emptySessions.length === 0) {
      console.log('No empty sessions to clean up');
      return;
    }

    // Delete all empty sessions
    const result = await prisma.session.deleteMany({
      where: {
        segmentCount: 0,
      },
    });

    console.log(`Successfully deleted ${result.count} empty sessions`);
  } catch (error) {
    console.error('Error cleaning up empty sessions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupEmptySessions();
