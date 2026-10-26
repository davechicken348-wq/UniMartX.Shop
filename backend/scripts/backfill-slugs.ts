/**
 * One-time script to backfill slugs for sellers that have slug = null.
 * Run with: npx ts-node scripts/backfill-slugs.ts
 */
import prisma from '../src/lib/prisma';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  const sellers = await prisma.seller.findMany({
    where: { slug: null },
    select: { id: true, storeName: true },
  });

  console.log(`Found ${sellers.length} sellers with no slug.`);

  for (const seller of sellers) {
    const baseSlug = slugify(seller.storeName);
    let slug = baseSlug;
    let suffix = 1;
    while (await prisma.seller.findFirst({ where: { slug, id: { not: seller.id } } })) {
      slug = `${baseSlug}-${suffix++}`;
    }
    await prisma.seller.update({ where: { id: seller.id }, data: { slug } });
    console.log(`  ${seller.storeName} → ${slug}`);
  }

  console.log('Done.');
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
