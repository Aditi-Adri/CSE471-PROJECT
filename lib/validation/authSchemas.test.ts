import { describe, expect, it } from "vitest";
import { registerSchema, resetPasswordSchema } from "./authSchemas";

const validRegistration = {
  name: "Ada Lovelace",
  email: "Ada@Example.com",
  phone: "",
  password: "Password1",
  confirmPassword: "Password1",
  role: "CUSTOMER" as const,
};

describe("registerSchema", () => {
  it("accepts a valid registration and lowercases the email", () => {
    const result = registerSchema.safeParse(validRegistration);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("ada@example.com");
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({ ...validRegistration, confirmPassword: "Different1" });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no digit", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password: "NoDigitsHere",
      confirmPassword: "NoDigitsHere",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({ ...validRegistration, password: "Ab1", confirmPassword: "Ab1" });
    expect(result.success).toBe(false);
  });

  it("rejects ADMIN as a public role", () => {
    const result = registerSchema.safeParse({ ...validRegistration, role: "ADMIN" });
    expect(result.success).toBe(false);
  });

  it("accepts an empty phone (optional)", () => {
    expect(registerSchema.safeParse(validRegistration).success).toBe(true);
  });

  it("rejects a malformed phone number", () => {
    const result = registerSchema.safeParse({ ...validRegistration, phone: "not-a-phone" });
    expect(result.success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("rejects mismatched new passwords", () => {
    const result = resetPasswordSchema.safeParse({
      token: "abc",
      password: "Password1",
      confirmPassword: "Password2",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a matching, valid new password", () => {
    const result = resetPasswordSchema.safeParse({
      token: "abc",
      password: "Password1",
      confirmPassword: "Password1",
    });
    expect(result.success).toBe(true);
  });
});
