"use client";

import { FC, useEffect, useMemo, useState } from "react";
import { Box } from "@/components/Box/Box";
import { Button } from "@/components/Button/Button";
import { Modal, WithModalProps } from "@/components/Modal/Modal";
import { Typography } from "@/components/Typography/Typography";
import { toast } from "@/components/Toast/Toast";
import { NumberFormatter } from "@/components/Formatter/NumberFormatter/NumberFormatter";
import {
  BountyKillEntry,
  BountyEliminationEvent,
  formatBountyCount,
  InGamePlayerState,
} from "@/core/states/tournaments/common/InGamePlayerState";
import { useEnvironment } from "@/core/states/environment/useEnvironment";
import {
  refetchTournamentPlayerState,
  useTournamentPlayerState,
} from "@/core/states/tournaments/hooks/useTournamentPlayerState";
import { refetchTournamentRebuyCount } from "@/core/states/tournaments/hooks/useTournamentRebuyCount";
import {
  bountyEliminate,
  BountyEliminateBody,
} from "@/core/states/tournaments/requests/bountyEliminate";
import { bountyEliminateUndo } from "@/core/states/tournaments/requests/bountyEliminateUndo";
import { undoRebuyBurnedStack } from "@/core/states/tournaments/requests/undoRebuyBurnedStack";
import { X } from "lucide-react";

export const getPlayerLabel = (player?: InGamePlayerState): string => {
  if (!player) return "-";
  return player.playerName || player.playerId || "-";
};

export interface AddReentryModalProps extends WithModalProps {
  readonly tournamentId: string;
  readonly player?: InGamePlayerState;
  readonly players: InGamePlayerState[];
}

