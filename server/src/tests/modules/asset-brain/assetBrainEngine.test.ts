import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("assetBrainEngine", () => {
  describe("generateAssetSpecification", () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = process.env;
      process.env = { ...originalEnv };
      vi.resetModules();
      vi.clearAllMocks();
    });

    afterEach(() => {
      process.env = originalEnv;
      vi.restoreAllMocks();
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

      vi.doMock("@google/genai", () => ({
        GoogleGenerativeAI: class {
          constructor() {}
          getGenerativeModel() {
            return {
              generateContent: vi.fn().mockRejectedValue(new Error("API Error"))
            };
          }
        }
      }));

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

    it("should use heuristic fallback when module import fails", async () => {
      process.env.GEMINI_API_KEY = "test-api-key";
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      vi.doMock("@google/genai", () => {
        throw new Error("Module not found");
      });

      const { generateAssetSpecification } = await import("../../../modules/asset-brain/assetBrainEngine");

      const input = "A magical staff";
      const result = await generateAssetSpecification(input);

      expect(result.assetName).toBe("A Magical Staff");
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

      vi.doMock("@google/genai", () => ({
        GoogleGenerativeAI: class {
          constructor(apiKey: string) {
            expect(apiKey).toBe("test-api-key");
          }
          getGenerativeModel() {
            return {
              generateContent: vi.fn().mockResolvedValue({
                response: {
                  text: () => `\`\`\`json\n${JSON.stringify(mockResponseSpec)}\n\`\`\``
                }
              })
            };
          }
        }
      }));

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

      vi.doMock("@google/genai", () => ({
        GoogleGenerativeAI: class {
          constructor() {}
          getGenerativeModel() {
            return {
              generateContent: vi.fn().mockResolvedValue({
                response: {
                  text: () => JSON.stringify(mockResponseSpec)
                }
              })
            };
          }
        }
      }));

      const { generateAssetSpecification } = await import("../../../modules/asset-brain/assetBrainEngine");

      const input = "A sci-fi gun";
      const result = await generateAssetSpecification(input);

      expect(result.assetName).toBe("LLM Generated Sword 2");
      expect(result.autoDecisions).toEqual(['LLM-generated for "A sci-fi gun"']);
    });
  });
});
