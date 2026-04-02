"use client";

import { FC, useEffect, useMemo, useState } from "react";
import { Box } from "@/components/Box/Box";
import { Button } from "@/components/Button/Button";
import { Typography } from "@/components/Typography/Typography";
import { Modal, WithModalProps, useModal } from "@/components/Modal/Modal";
import { TournamentInfoResponse } from "@/core/states/tournaments/requests/getTournament";
import { TableList } from "../TournamentPlayers/TableList/TableList";
import { useNonRegisteredTournamentPlayerState } from "@/core/states/tournaments/hooks/useNonRegisteredTournamentPlayerState";
import { InGamePlayerState } from "@/core/states/tournaments/common/InGamePlayerState";
import { useEnvironment } from "@/core/states/environment/useEnvironment";
import { refetchTournamentPlayerState } from "@/core/states/tournaments/hooks/useTournamentPlayerState";
import { bountyEliminate } from "@/core/states/tournaments/requests/bountyEliminate";
import { toast } from "@/components/Toast/Toast";
import {
  AddReentryModal,
  BurnedRebuyUndoModal,
  BountyListModal,
  EliminatedByModal,
} from "./TableRebuyModals";
import { PlayerBonusesModal } from "./PlayerBonusesModal";

export interface TournamentTablesProps {
  readonly tournament: TournamentInfoResponse;
}

interface SetOutPlayerModalProps extends WithModalProps {
  readonly tournamentId: string;
  readonly bustedPlayer?: InGamePlayerState;
  readonly players: InGamePlayerState[];
}

const statusLabels: Record<string, string> = {
  InGamePaid: "В игре",
  InGameNotPaid: "В игре",
  Out: "Выбыл",
};

