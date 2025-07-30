import { describe, it, expect } from "vitest";
import { parseGame } from "../parsePgnService";

describe("parsePgnService", () => {
  it("separates variations", () => {
    const root = parseGame("1.e4 (1.d4 d5 2.c4) 1...c5 (1...e5 2.Nf3 Nc6)");
    expect(root.children[0].children.length).toBe(2);
  });

  it("handles simple main line", () => {
    const root = parseGame("1.e4 e5 2.Nf3 Nc6");
    expect(root.children).toHaveLength(1);
    expect(root.children[0].move).toBe("e4");
    expect(root.children[0].children[0].move).toBe("e5");
  });

  it("throws on illegal moves", () => {
    expect(() => parseGame("1.e4 e5 2.Qh5 Qxe4")).toThrow("Illegal SAN detected");
  });

  it("parses a game that ends in 1-0", () => {
    expect(() => parseGame("1.e4 e5 1-0")).not.toThrow();
  });

  it("parses a study PGN full of comments and NAGs", () => {
    const messy =
      "1.e4 e6 { huge comment (with (parentheses)) $6 $15 } 1... c5 2.d4 d5 *";
    expect(() => parseGame(messy)).not.toThrow();
  });
});