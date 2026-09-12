import { BoardCell, OthelloniaPiece, Difficulty } from './types';
import {
  getValidMoves,
  getFlippableCells,
  isCorner,
  isDangerSquare,
  getFlipMultiplier,
  isConditionMet,
  BOARD_SIZE,
} from './boardUtils';

export interface AiDecision {
  pieceIndex: number;
  x: number;
  y: number;
}

export function chooseAiMove(
  board: BoardCell[][],
  hand: OthelloniaPiece[],
  difficulty: Difficulty,
  enemyHp: number,
  enemyMaxHp: number,
  playerHp: number,
  turnNumber: number
): AiDecision | null {
  const validMoves = getValidMoves(board, 'enemy');
  if (validMoves.length === 0 || hand.length === 0) {
    return null;
  }

  // Easy: ランダム寄り（角があれば優先）
  if (difficulty === 'easy') {
    const cornerMove = validMoves.find((m) => isCorner(m.x, m.y));
    const chosenMove = cornerMove || validMoves[Math.floor(Math.random() * validMoves.length)];
    const chosenPieceIndex = Math.floor(Math.random() * hand.length);
    return {
      x: chosenMove.x,
      y: chosenMove.y,
      pieceIndex: chosenPieceIndex,
    };
  }

  // Normal, Hard, Nightmare: 評価関数による最適手探索
  let bestScore = -Infinity;
  let bestDecision: AiDecision = {
    x: validMoves[0].x,
    y: validMoves[0].y,
    pieceIndex: 0,
  };

  const currentHpPercent = (enemyHp / Math.max(1, enemyMaxHp)) * 100;

  for (let pIdx = 0; pIdx < hand.length; pIdx++) {
    const piece = hand[pIdx];

    for (const move of validMoves) {
      let score = 0;
      const { flippedCells, bracketPieces } = getFlippableCells(board, move.x, move.y, 'enemy');
      const flipsCount = flippedCells.length;

      // 1. 位置の価値 (角は超重要、危険マスは減点)
      if (isCorner(move.x, move.y)) {
        score += difficulty === 'nightmare' ? 3000 : 1500;
      } else if (isDangerSquare(move.x, move.y)) {
        // 相手が角を取れるリスク
        score -= difficulty === 'nightmare' ? 800 : 400;
      } else if (move.x === 0 || move.x === BOARD_SIZE - 1 || move.y === 0 || move.y === BOARD_SIZE - 1) {
        // 辺マス
        score += 300;
      }

      // 2. ギミックマス評価
      const targetCell = board[move.y][move.x];
      if (targetCell.gimmick === 'heal' && currentHpPercent < 70) {
        score += 600;
      } else if (targetCell.gimmick === 'buff') {
        score += 500;
      } else if (targetCell.gimmick === 'damage') {
        score -= 500;
      }

      // 3. 通常攻撃ダメージ評価
      const flipMultiplier = getFlipMultiplier(flipsCount);
      let calculatedAtk = piece.atk * flipMultiplier;
      if (targetCell.gimmick === 'buff') calculatedAtk *= 1.5;

      // スキル発動チェック
      const skillMet = isConditionMet(piece.skill.condition, {
        flipsCount,
        currentHpPercent,
        board,
        currentTurn: 'enemy',
        turnNumber,
      });

      let skillDamage = 0;
      if (skillMet) {
        if (piece.skill.effectType === 'special_damage' || piece.skill.effectType === 'pierce') {
          if (piece.skill.power < 10) {
            skillDamage = piece.atk * piece.skill.power;
          } else {
            skillDamage = piece.skill.power;
          }
        } else if (piece.skill.effectType === 'drain') {
          skillDamage = piece.skill.power;
          score += 400; // 回復ボーナス
        } else if (piece.skill.effectType === 'heal') {
          if (currentHpPercent < 60) score += 800;
        } else if (piece.skill.effectType === 'poison') {
          score += piece.skill.power * 2;
        } else if (piece.skill.effectType === 'trap') {
          score += 700;
        } else if (piece.skill.effectType === 'buff') {
          calculatedAtk *= piece.skill.power;
        }
      }

      // 4. コンボスキル連鎖の評価 (挟んだ相手のライン終端にある味方駒のコンボスキル)
      let comboBonus = 0;
      for (const bracket of bracketPieces) {
        if (bracket.piece?.comboSkill) {
          const comboMet = isConditionMet(bracket.piece.comboSkill.condition, {
            flipsCount,
            currentHpPercent,
            board,
            currentTurn: 'enemy',
            turnNumber,
          });
          if (comboMet) {
            comboBonus += 800;
            if (bracket.piece.comboSkill.effectType === 'special_damage' || bracket.piece.comboSkill.effectType === 'buff') {
              comboBonus += 500;
            }
          }
        }
      }

      const totalExpectedDamage = calculatedAtk + skillDamage;
      score += totalExpectedDamage * 0.8 + comboBonus;

      // リーサル判定 (このターンで倒せるなら最大加点)
      if (totalExpectedDamage >= playerHp) {
        score += 100000;
      }

      // 難易度によるランダムゆらぎ
      if (difficulty === 'normal') {
        score += (Math.random() - 0.5) * 400;
      } else if (difficulty === 'hard') {
        score += (Math.random() - 0.5) * 100;
      }

      if (score > bestScore) {
        bestScore = score;
        bestDecision = {
          x: move.x,
          y: move.y,
          pieceIndex: pIdx,
        };
      }
    }
  }

  return bestDecision;
}
