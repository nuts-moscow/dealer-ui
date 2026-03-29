"use client";

import { FC, useMemo, useState } from "react";
import { Box } from "@/components/Box/Box";
import { Button } from "@/components/Button/Button";
import { Modal, WithModalProps } from "@/components/Modal/Modal";
import { Typography } from "@/components/Typography/Typography";
import { toast } from "@/components/Toast/Toast";
import { NumberFormatter } from "@/components/Formatter/NumberFormatter/NumberFormatter";
import {
  Bonus,
  InGameBonus,
  tournamentBonusLabels,
} from "@/core/states/tournaments/common/InGamePlayerState";
import { useEnvironment } from "@/core/states/environment/useEnvironment";
import {
  addPlayerCustomBonusChips,
  addPlayerTournamentBonus,
  removePlayerCustomBonusChipsOne,
  removePlayerTournamentBonus,
} from "@/core/states/tournaments/requests/playerTournamentBonuses";
import {
  refetchTournamentPlayerState,
  useTournamentPlayerState,
} from "@/core/states/tournaments/hooks/useTournamentPlayerState";
import { X } from "lucide-react";

const BONUS_OPTIONS: Bonus[] = Object.values(InGameBonus);

export interface PlayerBonusesModalProps extends WithModalProps {
  readonly tournamentId: string;
  readonly playerId?: string;
}

