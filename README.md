# Gemini Games Hub 🎮

Google の最先端 AI モデル「**Gemini**」を活用したインタラクティブな Web ゲームコレクションです。

## 🌟 収録ゲーム

| ゲーム名 | ジャンル | 概要 |
| :--- | :--- | :--- |
| **🔍 AI 推理探偵ゲーム** (AI Mystery Detective) | 推理・尋問 | Geminiが完全ランダムに事件と容疑者（3名）を生成。探偵として容疑者に質問し、矛盾を見抜いて真犯人を告発します。 |
| **⚔️ AI しりとり＆連想バトル** (Word Chain Battle) | 知育・対戦 | Geminiと知恵比べ！テーマ縛り（IT、ファンタジー、グルメ等）のルールで言葉を繋ぎ、Geminiのユニークなツッコミを楽しみます。 |
| **📖 無限インタラクティブノベル** (Infinite Adventure RPG) | ストーリーRPG | あなたの選択によって展開がリアルタイムに分岐する、Geminiがゲームマスターを務めるインタラクティブなゲームブック。 |

---

## 🚀 クイックスタート

### 1. 依存パッケージのインストール
```bash
npm install
```

### 2. 開発サーバーの起動
```bash
npm run dev
```

起動後、ブラウザで `http://localhost:5173` にアクセスしてください。

### 3. Gemini API キーの設定
以下のいずれかの方法で API キーを設定できます。
- **UI上から設定**: 画面右上の「APIキーを設定」ボタンから入力（ブラウザの LocalStorage に保存されます）
- **環境変数で設定**: `.env.example` をコピーして `.env` を作成し、`VITE_GEMINI_API_KEY` にキーを設定
  ```bash
  cp .env.example .env
  ```

> 🔑 API キーをお持ちでない場合は、[Google AI Studio](https://aistudio.google.com/app/apikey) で無料で取得できます。

---

## 🛠️ 技術スタック

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4
- **AI SDK**: `@google/genai` (Google Gen AI SDK)
- **Icons**: Lucide React

---

## 📁 ディレクトリ構成

```
gemini-games/
├── public/
├── src/
│   ├── components/       # 共通UIコンポーネント (Header, ApiKeyModal, GameCard)
│   ├── games/            # 各ゲームの実装
│   │   ├── MysteryDetective.tsx    # AI推理探偵
│   │   ├── WordChainBattle.tsx     # AIしりとり
│   │   └── InfiniteAdventure.tsx   # 無限ノベルRPG
│   ├── lib/              # Gemini SDKクライアント・APIヘルパー
│   ├── types/            # 型定義
│   ├── App.tsx           # メインアプリケーション
│   ├── main.tsx          # エントリーポイント
│   └── index.css         # スタイル定義
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 💡 新しいゲームの追加方法

1. `src/games/YourNewGame.tsx` を作成し、`generateGameContent` を使って Gemini とのやり取りを実装します。
2. `src/types/index.ts` の `GameId` に新しいゲームIDを追加します。
3. `src/App.tsx` の `GAMES` 配列にゲーム情報を追加し、`renderActiveGame()` にコンポーネントを紐付けます。

---

## 📄 ライセンス

MIT License
