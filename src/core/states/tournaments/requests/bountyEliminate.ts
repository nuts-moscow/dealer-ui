import { securedFetch } from "@/core/utils/misc/securedFetch";
import { Environment } from "../../environment/Environment";

export type BountyEliminationType = "Rebuy" | "Out";

export interface BountyEliminateBody {
  readonly eliminatedPlayerId: string;
  readonly type: BountyEliminationType;
  /** Обязательно в модели запроса; при burnedStack === true допускается [] (по контракту бэкенда). */
  readonly killerPlayerIds: readonly string[];
  readonly burnedStack?: boolean;
  /** Обязателен при burnedStack === true (целое ≥ 0). */
  readonly burnedChips?: number;
}

export interface BountyEliminateResponse {
  readonly eventId: string;
}

/**
 * POST /v2/api/tournaments/{tournamentId}/bounty/eliminate — успех 200, тело { eventId }.
 */
export const bountyEliminate = async (
  environment: Environment,
  tournamentId: number | string,
  body: BountyEliminateBody,
): Promise<BountyEliminateResponse> => {
  const tid = encodeURIComponent(String(tournamentId));
  return securedFetch<
    BountyEliminateBody,
    BountyEliminateResponse,
    BountyEliminateResponse
  >({
    method: "POST",
    host: environment.apiUrl,
    path: `/v2/api/tournaments/${tid}/bounty/eliminate`,
    withCredentials: false,
    body: {
      ...body,
      killerPlayerIds: [...body.killerPlayerIds],
    },
    mapping: {
      success: async (res) => {
        const json = (await res.toJson()) as BountyEliminateResponse;
        if (json && typeof json.eventId === "string") {
          return json;
        }
        throw new Error("Ответ без eventId");
      },
      400: () => new Error("Некорректные данные выбивания"),
      404: () => new Error("Игрок не найден в турнире"),
      500: () => new Error("Server error"),
    },
  });
};
