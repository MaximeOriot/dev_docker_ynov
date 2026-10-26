/**
 * Endpoints that finish an OAuth sign-in: the redirect callbacks of the
 * built-in providers and of generic OAuth (OIDC), and the ID-token variant of
 * /sign-in/social. Email OTP and password sign-ins never pass through here.
 */
export function isOAuthSignInPath(path: string | undefined) {
  return (
    !!path &&
    (path.startsWith("/callback/") ||
      path.startsWith("/oauth2/callback/") ||
      path.startsWith("/sign-in/social"))
  );
}

/**
 * Whether an OAuth sign-in must be refused because the instance only accepts
 * addresses the identity provider vouches for.
 */
export function shouldRefuseUnverifiedOAuthSignIn({
  requireVerifiedEmail,
  path,
  emailVerified,
}: {
  requireVerifiedEmail: boolean;
  path: string | undefined;
  emailVerified: boolean | null | undefined;
}) {
  return requireVerifiedEmail && isOAuthSignInPath(path) && !emailVerified;
}
