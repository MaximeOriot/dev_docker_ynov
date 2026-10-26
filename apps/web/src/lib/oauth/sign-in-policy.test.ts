import { describe, expect, it } from "vitest";
import {
  isOAuthSignInPath,
  shouldRefuseUnverifiedOAuthSignIn,
} from "./sign-in-policy";

describe("isOAuthSignInPath", () => {
  it("matches the built-in, generic OAuth and ID-token sign-in endpoints", () => {
    expect(isOAuthSignInPath("/callback/google")).toBe(true);
    expect(isOAuthSignInPath("/oauth2/callback/oidc")).toBe(true);
    expect(isOAuthSignInPath("/sign-in/social")).toBe(true);
  });

  it("ignores email and anonymous sign-ins", () => {
    expect(isOAuthSignInPath("/email-otp/verify-email")).toBe(false);
    expect(isOAuthSignInPath("/sign-in/email-otp")).toBe(false);
    expect(isOAuthSignInPath("/sign-in/anonymous")).toBe(false);
    expect(isOAuthSignInPath(undefined)).toBe(false);
  });
});

describe("shouldRefuseUnverifiedOAuthSignIn", () => {
  const base = {
    requireVerifiedEmail: true,
    path: "/oauth2/callback/oidc",
    emailVerified: false,
  };

  it("refuses an unverified address when the policy is on", () => {
    expect(shouldRefuseUnverifiedOAuthSignIn(base)).toBe(true);
    expect(
      shouldRefuseUnverifiedOAuthSignIn({ ...base, emailVerified: null }),
    ).toBe(true);
  });

  it("lets a verified address through", () => {
    expect(
      shouldRefuseUnverifiedOAuthSignIn({ ...base, emailVerified: true }),
    ).toBe(false);
  });

  it("does nothing when the policy is off", () => {
    expect(
      shouldRefuseUnverifiedOAuthSignIn({
        ...base,
        requireVerifiedEmail: false,
      }),
    ).toBe(false);
  });

  it("never affects non-OAuth sign-ins", () => {
    expect(
      shouldRefuseUnverifiedOAuthSignIn({
        ...base,
        path: "/email-otp/verify-email",
      }),
    ).toBe(false);
  });
});
