import { TournamentPageView } from "@/app/tournament/[id]/TournamentPageView";
import { getEnvironmentWithReqCookies } from "@/core/states/environment/environmentSsr";
import { getTournament } from "@/core/states/tournaments/requests/getTournament";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TournamentPage({ params }: PageProps) {
  const { id } = await params;
  const rrc = await cookies();
  const environment = await getEnvironmentWithReqCookies(rrc);
  const tournament = await getTournament(environment, id);
  if (!tournament) {
    notFound();
  }
  return <TournamentPageView tournament={tournament} />;
}