const SetOutPlayerModal: FC<SetOutPlayerModalProps> = ({
  close,
  opened,
  tournamentId,
  bustedPlayer,
  players,
}) => {
  const environment = useEnvironment();
  const [isLoading, setIsLoading] = useState(false);
  const [burnedStack, setBurnedStack] = useState(false);
  const [burnedChipsInput, setBurnedChipsInput] = useState("");
  const candidates = useMemo(
    () =>
      players.filter(
        (player) =>
          player.status !== "Out" && player.playerId !== bustedPlayer?.playerId,
      ),
    [players, bustedPlayer?.playerId],
  );
  const [selectedKillerIds, setSelectedKillerIds] = useState<string[]>([]);

  useEffect(() => {
    if (!opened || !bustedPlayer?.playerId) {
      return;
    }
    setSelectedKillerIds([]);
    setBurnedStack(false);
    setBurnedChipsInput("");
  }, [opened, bustedPlayer?.playerId, players]);

  const effectiveKillerIds = useMemo(
    () =>
      [
        ...new Set(
          selectedKillerIds.filter((id) =>
            candidates.some((c) => c.playerId === id),
          ),
        ),
      ],
    [selectedKillerIds, candidates],
  );

  const toggleKiller = (id: string) => {
    setSelectedKillerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const canSave =
    !!bustedPlayer &&
    (burnedStack ? true : effectiveKillerIds.length > 0 && candidates.length > 0);

  const handleSave = async () => {
    if (!bustedPlayer || !canSave || isLoading) {
      return;
    }
    if (burnedStack) {
      const chips = Number.parseInt(burnedChipsInput.trim(), 10);
      if (!Number.isFinite(chips) || chips < 0) {
        return;
      }
      setIsLoading(true);
      try {
        await bountyEliminate(environment, Number(tournamentId), {
          eliminatedPlayerId: bustedPlayer.playerId,
          type: "Out",
          burnedStack: true,
          burnedChips: chips,
          killerPlayerIds: [],
        });
        refetchTournamentPlayerState();
        close();
      } catch (error) {
        console.error(error);
        toast({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Не удалось зафиксировать вылет",
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }
    if (effectiveKillerIds.length === 0) {
      return;
    }
    setIsLoading(true);
    try {
      await bountyEliminate(environment, Number(tournamentId), {
        eliminatedPlayerId: bustedPlayer.playerId,
        killerPlayerIds: effectiveKillerIds,
        type: "Out",
      });
      refetchTournamentPlayerState();
      close();
    } catch (error) {
      console.error(error);
      toast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Не удалось зафиксировать вылет",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Modal.Title showCloseButton close={close}>
        Игрок вылетел
      </Modal.Title>
      <Modal.Content minWidth={440}>
        <Box flex={{ col: true, gap: 4 }}>
          <Typography.Text type="secondary" size="small">
            {bustedPlayer
              ? burnedStack
                ? `Сжёг стек — игрок «${bustedPlayer.playerName}»`
                : `Кто выбил игрока «${bustedPlayer.playerName}»?`
              : "Выбери игрока"}
          </Typography.Text>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={burnedStack}
              onChange={(e) => setBurnedStack(e.target.checked)}
              disabled={isLoading}
            />
            <Typography.Text size="small">Сжёг стек</Typography.Text>
          </label>
          {burnedStack ? (
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              placeholder="Сожжённых фишек"
              value={burnedChipsInput}
              onChange={(e) => setBurnedChipsInput(e.target.value)}
              disabled={isLoading}
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
          ) : candidates.length > 0 ? (
            <Box flex={{ col: true, gap: 2 }}>
              {candidates.map((player) => {
                const killerSelected = selectedKillerIds.includes(
                  player.playerId,
                );
                return (
                  <label
                    key={player.playerId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      userSelect: "none",
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: killerSelected
                        ? "2px solid rgba(0, 0, 0, 0.35)"
                        : "1px solid var(--border-color)",
                      backgroundColor: killerSelected
                        ? "rgba(59, 130, 246, 0.12)"
                        : "var(--background-primary)",
                      transition: "background-color 0.15s, border-color 0.15s",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={killerSelected}
                      onChange={() => toggleKiller(player.playerId)}
                      disabled={isLoading}
                    />
                    <Typography.Text size="small">
                      {player.playerName} (ID: {player.playerId})
                    </Typography.Text>
                  </label>
                );
              })}
              {effectiveKillerIds.length > 0 ? (
                <Box
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(59, 130, 246, 0.4)",
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                  }}
                >
                  <Typography.Text size="small">
                    Выбраны убийцы ({effectiveKillerIds.length}):{" "}
                    {effectiveKillerIds
                      .map(
                        (id) =>
                          candidates.find((c) => c.playerId === id)
                            ?.playerName ?? id,
                      )
                      .join(", ")}
                  </Typography.Text>
                </Box>
              ) : null}
              {effectiveKillerIds.length > 1 ? (
                <Typography.Text type="secondary" size="xxSmall">
                  Выбрано убийц: {effectiveKillerIds.length}. Каждый получит долю
                  1/{effectiveKillerIds.length} полного баунти.
                </Typography.Text>
              ) : null}
            </Box>
          ) : (
            <Typography.Text type="secondary" size="small">
              Нет доступных игроков для выбора
            </Typography.Text>
          )}
          <Box flex={{ gap: 4, width: "100%" }}>
            <Button
              type="secondary"
              htmlType="button"
              onClick={() => close()}
              flexItem={{ flex: 1 }}
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button
              type="error"
              htmlType="button"
              onClick={handleSave}
              flexItem={{ flex: 1 }}
              loading={isLoading}
              disabled={
                !bustedPlayer ||
                isLoading ||
                (burnedStack
                  ? !Number.isFinite(
                      Number.parseInt(burnedChipsInput.trim(), 10),
                    ) || Number.parseInt(burnedChipsInput.trim(), 10) < 0
                  : effectiveKillerIds.length === 0 || candidates.length === 0)
              }
            >
              Сохранить
            </Button>
          </Box>
        </Box>
      </Modal.Content>
    </>
  );
};

export const TournamentTables: FC<TournamentTablesProps> = ({ tournament }) => {
  const [showTablePicker, setShowTablePicker] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<number | undefined>(
    undefined,
  );
  /** Строка, для которой показаны кнопки действий (клик по строке). */
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setShowTablePicker(true);
  }, [tournament.id]);

  useEffect(() => {
    setExpandedPlayerId(null);
  }, [tournament.id, selectedTableId]);

  const handleSelectTable = (tableId: number) => {
    setSelectedTableId(tableId);
    setShowTablePicker(false);
  };
  const [playerToSetOut, setPlayerToSetOut] = useState<
    InGamePlayerState | undefined
  >(undefined);
  const [eliminationTableSnapshot, setEliminationTableSnapshot] = useState<
    InGamePlayerState[]
  >([]);
  const [reentryPlayer, setReentryPlayer] = useState<
    InGamePlayerState | undefined
  >(undefined);
  const [burnedRebuyUndoPlayerId, setBurnedRebuyUndoPlayerId] = useState<
    string | undefined
  >(undefined);
  const [playerBonusesPlayerId, setPlayerBonusesPlayerId] = useState<
    string | undefined
  >(undefined);
  const [SetOutPlayerModalConnect, openSetOutPlayerModal] =
    useModal(SetOutPlayerModal);
  const [AddReentryModalConnect, openAddReentryModal] =
    useModal(AddReentryModal);
  const [BurnedRebuyUndoModalConnect, openBurnedRebuyUndoModal] = useModal(
    BurnedRebuyUndoModal,
  );
  const [BountyModalConnect, openBountyModal] = useModal(BountyListModal);
  const [EliminatedByModalConnect, openEliminatedByModal] =
    useModal(EliminatedByModal);
  const [PlayerBonusesModalConnect, openPlayerBonusesModal] =
    useModal(PlayerBonusesModal);
  const { data: nonRegisteredPlayers } = useNonRegisteredTournamentPlayerState(
    String(tournament.id),
  );
  const excludedFromTableStatuses = ["Out", "OutNotPaid"] as const;
  const tablePlayers = (nonRegisteredPlayers ?? []).filter(
    (player) =>
      !!selectedTableId &&
      Number(player.tableId) === selectedTableId &&
      !excludedFromTableStatuses.includes(
        player.status as (typeof excludedFromTableStatuses)[number],
      ),
  );

  return (
    <Box flex={{ col: true, gap: 8, width: "100%" }}>
      <SetOutPlayerModalConnect
        tournamentId={String(tournament.id)}
        bustedPlayer={playerToSetOut}
        players={eliminationTableSnapshot}
      />
      <AddReentryModalConnect
        tournamentId={String(tournament.id)}
        player={reentryPlayer}
        players={nonRegisteredPlayers ?? []}
      />
      <BurnedRebuyUndoModalConnect
        tournamentId={String(tournament.id)}
        playerId={burnedRebuyUndoPlayerId}
      />
      <BountyModalConnect
        tournamentId={String(tournament.id)}
        players={nonRegisteredPlayers ?? []}
        onRemoved={refetchTournamentPlayerState}
      />
      <EliminatedByModalConnect
        tournamentId={String(tournament.id)}
        players={nonRegisteredPlayers ?? []}
        onRemoved={refetchTournamentPlayerState}
      />
      <PlayerBonusesModalConnect
        tournamentId={String(tournament.id)}
        playerId={playerBonusesPlayerId}
      />

      <Box
        flex={{
          width: "100%",
          align: "center",
          justify: "space-between",
          gap: 2,
        }}
        style={{ padding: "0 4px" }}
      >
        <Typography.Text type="secondary" size="small">
          {selectedTableId != null
            ? `Стол ${selectedTableId}`
            : "Стол не выбран"}
        </Typography.Text>
        <Button
          type="secondary"
          size="small"
          htmlType="button"
          onClick={() => setShowTablePicker((open) => !open)}
        >
          {showTablePicker
            ? "Скрыть столы"
            : selectedTableId != null
              ? "Сменить стол"
              : "Выбрать стол"}
        </Button>
      </Box>

      {showTablePicker ? (
        <TableList
          tournamentId={String(tournament.id)}
          selectable
          selectedTableId={selectedTableId}
          onSelectTable={handleSelectTable}
        />
      ) : null}

      <Box flex={{ col: true, gap: 4, width: "100%" }}>
        <Box
          flex={{ width: "100%", align: "center", gap: 2 }}
          style={{ padding: "4px 12px 0 12px" }}
        >
          <Typography.Text
            type="secondary"
            size="small"
            flexItem={{ minWidth: 56 }}
          >
            ID
          </Typography.Text>
          <Typography.Text type="secondary" size="small" flexItem={{ flex: 1 }}>
            Имя
          </Typography.Text>
          <Typography.Text
            type="secondary"
            size="small"
            flexItem={{ minWidth: 120 }}
          >
            Статус
          </Typography.Text>
          <Typography.Text type="secondary" size="small">
            Действия
          </Typography.Text>
        </Box>

        <Box flex={{ col: true, gap: 2, width: "100%" }}>
          {tablePlayers.map((player) => {
            const isExpanded = expandedPlayerId === player.playerId;
            return (
              <Box
                key={player.playerId}
                flex={{ width: "100%", align: "center", gap: 2 }}
                onClick={() =>
                  setExpandedPlayerId((prev) =>
                    prev === player.playerId ? null : player.playerId,
                  )
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: isExpanded
                    ? "1px solid rgba(0, 0, 0, 0.22)"
                    : "1px solid rgba(0, 0, 0, 0.08)",
                  backgroundColor:
                    player.signAgreement === false
                      ? "rgba(255, 196, 2, 0.22)"
                      : "#fff",
                  cursor: "pointer",
                  boxShadow: isExpanded
                    ? "0 1px 4px rgba(0, 0, 0, 0.06)"
                    : undefined,
                }}
              >
                <Typography.Text
                  size="small"
                  type="secondary"
                  flexItem={{ minWidth: 56 }}
                >
                  {player.tournamentPlayerId}
                </Typography.Text>
                <Typography.Text size="small" flexItem={{ flex: 1 }}>
                  {player.playerName}
                </Typography.Text>
                <Typography.Text
                  size="small"
                  type="secondary"
                  flexItem={{ minWidth: 120 }}
                >
                  {statusLabels[player.status] ?? player.status}
                </Typography.Text>
                {isExpanded ? (
                  <Box
                    flex={{ gap: 2 }}
                    style={{ flexWrap: "wrap" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      type="secondary"
                      size="xxSmall"
                      onClick={() => {
                        setPlayerBonusesPlayerId(player.playerId);
                        openPlayerBonusesModal();
                      }}
                    >
                      Бонусы
                    </Button>
                    {tournament.status !== "RegistrationOpen" &&
                      player.status !== "Out" && (
                        <>
                          <Button
                            type="secondary"
                            size="xxSmall"
                            onClick={() => {
                              setReentryPlayer(player);
                              openAddReentryModal();
                            }}
                          >
                            Добавить реентри
                          </Button>
                          {(player.burnedStackEvents ?? []).some(
                            (e) => e.source === "Rebuy",
                          ) && (
                            <Button
                              type="secondary"
                              size="xxSmall"
                              onClick={() => {
                                setBurnedRebuyUndoPlayerId(player.playerId);
                                openBurnedRebuyUndoModal();
                              }}
                            >
                              Откат сгорания
                            </Button>
                          )}
                          <Button
                            type="secondary"
                            size="xxSmall"
                            onClick={() => openBountyModal(player)}
                          >
                            Баунти
                          </Button>
                          <Button
                            type="secondary"
                            size="xxSmall"
                            onClick={() => openEliminatedByModal(player)}
                          >
                            Кто выбил
                          </Button>
                          <Button
                            type="error"
                            size="xxSmall"
                            onClick={() => {
                              const tid = player.tableId;
                              const snapshot = (
                                nonRegisteredPlayers ?? []
                              ).filter(
                                (p) => String(p.tableId) === String(tid),
                              );
                              setEliminationTableSnapshot(snapshot);
                              setPlayerToSetOut(player);
                              openSetOutPlayerModal();
                            }}
                          >
                            Вылетел
                          </Button>
                        </>
                      )}
                  </Box>
                ) : (
                  <Typography.Text
                    type="tertiary"
                    size="xxSmall"
                    style={{ userSelect: "none" }}
                  >
                    Нажмите строку
                  </Typography.Text>
                )}
              </Box>
            );
          })}

          {!selectedTableId && (
            <Typography.Text type="secondary" size="small">
              Выберите стол, чтобы увидеть список игроков
            </Typography.Text>
          )}
          {selectedTableId && tablePlayers.length === 0 && (
            <Typography.Text type="secondary" size="small">
              На этом столе нет игроков
            </Typography.Text>
          )}
        </Box>
      </Box>
    </Box>
  );
};
