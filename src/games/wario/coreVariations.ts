import type { RushVariationDefinition } from './engine';

export const CORE_VARIATIONS: Record<string, readonly RushVariationDefinition[]> = {
  jump: [
    { name: '右からハードル' },
    { name: '左からハードル', hint: '左から来るハードルをタップ / Space でジャンプ。右側の自分を見よう。', shortHint: '左から来る！ タップ / Space でジャンプ' },
    { name: '2連続ハードル', command: '2回 とびこえろ！', hint: '右から来る2本のハードルを、それぞれタップ / Space でジャンプしてこえよう。', shortHint: '2本を順に タップ / Space でジャンプ' },
  ],
  catch: [
    { name: 'ドーナツ3こ' },
    { name: '4こキャッチ', hint: '指でカゴを動かす / ← →。4つのおやつを続けて受けとめよう。', shortHint: '指 / ← → で移動。4こ全部キャッチ！' },
    { name: 'ゆらゆらおやつ', hint: '左右にゆれながら落ちるおやつを3つキャッチ。指でカゴを動かす / ← →。', shortHint: 'ゆれるおやつの下へ 指 / ← →' },
  ],
  inflate: [
    { name: 'れんだポンプ' },
    { name: 'なが押しポンプ', command: 'なが押しで ふくらめ！', hint: 'タップ / Space を押したままにして、風船を最後までふくらませよう。', shortHint: '画面 / Space を押したまま！' },
    { name: 'こうごポンプ', command: '左右こうごに！', hint: '← → を交互に押して空気を入れる。画面下の左右ボタンでも操作できるよ。', shortHint: '← → / 下の左右を交互におす' },
  ],
  stop: [
    { name: 'ふりこの針' },
    { name: '往復スライダー', hint: '一定の速さで往復する針。緑のゾーンでタップ / Space！', shortHint: '往復する針を 緑で タップ / Space' },
    { name: 'うごく緑ゾーン', hint: '針だけでなく緑のゾーンも動く。重なった瞬間にタップ / Space。', shortHint: '動く緑と針が重なったら タップ / Space' },
  ],
  match: [
    { name: 'おなじ形' },
    { name: 'ちがう形', command: 'ちがう形を えらべ！', hint: 'お手本と違う形は1つだけ。タップ / ← → で選んで Space。', shortHint: 'お手本と違う1つを タップ / ← → ＋ Space' },
    { name: 'おなじ数', command: 'おなじ数を えらべ！', hint: '上のお手本と同じ数のマークをえらぼう。タップ / ← → ＋ Space。', shortHint: '上と同じ数を タップ / ← → ＋ Space' },
  ],
  dodge: [
    { name: 'ばらばらメテオ' },
    { name: 'はさみうちメテオ', hint: '左右の隕石と真ん中の隕石が交互に落ちる。指 / ← → で空いている場所へ。', shortHint: '左右・中央の波を 指 / ← → でよける' },
    { name: 'ねらい撃ちメテオ', hint: '照準の場所に隕石が落ちる。照準がついたら指 / ← → で別の場所へ移動！', shortHint: '照準がついたら 指 / ← → で移動！' },
  ],
  react: [
    { name: '緑でタップ' },
    { name: 'やじるし信号', command: '緑で やじるし！', hint: '緑になったら表示の方向へ ← / →。画面下の左右ボタンも使える。赤では待とう。', shortHint: '緑で表示の ← → / 下の左右ボタン' },
    { name: '緑ではなせ', command: '緑で はなせ！', hint: '赤の間に画面 / Space を長押し。緑に変わったら離そう。赤で離すと失敗！', shortHint: '赤で長押し → 緑になったら離す！' },
  ],
  sequence: [
    { name: '左からコード' },
    { name: '右からコード', command: '右から 順番に！', hint: '一番右から左へ、表示の矢印どおりに ← →。画面下の左右ボタンでも入力できる。', shortHint: '右から左へ 表示の ← → / 下の左右' },
    { name: 'はんたいコード', command: '反対を 入力！', hint: '左から順に、表示と反対の方向を入力。← は →、→ は ←！ 下の左右ボタンでもOK。', shortHint: '左から順に、表示と反対の ← →' },
  ],
};
