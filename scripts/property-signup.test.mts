import assert from "node:assert/strict";
import test from "node:test";
import {
  getMemberAuthErrorMessage,
  getMemberAuthErrorCode,
  getMemberAuthPageMessage,
  getPropertyAuthCallbackUrl,
  getPropertyPasswordResetCallbackUrl,
  getPropertySignupError,
  getPropertySignupPageError,
  PROPERTY_APP_ORIGIN,
  validatePropertySignupInput
} from "../lib/property-signup.ts";

test("signup input normalizes email without changing the password", () => {
  const result = validatePropertySignupInput({ email: " Test.User@Example.COM ", password: "password123" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.input.email, "test.user@example.com");
    assert.equal(result.input.password, "password123");
  }
});

test("signup input rejects invalid email and short password", () => {
  const invalidEmail = validatePropertySignupInput({ email: "invalid", password: "password123" });
  assert.equal(invalidEmail.ok, false);
  if (!invalidEmail.ok) assert.equal(invalidEmail.error.code, "invalid_email");

  const shortPassword = validatePropertySignupInput({ email: "user@example.com", password: "short" });
  assert.equal(shortPassword.ok, false);
  if (!shortPassword.ok) assert.equal(shortPassword.error.code, "invalid_password");
});

test("signup errors are mapped to Japanese public messages", () => {
  assert.equal(getPropertySignupError({ message: "Email rate limit exceeded" }).code, "rate_limited");
  assert.equal(getPropertySignupError({ message: "User already registered" }).code, "already_registered");
  assert.equal(getPropertySignupError({ code: "weak_password", message: "Password should contain letters" }).code, "invalid_password");

  const unknown = getPropertySignupError({ message: "Internal provider failure" });
  assert.equal(unknown.code, "temporarily_unavailable");
  assert.doesNotMatch(unknown.message, /Internal provider failure/i);
  assert.doesNotMatch(getMemberAuthErrorMessage("Unexpected English auth failure"), /Unexpected English auth failure/i);
  assert.equal(getPropertySignupPageError("temporarily_unavailable").includes("一定時間後"), true);
  assert.equal(getPropertySignupPageError("Unexpected English auth failure"), "");
});

test("production confirmation links always return to the property app callback", () => {
  assert.equal(
    getPropertyAuthCallbackUrl("https://preview.example/api/auth/signup", "production"),
    `${PROPERTY_APP_ORIGIN}/auth/callback`
  );
  assert.equal(
    getPropertyAuthCallbackUrl("http://localhost:3000/api/auth/signup", "development"),
    "http://localhost:3000/auth/callback"
  );
  assert.equal(
    getPropertyPasswordResetCallbackUrl("https://preview.example/forgot-password", "production"),
    `${PROPERTY_APP_ORIGIN}/auth/callback?next=/reset-password`
  );
});

test("member auth query codes only expose allowlisted Japanese messages", () => {
  assert.equal(getMemberAuthErrorCode({ message: "Invalid login credentials" }), "invalid_credentials");
  assert.equal(getMemberAuthPageMessage("reset_email_sent").includes("送信しました"), true);
  assert.equal(getMemberAuthPageMessage("password_updated").includes("変更しました"), true);
  assert.equal(getMemberAuthPageMessage("Unexpected English auth failure"), "");
});
