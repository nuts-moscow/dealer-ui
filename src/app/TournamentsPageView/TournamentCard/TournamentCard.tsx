"use client";

import { FC } from "react";
import { Typography } from "@/components/Typography/Typography";
import { DateTimeFormatter } from "@/components/Formatter/DateTimeFormatter/DateTimeFormatter";
import { ShortTournament } from "@/core/states/tournaments/requests/getTournaments";
import { SimpleList } from "@/components/SimpleList/SimpleList";

export interface TournamentCardProps {
  readonly tournament: ShortTournament;
  readonly onClick?: () => void;
}

export const TournamentCard: FC<TournamentCardProps> = ({
  tournament,
  onClick,
}) => {
  const { name, date } = tournament;

  return (
    <SimpleList.Card onClick={onClick}>
      <SimpleList.Column>
        <Typography.Text size="small" type="secondary">
          Дата
        </Typography.Text>
        <Typography.Text>
          <DateTimeFormatter value={date} type="date" />
        </Typography.Text>
      </SimpleList.Column>

      <SimpleList.Column>
        <Typography.Text size="small" type="secondary">
          Время
        </Typography.Text>
        <Typography.Text>
          <DateTimeFormatter value={date} type="time" />
        </Typography.Text>
      </SimpleList.Column>

      <SimpleList.Column>
        <Typography.Text size="small" type="secondary">
          Название турнира
        </Typography.Text>
        <Typography.Text>{name}</Typography.Text>
      </SimpleList.Column>
    </SimpleList.Card>
  );
};
