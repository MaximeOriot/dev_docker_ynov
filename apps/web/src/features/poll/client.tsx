"use client";
import { toast } from "@rallly/ui/sonner";
import React from "react";
import { useRequiredContext } from "@/components/use-required-context";
import type {
  PollComment,
  PollDetails,
  PollParticipant,
} from "@/features/poll/types";
import { closesAtFromField, hasPassedClosesAt } from "@/features/poll/utils";
import { useUser } from "@/features/user/client";
import { useTranslation } from "@/i18n/client";
import { getBrowserTimeZone } from "@/lib/utils/date-time-utils";

/**
 * Reads the closing-time date and time fields as the organizer's browser
 * zone sees them. Returns `{ ok: false }` after toasting when the time is in
 * the past, so a form can stop its submit; `closesAt` is undefined when the
 * fields are empty.
 */
export function useResolveClosesAt() {
  const { t } = useTranslation();

  return React.useCallback(
    (date: string | undefined, time: string | undefined) => {
      const closesAt = closesAtFromField(date, time, getBrowserTimeZone());

      if (closesAt && hasPassedClosesAt(closesAt)) {
        toast.error(
          t("closesAtInPast", {
            defaultValue: "The closing time must be in the future",
          }),
        );
        return { ok: false as const };
      }

      return { ok: true as const, closesAt };
    },
    [t],
  );
}

type PollContextValue = {
  poll: PollDetails;
  participants: PollParticipant[];
  comments: PollComment[];
  /**
   * Responses the emailed link in the URL may edit, resolved on the server
   * from the same token the actions check.
   */
  linkedParticipantIds: string[];
  /** Which surface the page is: the host's admin page or the invite page. */
  viewerRole: "admin" | "participant";
  /**
   * False when the instance reserves voting for OAuth users and the viewer
   * is not one. Resolved on the server from the same rule the actions check.
   */
  canRespond: boolean;
};

const PollContext = React.createContext<PollContextValue | null>(null);

PollContext.displayName = "PollProvider";

/**
 * Serves the poll a page loaded on the server. Writes go through server
 * actions followed by router.refresh(), which re-renders the page with new
 * props; nothing here is patched on the client.
 */
export function PollProvider({
  poll,
  participants,
  comments,
  linkedParticipantIds = [],
  viewerRole,
  canRespond = true,
  children,
}: Omit<PollContextValue, "linkedParticipantIds" | "canRespond"> & {
  linkedParticipantIds?: string[];
  canRespond?: boolean;
  children: React.ReactNode;
}) {
  const value = React.useMemo(
    () => ({
      poll,
      participants,
      comments,
      linkedParticipantIds,
      viewerRole,
      canRespond,
    }),
    [
      poll,
      participants,
      comments,
      linkedParticipantIds,
      viewerRole,
      canRespond,
    ],
  );

  return <PollContext.Provider value={value}>{children}</PollContext.Provider>;
}

export const usePoll = () => useRequiredContext(PollContext).poll;

/** The poll when a provider is mounted, for components shared with pages
 * that pass their data as props instead. */
export const usePollOrNull = () => React.useContext(PollContext)?.poll ?? null;

export const useRole = () => useRequiredContext(PollContext).viewerRole;

/** Whether this viewer may respond; false under `VOTE_REQUIRES_OAUTH`. */
export const useCanRespond = () => useRequiredContext(PollContext).canRespond;

export const useComments = () => useRequiredContext(PollContext).comments;

export const useParticipants = () => {
  const { t } = useTranslation();
  const { participants: rawParticipants } = useRequiredContext(PollContext);

  const participants = React.useMemo(() => {
    return rawParticipants.map((participant, index) => {
      if (!participant.hidden) {
        return participant;
      }

      return {
        ...participant,
        name: t("hiddenParticipantName", {
          defaultValue: "Participant #{number}",
          number: rawParticipants.length - index,
        }),
      };
    });
  }, [rawParticipants, t]);

  return { participants };
};

export const usePermissions = () => {
  const { poll, participants, linkedParticipantIds, viewerRole, canRespond } =
    useRequiredContext(PollContext);
  const { user } = useUser();

  return {
    canAddNewParticipant: poll.status === "open" && canRespond,
    canEditParticipant: (participantId: string) => {
      if (poll.status !== "open") {
        return false;
      }

      if (viewerRole === "admin") {
        return true;
      }

      // Same rule as the vote actions: a viewer who may not respond cannot
      // edit through a link either.
      if (!canRespond) {
        return false;
      }

      const participant = participants.find(
        (participant) => participant.id === participantId,
      );

      if (!participant) {
        return false;
      }

      return (
        (!!user && participant.userId === user.id) ||
        linkedParticipantIds.includes(participantId)
      );
    },
  };
};
