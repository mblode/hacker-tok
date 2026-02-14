import { describe, expect, it } from "vitest";

// Set env before importing module
process.env.HN_SESSION_SECRET =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const { encrypt, decrypt } = await import("@/lib/hn-session");

describe("hn-session encrypt/decrypt", () => {
  it("round-trips a simple string", () => {
    const plain = "user_session_cookie_value";
    const encrypted = encrypt(plain);
    expect(encrypted).not.toBe(plain);
    expect(decrypt(encrypted)).toBe(plain);
  });

  it("round-trips an empty string", () => {
    const encrypted = encrypt("");
    expect(decrypt(encrypted)).toBe("");
  });

  it("round-trips unicode text", () => {
    const plain = "hello \u{1F600} world";
    expect(decrypt(encrypt(plain))).toBe(plain);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const plain = "test";
    const a = encrypt(plain);
    const b = encrypt(plain);
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe(plain);
    expect(decrypt(b)).toBe(plain);
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encrypt("secret");
    const tampered = `${encrypted.slice(0, -2)}XX`;
    expect(() => decrypt(tampered)).toThrow();
  });
});
