"use client";

import { FC, useMemo } from "react";
import { Box } from "@/components/Box/Box";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { Home } from "lucide-react";
import { Button } from "@/components/Button/Button";
import Link from "next/link";
import { TournamentTables } from "./components/TournamentTables/TournamentTables";
import { TournamentInfoResponse } from "@/core/states/tournaments/requests/getTournament";
import { DateTimeFormatter } from "@/components/Formatter/DateTimeFormatter/DateTimeFormatter";
import { tournamentStatusLabels } from "@/core/states/tournaments/common/TournamentStatus";
import { useTournament } from "@/core/states/tournaments/hooks/useTournament";

export interface TournamentPageViewProps {
  readonly tournament: TournamentInfoResponse;
}

export const TournamentPageView: FC<TournamentPageViewProps> = ({
  tournament,
}) => {
  const { data: clientTournament } = useTournament(String(tournament.id));
  const currentTournament = useMemo(
    () => clientTournament || tournament,
    [clientTournament, tournament],
  );

  return (
    <Box
      flex={{ col: true }}
      style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}
    >
      <PageHeader
        title={
          <>
            {currentTournament.name}{" "}
            <DateTimeFormatter value={currentTournament.date} type="date" />
          </>
        }
        subtitle={`Статус: ${tournamentStatusLabels[currentTournament.status]}`}
        extra={
          <Box flex={{ gap: 2, align: "center" }}>
            <Link href="/">
              <Button
                type="accent"
                size="small"
                iconRight={<Home size={32} />}
              />
            </Link>
          </Box>
        }
      />

      <PageLayout>
        <TournamentTables tournament={currentTournament} />
      </PageLayout>
    </Box>
  );
};
