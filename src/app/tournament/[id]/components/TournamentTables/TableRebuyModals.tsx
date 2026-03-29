"use client";

import { FC, useEffect, useMemo, useState } from "react";
import { Box } from "@/components/Box/Box";
import { Button } from "@/components/Button/Button";
import { Modal, WithModalProps } from "@/components/Modal/Modal";
import { Typography } from "@/components/Typography/Typography";
import { toast } from "@/components/Toast/Toast";
import { NumberFormatter } from "@/components/Formatter/NumberFormatter/NumberFormatter";
import {
  SearchableSelect,
  SearchableSelectOption,
} from "@/components/SearchableSelect/SearchableSelect";
import {
  BountyKillEntry,
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
import { bountyRemove } from "@/core/states/tournaments/requests/bountyRemove";
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
  const [killerPlayerId, setKillerPlayerId] = useState<string | undefined>(
    undefined,
  );
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

  const killerOptions = useMemo<SearchableSelectOption[]>(
    () =>
      killerCandidates.map((candidate) => ({
        value: candidate.playerId,
        label: `${candidate.playerName} (ID: ${candidate.playerId})`,
      })),
    [killerCandidates],
  );

  useEffect(() => {
    setCount(1);
    setBurnedStack(false);
    setBurnedChipsInput("");
    setKillerPlayerId(killerCandidates[0]?.playerId);
  }, [player?.playerId, killerCandidates]);

  useEffect(() => {
    if (
      killerPlayerId &&
      !killerCandidates.some((c) => c.playerId === killerPlayerId)
    ) {
      setKillerPlayerId(killerCandidates[0]?.playerId);
    }
  }, [killerCandidates, killerPlayerId]);

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
      };
    } else {
      if (!killerPlayerId) return;
      payload = {
        eliminatedPlayerId: player.playerId,
        killerPlayerId,
        type: "Rebuy",
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
            <SearchableSelect
              options={killerOptions}
              value={killerPlayerId}
              placeholder={
                killerCandidates.length > 0
                  ? "Кто выбил игрока?"
                  : "Нет игроков за этим столом"
              }
              disabled={killerCandidates.length === 0 || isSaving}
              onChange={(value) => setKillerPlayerId(value)}
            />
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
                  : !killerPlayerId)
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
  const [removingId, setRemovingId] = useState<string | null>(null);
  const bountyKills = row?.bountyKills ?? [];
  const killerPlayerId = row?.playerId ?? "";

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

  const handleRemove = async (victimPlayerId: string) => {
    setRemovingId(victimPlayerId);
    try {
      await bountyRemove(environment, tournamentId, {
        killerPlayerId,
        victimPlayerId,
      });
      onRemoved();
      close();
    } catch (error) {
      console.error(error);
      toast({ type: "error", message: "Не удалось отменить выбивание" });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Box flex={{ col: true }}>
      <Modal.Title showCloseButton close={close}>
        Баунти — {row?.playerName ?? ""}
      </Modal.Title>
      <Modal.Content minWidth={400}>
        <Box flex={{ col: true, gap: 2 }}>
          {bountyKills.length === 0 ? (
            <Typography.Text type="secondary" size="small">
              Нет выбиваний
            </Typography.Text>
          ) : (
            bountyKills.map((kill, index) => {
              const { name, victimPlayerId } = getVictimDisplay(kill);
              const keyId =
                typeof kill === "string"
                  ? kill
                  : String((kill as BountyKillEntry).playerId ?? index);
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
                  <Button
                    type="ghost"
                    size="xxSmall"
                    style={{ padding: 4 }}
                    iconRight={<X size={16} color="var(--text-error)" />}
                    onClick={() => handleRemove(victimPlayerId)}
                    disabled={removingId !== null}
                    loading={removingId === victimPlayerId}
                  />
                </Box>
              );
            })
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
  const [removingId, setRemovingId] = useState<string | null>(null);
  const eliminatedByIds = row?.eliminatedBy ?? [];
  const victimPlayerId = row?.playerId ?? "";

  const getKillerInfo = (id: string) => {
    const killer = players.find((p) => String(p.playerId) === String(id));
    return {
      name: killer?.playerName ?? id,
      killerPlayerId: killer?.playerId ?? id,
    };
  };

  const handleRemove = async (killerPlayerId: string) => {
    setRemovingId(killerPlayerId);
    try {
      await bountyRemove(environment, tournamentId, {
        killerPlayerId,
        victimPlayerId,
      });
      onRemoved();
      close();
    } catch (error) {
      console.error(error);
      toast({ type: "error", message: "Не удалось отменить запись" });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Box flex={{ col: true }}>
      <Modal.Title showCloseButton close={close}>
        Кто меня выбил — {row?.playerName ?? ""}
      </Modal.Title>
      <Modal.Content minWidth={400}>
        <Box flex={{ col: true, gap: 2 }}>
          {eliminatedByIds.length === 0 ? (
            <Typography.Text type="secondary" size="small">
              Нет записей
            </Typography.Text>
          ) : (
            eliminatedByIds.map((id, index) => {
              const { name, killerPlayerId } = getKillerInfo(id);
              return (
                <Box
                  key={`${id}-${index}`}
                  flex={{ align: "center", justify: "space-between", gap: 2 }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <Typography.Text size="small">{name}</Typography.Text>
                  <Button
                    type="ghost"
                    size="xxSmall"
                    style={{ padding: 4 }}
                    iconRight={<X size={16} color="var(--text-error)" />}
                    onClick={() => handleRemove(killerPlayerId)}
                    disabled={removingId !== null}
                    loading={removingId === killerPlayerId}
                  />
                </Box>
              );
            })
          )}
        </Box>
      </Modal.Content>
    </Box>
  );
};
