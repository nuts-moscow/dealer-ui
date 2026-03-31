import { securedFetch } from "@/core/utils/misc/securedFetch";
import { Environment } from "../../environment/Environment";

export interface BountyEliminateUndoBody {
  readonly eventId: string;
}

/**
 * POST /v2/api/tournaments/{tournamentId}/bounty/eliminate/undo — полный откат события выбивания.
 */
export const bountyEliminateUndo = async (
  environment: Environment,
  tournamentId: number | string,
  body: BountyEliminateUndoBody,
): Promise<void> => {
  const tid = encodeURIComponent(String(tournamentId));
  return securedFetch<BountyEliminateUndoBody, void, void>({
    method: "POST",
    host: environment.apiUrl,
    path: `/v2/api/tournaments/${tid}/bounty/eliminate/undo`,
    withCredentials: false,
    body,
    mapping: {
      success: async (res) => {
        if (res.status === 204) {
          return;
        }
        await res.toJson().catch(() => undefined);
      },
      400: () => new Error("Некорректное тело или нельзя откатить событие"),
      404: () => new Error("Событие или игрок не найдены"),
      500: () => new Error("Server error"),
    },
  });
};