export const PlayerBonusesModal: FC<PlayerBonusesModalProps> = ({
  close,
  tournamentId,
  playerId,
}) => {
  const environment = useEnvironment();
  const { data: players } = useTournamentPlayerState(tournamentId);
  const player = useMemo(
    () =>
      playerId ? players?.find((p) => p.playerId === playerId) : undefined,
    [players, playerId],
  );
  const [bonusToAdd, setBonusToAdd] = useState<Bonus>(InGameBonus.EarlyBird);
  const [customChipsInput, setCustomChipsInput] = useState("");
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const bonuses = player?.bonuses ?? [];
  const customBonusChips = player?.customBonusChips ?? [];

  const handleRemove = async (bonus: Bonus, index: number) => {
    if (!playerId || loadingKey != null) return;
    const key = `r-${index}`;
    setLoadingKey(key);
    try {
      await removePlayerTournamentBonus(
        environment,
        tournamentId,
        playerId,
        bonus,
      );
      refetchTournamentPlayerState();
    } catch (error) {
      console.error(error);
      toast({ type: "error", message: "Не удалось убрать бонус" });
    } finally {
      setLoadingKey(null);
    }
  };

  const handleAdd = async () => {
    if (!playerId || loadingKey != null) return;
    setLoadingKey("add");
    try {
      await addPlayerTournamentBonus(
        environment,
        tournamentId,
        playerId,
        bonusToAdd,
      );
      refetchTournamentPlayerState();
    } catch (error) {
      console.error(error);
      toast({ type: "error", message: "Не удалось добавить бонус" });
    } finally {
      setLoadingKey(null);
    }
  };

  const handleAddCustom = async () => {
    if (!playerId || loadingKey != null) return;
    const parsed = Number.parseInt(customChipsInput.trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast({
        type: "error",
        message: "Укажите целое число фишек больше 0",
      });
      return;
    }
    setLoadingKey("add-custom");
    try {
      await addPlayerCustomBonusChips(
        environment,
        tournamentId,
        playerId,
        parsed,
      );
      setCustomChipsInput("");
      refetchTournamentPlayerState();
    } catch (error) {
      console.error(error);
      toast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Не удалось добавить кастомный бонус",
      });
    } finally {
      setLoadingKey(null);
    }
  };

  const handleRemoveCustom = async (chips: number, index: number) => {
    if (!playerId || loadingKey != null) return;
    const key = `rc-${index}`;
    setLoadingKey(key);
    try {
      await removePlayerCustomBonusChipsOne(
        environment,
        tournamentId,
        playerId,
        chips,
      );
      refetchTournamentPlayerState();
    } catch (error) {
      console.error(error);
      toast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Не удалось снять кастомный бонус",
      });
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <>
      <Modal.Title showCloseButton close={close}>
        Бонусы — {player?.playerName ?? "игрок"}
      </Modal.Title>
      <Modal.Content minWidth={400}>
        <Box flex={{ col: true, gap: 4 }}>
          <Typography.Text type="secondary" size="small">
            Фиксированные бонусы
          </Typography.Text>
          {bonuses.length === 0 ? (
            <Typography.Text type="secondary" size="small">
              Нет
            </Typography.Text>
          ) : (
            <Box flex={{ col: true, gap: 2 }}>
              {bonuses.map((bonus, index) => {
                const label =
                  tournamentBonusLabels[bonus as Bonus] ?? String(bonus);
                const key = `r-${index}`;
                return (
                  <Box
                    key={`${bonus}-${index}`}
                    flex={{ align: "center", justify: "space-between", gap: 2 }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <Typography.Text size="small">{label}</Typography.Text>
                    <Button
                      type="ghost"
                      size="xxSmall"
                      style={{ padding: 4 }}
                      iconRight={<X size={16} color="var(--text-error)" />}
                      onClick={() => handleRemove(bonus as Bonus, index)}
                      disabled={loadingKey !== null}
                      loading={loadingKey === key}
                    />
                  </Box>
                );
              })}
            </Box>
          )}

          <Typography.Text type="secondary" size="small">
            Кастомные фишки
          </Typography.Text>
          {customBonusChips.length === 0 ? (
            <Typography.Text type="secondary" size="small">
              Нет
            </Typography.Text>
          ) : (
            <Box flex={{ col: true, gap: 2 }}>
              {customBonusChips.map((chips, index) => {
                const key = `rc-${index}`;
                return (
                  <Box
                    key={`custom-bonus-${index}-${chips}`}
                    flex={{ align: "center", justify: "space-between", gap: 2 }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <Typography.Text size="small">
                      <NumberFormatter value={chips} type="withoutDecimals" />{" "}
                      фишек
                    </Typography.Text>
                    <Button
                      type="ghost"
                      size="xxSmall"
                      style={{ padding: 4 }}
                      iconRight={<X size={16} color="var(--text-error)" />}
                      onClick={() => handleRemoveCustom(chips, index)}
                      disabled={loadingKey !== null}
                      loading={loadingKey === key}
                    />
                  </Box>
                );
              })}
            </Box>
          )}
          <Typography.Text type="tertiary" size="xxSmall">
            Снятие убирает последний грант с этой суммой (с конца списка).
          </Typography.Text>

          <Typography.Text type="secondary" size="small">
            Добавить
          </Typography.Text>
          <Box
            flex={{
              align: "flex-start",
              gap: 2,
              flexWrap: "wrap",
            }}
            width="100%"
            style={{ alignItems: "stretch" }}
          >
            <Box
              flex={{ align: "center", gap: 2 }}
              flexItem={{ flex: 1 }}
              style={{ minWidth: 200 }}
            >
              <select
                value={bonusToAdd}
                onChange={(e) => setBonusToAdd(e.target.value as Bonus)}
                disabled={!playerId || loadingKey !== null}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  border: "1px solid var(--border-color)",
                  minHeight: 40,
                  padding: "0 12px",
                  backgroundColor: "var(--background-primary)",
                  color: "var(--text-primary)",
                }}
              >
                {BONUS_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {tournamentBonusLabels[b]}
                  </option>
                ))}
              </select>
              <Button
                type="primary"
                size="xxSmall"
                onClick={handleAdd}
                disabled={!playerId || loadingKey !== null}
                loading={loadingKey === "add"}
              >
                Добавить
              </Button>
            </Box>
            <Box
              flex={{ align: "center", gap: 2 }}
              flexItem={{ flex: 1 }}
              style={{ minWidth: 200 }}
            >
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="Фишки"
                value={customChipsInput}
                onChange={(e) => setCustomChipsInput(e.target.value)}
                disabled={!playerId || loadingKey !== null}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  border: "1px solid var(--border-color)",
                  minHeight: 40,
                  padding: "0 12px",
                  backgroundColor: "var(--background-primary)",
                  color: "var(--text-primary)",
                }}
              />
              <Button
                type="primary"
                size="xxSmall"
                onClick={handleAddCustom}
                disabled={!playerId || loadingKey !== null}
                loading={loadingKey === "add-custom"}
              >
                Кастом
              </Button>
            </Box>
          </Box>

          <Button type="secondary" htmlType="button" onClick={() => close()}>
            Закрыть
          </Button>
        </Box>
      </Modal.Content>
    </>
  );
};
