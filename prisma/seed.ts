
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OPENROUTER_API = "https://openrouter.ai/api/v1/models";
const MODEL_LIMIT = 100;

function getLabName(modelId: string): string {
  const prefix = modelId.split("/")[0].toLowerCase();

  const labs: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    meta: "Meta",
    mistralai: "Mistral AI",
    deepseek: "DeepSeek",
    qwen: "Alibaba Qwen",
    "x-ai": "xAI",
    cohere: "Cohere",
    perplexity: "Perplexity",
    microsoft: "Microsoft",
    nvidia: "NVIDIA",
    amazon: "Amazon",
  };

  return labs[prefix] ?? prefix
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toPrice(value: unknown): number {
  const price = Number(value);
  return Number.isFinite(price) ? price : 0;
}

async function seedModels() {
  console.log("Fetching AI models from OpenRouter...");

  const response = await fetch(OPENROUTER_API);

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const result = await response.json();
  const models = result.data;

  if (!Array.isArray(models)) {
    throw new Error("Invalid response from OpenRouter");
  }

  console.log(`Found ${models.length} models.`);
  console.log(`Importing up to ${MODEL_LIMIT} models...`);

  const provider = await prisma.provider.upsert({
    where: { name: "OpenRouter" },
    update: {},
    create: {
      name: "OpenRouter",
      description: "AI model inference and API routing provider",
      website: "https://openrouter.ai",
    },
  });

  let imported = 0;
  let failed = 0;

  for (const item of models.slice(0, MODEL_LIMIT)) {
    try {
      if (!item.id || !item.name) continue;

      const labName = getLabName(item.id);

      const lab = await prisma.lab.upsert({
        where: { name: labName },
        update: {},
        create: {
          name: labName,
          description: `AI research and model development organization: ${labName}`,
        },
      });

      const inputPrice = toPrice(item.pricing?.prompt);
      const outputPrice = toPrice(item.pricing?.completion);

      const inputModalities: string[] =
        item.architecture?.input_modalities ?? [];

      const outputModalities: string[] =
        item.architecture?.output_modalities ?? [];

      const capabilities = Array.from(
        new Set([...inputModalities, ...outputModalities])
      );

      const model = await prisma.model.upsert({
        where: { slug: item.id },
        update: {
          name: item.name,
          description: item.description ?? null,
          contextWindow: item.context_length ?? 0,
          inputPrice,
          outputPrice,
          inputModalities,
          outputModalities,
          capabilities,
          labId: lab.id,
        },
        create: {
          name: item.name,
          slug: item.id,
          description: item.description ?? null,
          modelType: item.architecture?.modality ?? "text",
          contextWindow: item.context_length ?? 0,
          inputPrice,
          outputPrice,
          releaseDate: item.created
            ? new Date(item.created * 1000)
            : null,
          inputModalities,
          outputModalities,
          capabilities,
          labId: lab.id,
        },
      });

      await prisma.modelProvider.upsert({
        where: {
          modelId_providerId: {
            modelId: model.id,
            providerId: provider.id,
          },
        },
        update: {
          inputPrice,
          outputPrice,
        },
        create: {
          modelId: model.id,
          providerId: provider.id,
          inputPrice,
          outputPrice,
        },
      });

      imported++;

      console.log(`Imported: ${item.id}`);
    } catch (error) {
      failed++;
      console.error(`Failed to import ${item.id}:`, error);
    }
  }

  console.log("\n========== IMPORT SUMMARY ==========");
  console.log(`Successfully imported: ${imported}`);
  console.log(`Failed: ${failed}`);
  console.log("====================================");
}

seedModels()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