export const AddReentryModal: FC<AddReentryModalProps> = ({
  close,
  tournamentId,
  player,
  players,
}) => {
  const environment = useEnvironment();
  const [count, setCount] = useState(1);
  const [burnedStack, setBurnedStack] = useState(false);
  const [burnedChipsInput, setBurnedChipsInput] = useState("");
  const [selectedKillerIds, setSelectedKillerIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const killerCandidates = useMemo(
    () =>
      (players ?? []).filter(
        (candidate) =>
          candidate.playerId !== player?.playerId &&
          candidate.tableId != null &&
          candidate.tableId === player?.tableId,
      ),
    [player?.playerId, player?.tableId, players],
  );

  useEffect(() => {
    setCount(1);
    setBurnedStack(false);
    setBurnedChipsInput("");
    setSelectedKillerIds([]);
  }, [player?.playerId, killerCandidates]);

  const toggleKiller = (id: string) => {
    setSelectedKillerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const effectiveKillerIds = useMemo(
    () =>
      [
        ...new Set(
          selectedKillerIds.filter((id) =>
            killerCandidates.some((c) => c.playerId === id),
          ),
        ),
      ],
    [selectedKillerIds, killerCandidates],
  );

  const handleSave = async () => {
    if (!player || count <= 0 || isSaving) return;
    let payload: BountyEliminateBody;
    if (burnedStack) {
      const parsed = Number.parseInt(burnedChipsInput.trim(), 10);
      if (!Number.isFinite(parsed) || parsed < 0) return;
      payload = {
        eliminatedPlayerId: player.playerId,
        type: "Rebuy",
        burnedStack: true,
        burnedChips: parsed,
        killerPlayerIds: [],
      };
    } else {
      if (effectiveKillerIds.length === 0) return;
      payload = {
        eliminatedPlayerId: player.playerId,
        type: "Rebuy",
        killerPlayerIds: effectiveKillerIds,
      };
    }
    setIsSaving(true);
    try {
      for (let i = 0; i < count; i += 1) {
        await bountyEliminate(environment, Number(tournamentId), payload);
      }
      refetchTournamentPlayerState();
      refetchTournamentRebuyCount();
      close();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal.Title showCloseButton close={close}>
        Добавить ребай
      </Modal.Title>
      <Modal.Content minWidth={420}>
        <Box flex={{ col: true, gap: 4 }}>
          <Typography.Text type="secondary" size="small">
            {player
              ? `Игрок: ${getPlayerLabel(player)}`
              : "Укажи игрока"}
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
              disabled={isSaving}
            />
            <Typography.Text size="small">Сжёг стек</Typography.Text>
          </label>
          {burnedStack ? (
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              placeholder="Сожжённых фишек (на один ребай)"
              value={burnedChipsInput}
              onChange={(e) => setBurnedChipsInput(e.target.value)}
              disabled={isSaving}
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
          ) : (
            <Box flex={{ col: true, gap: 2 }}>
              {killerCandidates.length === 0 ? (
                <Typography.Text type="secondary" size="small">
                  Нет игроков за этим столом
                </Typography.Text>
              ) : (
                killerCandidates.map((candidate) => {
                  const killerSelected = selectedKillerIds.includes(
                    candidate.playerId,
                  );
                  return (
                    <label
                      key={candidate.playerId}
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
                        onChange={() => toggleKiller(candidate.playerId)}
                        disabled={isSaving}
                      />
                      <Typography.Text size="small">
                        {candidate.playerName} (ID: {candidate.playerId})
                      </Typography.Text>
                    </label>
                  );
                })
              )}
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
                          killerCandidates.find((c) => c.playerId === id)
                            ?.playerName ?? id,
                      )
                      .join(", ")}
                  </Typography.Text>
                </Box>
              ) : null}
              {effectiveKillerIds.length > 1 ? (
                <Typography.Text type="secondary" size="xxSmall">
                  Выбрано убийц: {effectiveKillerIds.length}. Каждый получит
                  долю 1/{effectiveKillerIds.length} полного баунти.
                </Typography.Text>
              ) : null}
            </Box>
          )}
          <Typography.Text type="secondary" size="xxSmall">
            Количество ребаев (подряд одинаковым способом)
          </Typography.Text>
          <input
            type="number"
            min={1}
            value={count}
            onChange={(event) =>
              setCount(Math.max(1, Number(event.target.value || 1)))
            }
            disabled={isSaving}
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
          <Box flex={{ gap: 4, width: "100%" }}>
            <Button
              type="secondary"
              htmlType="button"
              onClick={() => close()}
              flexItem={{ flex: 1 }}
              disabled={isSaving}
            >
              Отмена
            </Button>
            <Button
              type="primary"
              htmlType="button"
              onClick={handleSave}
              flexItem={{ flex: 1 }}
              loading={isSaving}
              disabled={
                !player ||
                count <= 0 ||
                isSaving ||
                (burnedStack
                  ? !Number.isFinite(
                      Number.parseInt(burnedChipsInput.trim(), 10),
                    ) ||
                    Number.parseInt(burnedChipsInput.trim(), 10) < 0
                  : effectiveKillerIds.length === 0)
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

export interface BurnedRebuyUndoModalProps extends WithModalProps {
  readonly tournamentId: string;
  readonly playerId?: string;
}

export const BurnedRebuyUndoModal: FC<BurnedRebuyUndoModalProps> = ({
  close,
  tournamentId,
  playerId,
}) => {
  const environment = useEnvironment();
  const {
    data: tournamentPlayers,
    loading: playersLoading,
    firstRequest: playersFirstRequest,
  } = useTournamentPlayerState(tournamentId);
  const player = useMemo(
    () =>
      playerId
        ? tournamentPlayers?.find((p) => p.playerId === playerId)
        : undefined,
    [playerId, tournamentPlayers],
  );
  const [undoingKey, setUndoingKey] = useState<string | null>(null);
  const rebuyBurns = useMemo(() => {
    const list = (player?.burnedStackEvents ?? []).filter(
      (e) => e.source === "Rebuy",
    );
    return [...list].reverse();
  }, [player?.burnedStackEvents, player?.playerId]);

  const handleUndo = async (burnedChips: number, rowIndex: number) => {
    if (!playerId || undoingKey != null) return;
    const key = `undo-${rowIndex}-${burnedChips}`;
    setUndoingKey(key);
    try {
      await undoRebuyBurnedStack(environment, tournamentId, {
        playerId,
        burnedChips,
      });
      refetchTournamentPlayerState();
      refetchTournamentRebuyCount();
    } catch (error) {
      console.error(error);
      toast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Не удалось откатить сгорание",
      });
    } finally {
      setUndoingKey(null);
    }
  };

  return (
    <>
      <Modal.Title showCloseButton close={close}>
        Сгорание стека (ребай) —{" "}
        {player ? getPlayerLabel(player) : playerId ?? "…"}
      </Modal.Title>
      <Modal.Content minWidth={420}>
        <Box flex={{ col: true, gap: 3 }}>
          <Typography.Text type="tertiary" size="xxSmall">
            Откат снимает последнее событие Rebuy с этой суммой фишек (LIFO
            среди совпадений).
          </Typography.Text>
          {playersFirstRequest && playersLoading ? (
            <Typography.Text type="secondary" size="small">
              Загрузка…
            </Typography.Text>
          ) : playerId && !player ? (
            <Typography.Text type="secondary" size="small">
              Игрок не найден в турнире
            </Typography.Text>
          ) : rebuyBurns.length === 0 ? (
            <Typography.Text type="secondary" size="small">
              Нет записей сгорания за ребай
            </Typography.Text>
          ) : (
            <Box flex={{ col: true, gap: 2 }}>
              {rebuyBurns.map((ev, index) => (
                <Box
                  key={`burn-rebuy-${index}-${ev.chips}`}
                  flex={{
                    align: "center",
                    justify: "space-between",
                    gap: 2,
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <Typography.Text size="small">
                    <NumberFormatter value={ev.chips} type="withoutDecimals" />{" "}
                    фишек
                  </Typography.Text>
                  <Button
                    type="secondary"
                    size="xxSmall"
                    onClick={() => handleUndo(ev.chips, index)}
                    disabled={undoingKey !== null}
                    loading={undoingKey === `undo-${index}-${ev.chips}`}
                  >
                    Откат
                  </Button>
                </Box>
              ))}
            </Box>
          )}
          <Button type="secondary" htmlType="button" onClick={() => close()}>
            Закрыть
          </Button>
        </Box>
      </Modal.Content>
    </>
  );
};

export interface BountyListModalProps extends WithModalProps<InGamePlayerState> {
  readonly tournamentId: string;
  readonly players: InGamePlayerState[];
  readonly onRemoved: () => void;
}

export const BountyListModal: FC<BountyListModalProps> = ({
  close,
  initialData: row,
  tournamentId,
  players,
  onRemoved,
}) => {
  const environment = useEnvironment();
  const [removingEventId, setRemovingEventId] = useState<string | null>(null);
  const myId = row?.playerId ?? "";
  const eventsAsKiller: readonly BountyEliminationEvent[] =
    row?.bountyEliminationEvents?.filter((e) =>
      e.killerPlayerIds.includes(myId),
    ) ?? [];
  const legacyKills =
    eventsAsKiller.length > 0 ? [] : (row?.bountyKills ?? []);

  const coKillersLine = (
    killerPlayerIds: readonly string[],
    excludePlayerId: string,
  ): string | null => {
    const others = killerPlayerIds.filter(
      (id) => String(id) !== String(excludePlayerId),
    );
    if (others.length === 0) return null;
    return `вместе с: ${others
      .map(
        (id) =>
          players.find((p) => String(p.playerId) === String(id))?.playerName ??
          id,
      )
      .join(", ")}`;
  };

  const getVictimDisplay = (kill: BountyKillEntry | string) => {
    const rawId =
      typeof kill === "string"
        ? kill
        : String((kill as BountyKillEntry).playerId ?? "");
    const victim = players.find((p) => String(p.playerId) === String(rawId));
    const nameFromKill =
      typeof kill === "object" && kill && "playerName" in kill
        ? (kill as BountyKillEntry).playerName
        : undefined;
    return {
      name: (victim?.playerName ?? nameFromKill) ?? "-",
      victimPlayerId: victim?.playerId ?? rawId,
    };
  };

  const handleUndoByEventId = async (eventId: string) => {
    setRemovingEventId(eventId);
    try {
      await bountyEliminateUndo(environment, tournamentId, { eventId });
      onRemoved();
      close();
    } catch (error) {
      console.error(error);
      toast({ type: "error", message: "Не удалось отменить выбивание" });
    } finally {
      setRemovingEventId(null);
    }
  };

  const hasRows = eventsAsKiller.length > 0 || legacyKills.length > 0;

  return (
    <Box flex={{ col: true }}>
      <Modal.Title showCloseButton close={close}>
        Баунти — {row?.playerName ?? ""}
      </Modal.Title>
      <Modal.Content minWidth={400}>
        <Box flex={{ col: true, gap: 2 }}>
          {row != null ? (
            <Typography.Text type="secondary" size="xxSmall">
              Счётчик баунти: {formatBountyCount(row.bountyCount)}
            </Typography.Text>
          ) : null}
          {!hasRows ? (
            <Typography.Text type="secondary" size="small">
              Нет выбиваний
            </Typography.Text>
          ) : (
            <>
              {eventsAsKiller.map((ev) => {
                const { name } = getVictimDisplay(ev.eliminatedPlayerId);
                const withOthers = coKillersLine(ev.killerPlayerIds, myId);
                return (
                  <Box
                    key={ev.eventId}
                    flex={{ align: "center", justify: "space-between", gap: 2 }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <Box flex={{ col: true, gap: 0 }} style={{ minWidth: 0 }}>
                      <Typography.Text size="small">{name}</Typography.Text>
                      {withOthers ? (
                        <Typography.Text type="secondary" size="xxSmall">
                          {withOthers}
                        </Typography.Text>
                      ) : null}
                    </Box>
                    <Button
                      type="ghost"
                      size="xxSmall"
                      style={{ padding: 4 }}
                      iconRight={<X size={16} color="var(--text-error)" />}
                      onClick={() => handleUndoByEventId(ev.eventId)}
                      disabled={removingEventId !== null}
                      loading={removingEventId === ev.eventId}
                    />
                  </Box>
                );
              })}
              {legacyKills.map((kill, index) => {
                const { name } = getVictimDisplay(kill);
                const keyId =
                  typeof kill === "string"
                    ? kill
                    : String((kill as BountyKillEntry).playerId ?? index);
                const eventId =
                  typeof kill === "object" && kill && "eventId" in kill
                    ? kill.eventId
                    : undefined;
                return (
                  <Box
                    key={`${keyId}-${index}`}
                    flex={{ align: "center", justify: "space-between", gap: 2 }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <Typography.Text size="small">{name}</Typography.Text>
                    {eventId ? (
                      <Button
                        type="ghost"
                        size="xxSmall"
                        style={{ padding: 4 }}
                        iconRight={<X size={16} color="var(--text-error)" />}
                        onClick={() => handleUndoByEventId(eventId)}
                        disabled={removingEventId !== null}
                        loading={removingEventId === eventId}
                      />
                    ) : (
                      <Typography.Text type="tertiary" size="xxSmall">
                        Нет eventId — откат недоступен
                      </Typography.Text>
                    )}
                  </Box>
                );
              })}
            </>
          )}
        </Box>
      </Modal.Content>
    </Box>
  );
};

export interface EliminatedByModalProps extends WithModalProps<InGamePlayerState> {
  readonly tournamentId: string;
  readonly players: InGamePlayerState[];
  readonly onRemoved: () => void;
}

export const EliminatedByModal: FC<EliminatedByModalProps> = ({
  close,
  initialData: row,
  tournamentId,
  players,
  onRemoved,
}) => {
  const environment = useEnvironment();
  const [removingEventId, setRemovingEventId] = useState<string | null>(null);
  const victimPlayerId = row?.playerId ?? "";
  const eventsAsVictim: readonly BountyEliminationEvent[] =
    row?.bountyEliminationEvents?.filter(
      (e) => e.eliminatedPlayerId === victimPlayerId,
    ) ?? [];
  const legacyKillerIds =
    eventsAsVictim.length > 0 ? [] : (row?.eliminatedBy ?? []);

  const killerNamesLine = (ids: readonly string[]) =>
    ids
      .map(
        (id) =>
          players.find((p) => String(p.playerId) === String(id))?.playerName ??
          id,
      )
      .join(", ");

  const handleUndoByEventId = async (eventId: string) => {
    setRemovingEventId(eventId);
    try {
      await bountyEliminateUndo(environment, tournamentId, { eventId });
      onRemoved();
      close();
    } catch (error) {
      console.error(error);
      toast({ type: "error", message: "Не удалось отменить запись" });
    } finally {
      setRemovingEventId(null);
    }
  };

  const hasRows = eventsAsVictim.length > 0 || legacyKillerIds.length > 0;

  return (
    <Box flex={{ col: true }}>
      <Modal.Title showCloseButton close={close}>
        Кто меня выбил — {row?.playerName ?? ""}
      </Modal.Title>
      <Modal.Content minWidth={400}>
        <Box flex={{ col: true, gap: 2 }}>
          {!hasRows ? (
            <Typography.Text type="secondary" size="small">
              Нет записей
            </Typography.Text>
          ) : (
            <>
              {eventsAsVictim.map((ev) => (
                <Box
                  key={ev.eventId}
                  flex={{ align: "center", justify: "space-between", gap: 2 }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <Typography.Text size="small">
                    {killerNamesLine(ev.killerPlayerIds)}
                  </Typography.Text>
                  <Button
                    type="ghost"
                    size="xxSmall"
                    style={{ padding: 4 }}
                    iconRight={<X size={16} color="var(--text-error)" />}
                    onClick={() => handleUndoByEventId(ev.eventId)}
                    disabled={removingEventId !== null}
                    loading={removingEventId === ev.eventId}
                  />
                </Box>
              ))}
              {legacyKillerIds.map((id, index) => (
                <Box
                  key={`${id}-${index}`}
                  flex={{ align: "center", justify: "space-between", gap: 2 }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <Typography.Text size="small">
                    {players.find((p) => String(p.playerId) === String(id))
                      ?.playerName ?? id}
                  </Typography.Text>
                  <Typography.Text type="tertiary" size="xxSmall">
                    Нет eventId — откат недоступен
                  </Typography.Text>
                </Box>
              ))}
            </>
          )}
        </Box>
      </Modal.Content>
    </Box>
  );
};
