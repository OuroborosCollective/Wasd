import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { program } from "commander";
import { AssetBrainDatabase } from "../modules/asset-brain/AssetBrainDatabase.js";
import { generateAssetSpecification, generateVariants } from "../modules/asset-brain/assetBrainEngine.js";
import { DatabaseService } from "../core/Database.js";
import { runMigrations } from "../core/Migrations.js";

// Initialize database connection
const dbService = new DatabaseService();
let assetBrainDb: AssetBrainDatabase;

async function initDb() {
  // Parse DATABASE_URL and set individual DB_ environment variables
  if (process.env.DATABASE_URL) {
    const dbUrl = new URL(process.env.DATABASE_URL);
    process.env.DB_USER = dbUrl.username;
    process.env.DB_PASSWORD = dbUrl.password;
    process.env.DB_HOST = dbUrl.hostname;
    process.env.DB_PORT = dbUrl.port;
    process.env.DB_NAME = dbUrl.pathname.substring(1); // Remove leading slash
  }

  await dbService.connect();
  await runMigrations(); // Ensure migrations are run
  assetBrainDb = new AssetBrainDatabase(dbService);
}

program
  .name("asset-brain-cli")
  .description("CLI for Asset Brain Engine operations")
  .version("1.0.0");

program
  .command("generate <inputDescription>")
  .description("Generate an asset specification from a text description")
  .option("-n, --name <name>", "Optional asset name")
  .option("-s, --style <style>", "Optional asset style (e.g., realistic, stylized)")
  .option("-t, --tags <tags>", "Comma-separated tags (e.g., weapon,sword)", (value) => value.split(","))
  .option("-d, --description <description>", "Optional detailed description")
  .option("-p, --public", "Make the generated asset public", false)
  .action(async (inputDescription, options) => {
    await initDb();
    console.log(`Generating asset for: "${inputDescription}"...`);
    try {
      const specification = await generateAssetSpecification(inputDescription);
      const savedSpec = await assetBrainDb.createSpecification({
        userId: "cli-user", // CLI operations are attributed to a generic CLI user
        assetName: options.name ?? specification.assetName,
        assetClass: specification.assetClass,
        style: options.style ?? specification.style,
        usage: specification.usage,
        description: options.description,
        tags: options.tags,
        specification: JSON.stringify(specification),
        isPublic: options.public,
      });

      const variants = generateVariants(specification);
      const savedVariants: unknown[] = [];
      for (const [variantType, variantData] of Object.entries(variants)) {
        const topology = (variantData as any).topology;
        const rig = (variantData as any).rig;
        const triangleCount = topology?.triangleBudget?.mid ?? topology?.triangleBudget?.high ?? 0;
        const boneCount = rig?.boneCountTargets?.mid ?? undefined;
        const savedVariant = await assetBrainDb.createVariant({
          specificationId: savedSpec.id,
          variantType: variantType as any,
          triangleCount,
          boneCount,
          textureResolution: '2K',
          description: `${variantType} optimized variant`,
        });
        savedVariants.push(savedVariant);
      }

      console.log("Asset generated successfully!");
      console.log("Specification ID:", savedSpec.id);
      console.log("Name:", savedSpec.assetName);
      console.log("Class:", savedSpec.assetClass);
      console.log("Style:", savedSpec.style);
      console.log("Variants created:", savedVariants.length);
    } catch (error) {
      console.error("Error generating asset:", error);
    } finally {
      await dbService.disconnect();
    }
  });

program
  .command("list")
  .description("List all generated asset specifications")
  .option("-u, --user <userId>", "Filter by user ID (default: cli-user)", "cli-user")
  .option("-p, --public", "List only public assets", false)
  .action(async (options) => {
    await initDb();
    console.log(`Listing assets for user: ${options.user}${options.public ? " (public only)" : ""}...`);
    try {
      let assets;
      if (options.public) {
        assets = await assetBrainDb.searchSpecifications(undefined, "public");
      } else {
        assets = await assetBrainDb.getUserSpecifications(options.user);
      }
      
      if (assets.length === 0) {
        console.log("No assets found.");
        return;
      }

      assets.forEach((asset) => {
        console.log(`\nID: ${asset.id}`);
        console.log(`  Name: ${asset.assetName}`);
        console.log(`  Class: ${asset.assetClass}`);
        console.log(`  Style: ${asset.style}`);
        console.log(`  Public: ${asset.isPublic}`);
        console.log(`  Created At: ${asset.createdAt}`);
      });
    } catch (error) {
      console.error("Error listing assets:", error);
    } finally {
      await dbService.disconnect();
    }
  });

program.parse(process.argv);
