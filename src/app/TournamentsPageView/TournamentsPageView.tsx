"use client";
import { FC, useEffect, useMemo, useState } from "react";
import { Box } from "@/components/Box/Box";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TournamentCard } from "@/app/TournamentsPageView/TournamentCard/TournamentCard";
import { ToggleGroup } from "@/components/ToggleGroup/ToggleGroup";
import { TournamentStatus } from "@/core/states/tournaments/common/TournamentStatus";
import { useTournaments } from "@/core/states/tournaments/hooks/useTournaments";
import { SimpleList } from "@/components/SimpleList/SimpleList";
import { ShortTournament } from "@/core/states/tournaments/requests/getTournaments";

export interface TournamentsPageViewProps {
  readonly initialTournaments: ShortTournament[];
}

export const TournamentsPageView: FC<TournamentsPageViewProps> = ({
  initialTournaments,
}) => {
  const [activeTab, setActiveTab] =
    useState<TournamentStatus>("RegistrationOpen");

  const { data: clientTournaments, refetch: refetchTournaments } =
    useTournaments(activeTab);
  const tournaments = useMemo(() => {
    return clientTournaments || initialTournaments;
  }, [initialTournaments, clientTournaments]);

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    refetchTournaments(activeTab);
  }, [activeTab]);

  const tournamentsToShow = useMemo(() => {
    if (!tournaments) return [];
    if (!searchQuery) return tournaments;
    return tournaments.filter((tournament) =>
      tournament.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [tournaments, searchQuery, activeTab]);

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey as TournamentStatus);
  };

  return (
    <Box
      flex={{ col: true }}
      style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}
    >
      <PageHeader title="Турниры" />

      <PageLayout>
        <Box flex={{ col: true, gap: 12, width: "100%" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Поиск по названию турнира"
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid var(--border-color)",
              minHeight: 44,
              padding: "0 12px",
              backgroundColor: "var(--background-primary)",
              color: "var(--text-primary)",
            }}
          />
          <Box
            flex={{
              justify: "space-between",
              align: "center",
              width: "100%",
            }}
          >
            <ToggleGroup
              type="primary"
              itemsType="tab"
              value={activeTab}
              onTabChange={handleTabChange}
            >
              <ToggleGroup.Item value="RegistrationOpen">Открыты</ToggleGroup.Item>
              <ToggleGroup.Item value="InProgress">Идет игра</ToggleGroup.Item>
            </ToggleGroup>
          </Box>

          {tournamentsToShow.length === 0 ? (
            <SimpleList.EmptyState>Нет турниров</SimpleList.EmptyState>
          ) : (
            <Box flex={{ col: true, gap: 2, width: "100%" }}>
              {tournamentsToShow.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </Box>
          )}
        </Box>
      </PageLayout>
    </Box>
  );
};
