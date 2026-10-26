"use client";

import { buttonVariants } from "@rallly/ui";
import { Alert, AlertDescription, AlertTitle } from "@rallly/ui/alert";
import { LockIcon } from "lucide-react";
import { LoginLink } from "@/components/login-link";
import { useCanRespond, usePoll } from "@/features/poll/client";
import { useUser } from "@/features/user/client";
import { Trans } from "@/i18n/client";

/**
 * Explains why the voting controls are missing when the instance reserves
 * voting for OAuth users (`VOTE_REQUIRES_OAUTH`) and the viewer is not one.
 */
export function VoteLockNotice() {
  const poll = usePoll();
  const canRespond = useCanRespond();
  const { user } = useUser();

  if (canRespond || poll.status !== "open") {
    return null;
  }

  const isSignedIn = !!user && !user.isGuest;

  return (
    <Alert variant="note">
      <LockIcon />
      <AlertTitle>
        <Trans
          i18nKey="voteLockNoticeTitle"
          defaults="Voting is limited to signed in users"
        />
      </AlertTitle>
      <AlertDescription>
        <p>
          {isSignedIn ? (
            <Trans
              i18nKey="voteLockNoticeSignedInDescription"
              defaults="Your account can't respond to this poll. Sign in with your organization's single sign-on to vote."
            />
          ) : (
            <Trans
              i18nKey="voteLockNoticeDescription"
              defaults="Sign in with your organization's single sign-on to respond to this poll."
            />
          )}
        </p>
        <LoginLink
          className={buttonVariants({ variant: "default", size: "sm" })}
        >
          <Trans i18nKey="voteLockNoticeLogin" defaults="Sign in" />
        </LoginLink>
      </AlertDescription>
    </Alert>
  );
}
