import { describe, expect, it } from "vitest";
import { classifyTopics } from "@/lib/topics";

describe("classifyTopics", () => {
  describe("keyword matching", () => {
    it("classifies AI/ML titles", () => {
      const topics = classifyTopics("Machine Learning Model Training");
      expect(topics).toContain("ai-ml");
    });

    it("classifies web-dev titles", () => {
      const topics = classifyTopics("Building REST APIs with React");
      expect(topics).toContain("web-dev");
    });

    it("returns other when no topic reaches threshold", () => {
      const topics = classifyTopics("The Weather Today");
      expect(topics).toEqual(["other"]);
    });
  });

  describe("domain matching", () => {
    it("classifies github.com as programming", () => {
      const topics = classifyTopics("hello world", "github.com");
      expect(topics).toContain("programming");
    });

    it("classifies openai.com as ai-ml", () => {
      const topics = classifyTopics("hello world", "openai.com");
      expect(topics).toContain("ai-ml");
    });

    it("returns other for unknown domains", () => {
      const topics = classifyTopics("hello world", "unknown.com");
      expect(topics).toEqual(["other"]);
    });
  });

  describe("multi-topic", () => {
    it("classifies into multiple topics", () => {
      const topics = classifyTopics("Rust compiler security vulnerability");
      expect(topics).toContain("programming");
      expect(topics).toContain("security");
    });
  });

  describe("edge cases", () => {
    it("returns other for empty title", () => {
      const topics = classifyTopics("");
      expect(topics).toEqual(["other"]);
    });

    it("classifies by keywords only when domain is undefined", () => {
      const topics = classifyTopics("Machine Learning Model Training");
      expect(topics).toContain("ai-ml");
    });

    it("strips www. prefix from domain", () => {
      const topics = classifyTopics("hello world", "www.github.com");
      expect(topics).toContain("programming");
    });
  });
});
