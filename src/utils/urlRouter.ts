import { GameId } from '../types';

export const VALID_GAME_IDS: readonly GameId[] = [
  'countmasters',
  'lofi',
  'shooting_cert',
  'zoo',
  'sonic',
  'wario',
  'suika',
  'cookie',
  'spire',
  'chiikawa',
  'jewel',
  'holeio',
  'excitebike',
  'bomberman',
  'angrybirds',
  'paperio',
  'pong',
  'doteater',
  'game2048',
  'breakout',
  'shooter',
  'bros',
  'tetris',
  'minesweeper',
] as const;

/**
 * 文字列が有効な GameId かどうかを判定
 */
export function isValidGameId(id: string | null | undefined): id is GameId {
  if (!id) return false;
  return (VALID_GAME_IDS as readonly string[]).includes(id.toLowerCase());
}

/**
 * 現在の window.location（ハッシュ、クエリ、パス）から GameId を抽出
 */
export function getGameIdFromUrl(): GameId | null {
  if (typeof window === 'undefined') return null;

  // 1. ハッシュ形式 (#/tetris, #tetris, #game=tetris, #/game/tetris)
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  if (hash) {
    // #game=tetris 形式
    if (hash.startsWith('game=')) {
      const candidate = hash.replace(/^game=/, '').trim();
      if (isValidGameId(candidate)) return candidate.toLowerCase() as GameId;
    }
    // #/game/tetris 形式
    if (hash.startsWith('game/')) {
      const candidate = hash.replace(/^game\//, '').trim();
      if (isValidGameId(candidate)) return candidate.toLowerCase() as GameId;
    }
    // #/tetris または #tetris 形式
    const hashClean = hash.split('?')[0].split('/')[0].trim();
    if (isValidGameId(hashClean)) {
      return hashClean.toLowerCase() as GameId;
    }
  }

  // 2. クエリパラメータ形式 (?game=tetris または ?g=tetris)
  const params = new URLSearchParams(window.location.search);
  const queryGame = params.get('game') || params.get('g');
  if (isValidGameId(queryGame)) {
    return queryGame.toLowerCase() as GameId;
  }

  // 3. パス形式 (例: .../gemini-games/tetris または .../tetris)
  const pathname = window.location.pathname.replace(/\/$/, '');
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  if (isValidGameId(lastSegment)) {
    return lastSegment.toLowerCase() as GameId;
  }

  return null;
}

/**
 * 特定のゲームの直接アクセス用URLを生成
 * 例: https://hhungry2.github.io/gemini-games/#/tetris
 */
export function getGameDirectUrl(gameId: GameId): string {
  if (typeof window === 'undefined') return `/#/${gameId}`;
  const origin = window.location.origin;
  // pathname の末尾スラッシュを正規化
  let pathname = window.location.pathname;
  if (!pathname.endsWith('/')) {
    // もしパスがファイル名でなくディレクトリ相当なら末尾にスラッシュを確保
    // 例: /gemini-games -> /gemini-games/
    pathname = `${pathname}/`;
  }
  return `${origin}${pathname}#/${gameId}`;
}

/**
 * ブラウザのURLを同期（履歴スタックに追加）
 * @param gameId 選択されたゲーム（null の場合はトップ画面）
 * @param replace pushState ではなく replaceState を使うかどうか
 */
export function syncUrlWithGame(gameId: GameId | null, replace: boolean = false): void {
  if (typeof window === 'undefined') return;

  const currentUrl = new URL(window.location.href);
  let newUrl: string;

  if (gameId) {
    // クエリパラメータの game= は削除し、ハッシュ形式に一本化
    currentUrl.searchParams.delete('game');
    currentUrl.searchParams.delete('g');
    currentUrl.hash = `/${gameId}`;
    newUrl = currentUrl.toString();
  } else {
    // トップ画面: ハッシュと game クエリをクリア
    currentUrl.searchParams.delete('game');
    currentUrl.searchParams.delete('g');
    currentUrl.hash = '';
    // 末尾のスラッシュを維持
    const searchPart = currentUrl.searchParams.toString();
    newUrl = currentUrl.pathname + (searchPart ? `?${searchPart}` : '');
  }

  // URLが変わらない場合は pushState しない
  if (window.location.href !== newUrl) {
    if (replace) {
      window.history.replaceState({ gameId }, '', newUrl);
    } else {
      window.history.pushState({ gameId }, '', newUrl);
    }
  }
}

/**
 * ゲームのURLをクリップボードにコピー
 */
export async function copyGameUrl(gameId: GameId): Promise<boolean> {
  const url = getGameDirectUrl(gameId);
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      return true;
    } else {
      // フォールバック
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.warn('Failed to copy URL to clipboard:', err);
    return false;
  }
}
