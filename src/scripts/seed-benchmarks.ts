
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demoBenchmarks = [
  {
    modelSlug: "anthropic/claude-opus-5.5",
    records: [
      {
        name: "DEMO - Reasoning Example",
        score: 78.5,
        category: "Demonstration only",
      },
      {
        name: "DEMO - Coding Example",
        score: 84.2,
        category: "Demonstration only",
      },
      {
        name: "DEMO - Mathematics Example",
        score: 81.7,
        category: "Demonstration only",
      },
    ],
  },
  {
    modelSlug: "openai/gpt-6-sol",
    records: [
      {
        name: "DEMO - Reasoning Example",
        score: 82.1,
        category: "Demonstration only",
      },
      {
        name: "DEMO - Coding Example",
        score: 80.6,
        category: "Demonstration only",
      },
      {
        name: "DEMO - Mathematics Example",
        score: 85.3,
        category: "Demonstration only",
      },
    ],
  },
];

async function main() {
  console.log("Starting OneAtlas demonstration benchmark seeding...");

  for (const item of demoBenchmarks) {
    const model = await prisma.model.findUnique({
      where: {
        slug: item.modelSlug,
      },
    });

    if (!model) {
      console.log(`Model not found: ${item.modelSlug}`);
      continue;
    }

    console.log(`\nProcessing: ${model.name}`);

    for (const record of item.records) {
      const existing = await prisma.benchmark.findFirst({
        where: {
          modelId: model.id,
          name: record.name,
        },
      });

      if (existing) {
        console.log(`Skipped existing record: ${record.name}`);
        continue;
      }

      await prisma.benchmark.create({
        data: {
          name: record.name,
          score: record.score,
          category: record.category,
          modelId: model.id,
        },
      });

      console.log(`Added: ${record.name} - ${record.score}`);
    }
  }

  console.log("\nDemonstration benchmark seeding completed.");
}

main()
  .catch((error) => {
    console.error("Benchmark seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
