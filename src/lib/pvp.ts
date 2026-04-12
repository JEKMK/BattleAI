// PVP: Street Cred ELO system + types

export interface CredChange {
  attackerGain: number;
  defenderLoss: number;
  ramStolen: number;
}

export interface PvpTarget {
  id: string;
  name: string;
  faction: string;
  streetCred: number;
  pvpWins: number;
  pvpLosses: number;
  potentialCredGain: number;
  potentialCredLoss: number;
}

export interface PvpNotification {
  attackerName: string;
  attackerWon: boolean;
  credChange: number;
  ramLost: number;
  ticks: number;
  createdAt: string;
}

export interface PvpBattleResult {
  attackerWon: boolean;
  attackerCredChange: number;
  defenderCredChange: number;
  ramTransferred: number;
  ticks: number;
  attackerHp: number;
  defenderHp: number;
  defenderName: string;
  defenderPrompt: string;
}

/**
 * Asymmetric ELO calculation for Street Cred.
 * K=40 for volatility. Underdog wins give big gains.
 */
export function calculateCredChange(
  attackerCred: number,
  defenderCred: number,
  attackerWon: boolean,
): CredChange {
  const credDiff = defenderCred - attackerCred;
  const expectedWin = 1 / (1 + Math.pow(10, -credDiff / 400));
  const K = 40;

  if (attackerWon) {
    const attackerGain = Math.round(K * (1 - expectedWin));
    const defenderLoss = -attackerGain;
    const ramStolen = Math.max(5, Math.round(attackerGain * 0.6));
    return { attackerGain, defenderLoss, ramStolen };
  } else {
    const attackerLoss = -Math.round(K * expectedWin);
    const defenderGain = -attackerLoss;
    return { attackerGain: attackerLoss, defenderLoss: defenderGain, ramStolen: 0 };
  }
}

/**
 * Pre-calculate potential gain/loss for target card display
 */
export function calculatePotentials(attackerCred: number, defenderCred: number) {
  const winResult = calculateCredChange(attackerCred, defenderCred, true);
  const loseResult = calculateCredChange(attackerCred, defenderCred, false);
  return {
    potentialCredGain: winResult.attackerGain,
    potentialCredLoss: loseResult.attackerGain, // negative number
  };
}
