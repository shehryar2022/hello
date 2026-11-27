import React, { memo } from 'react';
import type { GameState } from '../../game/types';
import { RewardsDashboard } from '../rewards/RewardsDashboard';

interface QuestsTabProps {
  state: GameState;
  dayKey: string;
  weekKey: string;
  rankPosition: number;
  serverOffsetMs?: number;
  onClaimDailySlot?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onClaimWeeklyMilestone?: (milestoneId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onClaimQuest: (questId: string, rewardGems: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  onClaimWeekly?: (missionId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onClaimAchievement?: (achievementId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onClaimMilestone: (milestoneId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const QuestsTab: React.FC<QuestsTabProps> = memo(({
  state,
  dayKey,
  weekKey,
  rankPosition,
  serverOffsetMs = 0,
  onClaimDailySlot,
  onClaimWeeklyMilestone,
  onClaimQuest,
  onClaimWeekly,
  onClaimAchievement,
  onClaimMilestone,
}) => {
  return (
    <RewardsDashboard
      state={state}
      dayKey={dayKey}
      weekKey={weekKey}
      rankPosition={rankPosition}
      serverOffsetMs={serverOffsetMs}
      onClaimDailySlot={onClaimDailySlot}
      onClaimWeeklyMilestone={onClaimWeeklyMilestone}
      onClaimQuest={onClaimQuest}
      onClaimWeekly={onClaimWeekly}
      onClaimAchievement={onClaimAchievement}
      onClaimMilestone={onClaimMilestone}
    />
  );
}, (prev, next) => {
  if (
    prev.dayKey !== next.dayKey ||
    prev.weekKey !== next.weekKey ||
    prev.rankPosition !== next.rankPosition ||
    prev.serverOffsetMs !== next.serverOffsetMs ||
    prev.onClaimDailySlot !== next.onClaimDailySlot ||
    prev.onClaimWeeklyMilestone !== next.onClaimWeeklyMilestone ||
    prev.onClaimQuest !== next.onClaimQuest ||
    prev.onClaimWeekly !== next.onClaimWeekly ||
    prev.onClaimAchievement !== next.onClaimAchievement ||
    prev.onClaimMilestone !== next.onClaimMilestone
  ) {
    return false;
  }
  const p = prev.state;
  const n = next.state;
  return (
    p.dSlot === n.dSlot &&
    p.dLastDay === n.dLastDay &&
    p.dHist === n.dHist &&
    p.wMilDay === n.wMilDay &&
    p.wMilClaim === n.wMilClaim &&
    p.wHist === n.wHist &&
    p.qHist === n.qHist &&
    p.questDay === n.questDay &&
    p.questIds === n.questIds &&
    p.claimed === n.claimed &&
    p.weeklyDay === n.weeklyDay &&
    p.weeklyClaimed === n.weeklyClaimed &&
    p.achievements === n.achievements &&
    p.milestones === n.milestones &&
    p.cash === n.cash &&
    p.gems === n.gems &&
    p.streak === n.streak &&
    p.fused === n.fused &&
    p.rank === n.rank &&
    p.gov === n.gov &&
    Math.floor(p.hap) === Math.floor(n.hap) &&
    Math.floor(p.appr) === Math.floor(n.appr) &&
    Math.floor(p.pop) === Math.floor(n.pop) &&
    (p.boost > 0) === (n.boost > 0) &&
    p.tax === n.tax &&
    p.wel === n.wel &&
    p.edu === n.edu &&
    p.fuel === n.fuel &&
    p.carbon === n.carbon &&
    p.luxury === n.luxury &&
    p.corp === n.corp &&
    p.gst === n.gst &&
    p.prop === n.prop &&
    p.duty === n.duty &&
    p.tourism === n.tourism &&
    p.digital === n.digital &&
    p.wealth === n.wealth &&
    p.rd === n.rd &&
    p.green === n.green &&
    p.transitSub === n.transitSub &&
    p.b === n.b &&
    p.bPolicies === n.bPolicies &&
    p.stk === n.stk &&
    p.tech === n.tech &&
    p.gx?.lvl === n.gx?.lvl &&
    p.gx?.blk === n.gx?.blk &&
    p.gx?.pb === n.gx?.pb &&
    p.activeFx === n.activeFx &&
    p.sub === n.sub
  );
});
