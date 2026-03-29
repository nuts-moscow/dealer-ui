import { BlindType } from "@/core/states/tournamentStructures/common/BlindType";

/** Ответ structure в TournamentWithStructureResponse (GET v2/api/tournaments/{id}). */
export interface TournamentsStructureResponse {
  readonly id?: number;
  readonly name: string;
  readonly stackSize: number;
  readonly playersLimit: number;
  readonly blindsStructure?: readonly BlindType[];
  readonly freezeOutEnabled: boolean;
}
