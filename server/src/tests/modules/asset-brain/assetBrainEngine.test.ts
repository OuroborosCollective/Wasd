import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock @google/generative-ai at the top level because it's now a static import
const generateContentMock = vi.fn();

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      models = {
        generateContent: generateContentMock
      };
      constructor(options: any) {}
    }
  };
});

describe("assetBrainEngine", () => {
  describe("generateAssetSpecification", () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = process.env;
      process.env = { ...originalEnv };
      vi.clearAllMocks();
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should use heuristic fallback when API keys are not set", async () => {
      const { generateAssetSpecification } = await import("../../../modules/asset-brain/assetBrainEngine");
      delete process.env.GOOGLE_AI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const input = "A lowpoly red sword";
      const result = await generateAssetSpecification(input);

      expect(result.assetName).toBe("A Lowpoly Red Sword");
      expect(result.assetClass).toBe("weapon");
      expect(result.style).toBe("low-poly stylized");
      expect(result.autoDecisions).toContain("Heuristic fallback used");
    });

    it("should use heuristic fallback when API key is set but API call fails", async () => {
      process.env.GEMINI_API_KEY = "test-api-key";
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      generateContentMock.mockRejectedValue(new Error("API Error"));

      const { generateAssetSpecification } = await import("../../../modules/asset-brain/assetBrainEngine");

      const input = "A lowpoly red sword";
      const result = await generateAssetSpecification(input);

      expect(result.assetName).toBe("A Lowpoly Red Sword");
      expect(result.autoDecisions).toContain("Heuristic fallback used");

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[AssetBrain] LLM failed, using heuristics:"),
        expect.any(Error)
      );
      warnSpy.mockRestore();
    });

    it("should return parsed JSON specification on successful API call", async () => {
      process.env.GEMINI_API_KEY = "test-api-key";

      const mockResponseSpec = {
        assetName: "LLM Generated Sword",
        assetClass: "weapon",
        usage: "Primary weapon asset for real-time game",
        style: "fantasy PBR",
        autoDecisions: ["LLM-generated explicitly"]
      };

      generateContentMock.mockResolvedValue({
        text: `\`\`\`json\n${JSON.stringify(mockResponseSpec)}\n\`\`\``
      });

      const { generateAssetSpecification } = await import("../../../modules/asset-brain/assetBrainEngine");

      const input = "A fantasy sword";
      const result = await generateAssetSpecification(input);

      expect(result.assetName).toBe("LLM Generated Sword");
      expect(result.assetClass).toBe("weapon");
      expect(result.style).toBe("fantasy PBR");
      expect(result.autoDecisions).toContain("LLM-generated explicitly");
    });

    it("should add autoDecisions if missing from LLM response", async () => {
      process.env.GOOGLE_AI_API_KEY = "test-api-key-google";

      const mockResponseSpec = {
        assetName: "LLM Generated Sword 2",
        assetClass: "weapon"
        // autoDecisions missing
      };

      generateContentMock.mockResolvedValue({
        text: JSON.stringify(mockResponseSpec)
      });

      const { generateAssetSpecification } = await import("../../../modules/asset-brain/assetBrainEngine");

      const input = "A sci-fi gun";
      const result = await generateAssetSpecification(input);

      expect(result.assetName).toBe("LLM Generated Sword 2");
      expect(result.autoDecisions).toEqual(['LLM-generated for "A sci-fi gun"']);
    });
  });
});
