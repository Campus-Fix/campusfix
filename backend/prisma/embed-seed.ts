import { PrismaClient } from '@prisma/client';
import { embedText, findSimilar } from '../src/services/duplicate.service.js';

const prisma = new PrismaClient();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🔍 Checking complaints without embeddings in database...');

  const pending = await prisma.$queryRaw<{ id: number; ticket_code: string; title: string; description: string }[]>`
    SELECT id, ticket_code, title, description
    FROM complaints
    WHERE embedding IS NULL
    ORDER BY id ASC;
  `;

  console.log(`Found ${pending.length} complaints requiring vector embeddings.`);

  if (pending.length === 0) {
    console.log('All complaints already possess embeddings. Proceeding directly to verification.');
  }

  let successCount = 0;
  for (let i = 0; i < pending.length; i++) {
    const c = pending[i];
    const textToEmbed = `${c.title}\n${c.description}`;

    try {
      const vector = await embedText(textToEmbed);
      if (vector && vector.length === 768) {
        const vectorStr = `[${vector.join(',')}]`;
        await prisma.$executeRaw`
          UPDATE complaints
          SET embedding = ${vectorStr}::vector
          WHERE id = ${c.id};
        `;
        successCount++;
        console.log(`[${i + 1}/${pending.length}] ✅ Embedded ${c.ticket_code}: "${c.title.slice(0, 45)}..."`);
      } else {
        console.warn(`[${i + 1}/${pending.length}] ⚠️ Failed to generate 768-dim vector for ${c.ticket_code} (vector length: ${vector?.length || 0})`);
      }
    } catch (err) {
      console.error(`[${i + 1}/${pending.length}] ❌ Error embedding ${c.ticket_code}:`, err);
    }

    // Rate-limit pause of 700ms between calls
    if (i < pending.length - 1) {
      await sleep(700);
    }
  }

  console.log(`\n🎉 Embedding process finished: ${successCount}/${pending.length} complaints updated.`);

  // Verification: Test findSimilar with "wifi not working in block C"
  console.log('\n======================================================');
  console.log('🧪 Running Verification Test: findSimilar("wifi not working in block C")');
  console.log('======================================================');

  const matches = await findSimilar({
    title: 'wifi not working in block C',
    description: 'No internet connection or wifi access in Block C 2nd floor classrooms since morning.',
  });

  if (matches.length === 0) {
    console.log('No similar complaints found (either similarity < 0.80 or embeddings not populated yet).');
  } else {
    console.log(`Found ${matches.length} matching complaints with similarity >= 0.80:`);
    matches.forEach((m, idx) => {
      console.log(`  ${idx + 1}. [${(m.similarity * 100).toFixed(1)}%] ${m.ticketCode} - "${m.title}" (${m.location}, Status: ${m.status})`);
    });
  }
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('Fatal error in embed-seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
