# Octopus 日本語版 {{version}} Preview 2

[miuuyy/Octopus-SI-OS](https://github.com/miuuyy/Octopus-SI-OS) の非公式日本語版です。上流の `04db3ff` までの49コミットを取り込み、日本語 UI を更新しました。日本語固定で、日英切り替えにはまだ対応していません。

## 主な更新

- 音声入力の開始・停止、失敗時の再試行、最近の録音と文字起こしの操作を更新・日本語化。
- 新しいジェスチャー案内と、認識結果を調べる記録機能を日本語化。
- 「ヘルプ」→「不具合を報告」の診断画面を日本語化。内容の確認後に GitHub の下書きを開く方式で、自動送信はしません。
- セットアップ、ファイル表示、保存失敗時の案内、設定検索の日本語を更新。
- 上流の復旧処理・プロバイダー・パッケージ更新の修正を取り込み、配布用の依存パッケージを更新。

## インストール

**Apple Silicon（M1以降）・macOS 14以降**向けです。Intel Mac 向けの配布はありません。

`Octopus-{{version}}-macos-{{architecture}}.dmg` をダウンロードして、`Octopus.app` を Applications にコピーしてください。DMG 上から直接起動しないでください。別 Mac のコーディングエージェントには、添付の `install-prompt-ja.md` を渡してインストールを依頼できます。

Node・Rust・ソースの Clone は不要です。Command Line Tools for Xcode が必要です。未導入なら `xcode-select --install` で導入してください。

更新前に Octopus と実行中の処理を終了してください。添付の `install.sh` はこの版を取得し、チェックサム・署名・アプリ ID・バージョンを検証してからインストールします。既存のアプリは別名で残し、Home・会話・設定・認証情報は削除しません。

## 署名・検証範囲

このプレビューは ad-hoc 署名で、Apple の公証を受けていません。`checksums.txt` で取得ファイルの SHA-256 を照合し、コピーしたアプリを `codesign --verify --deep --strict` で確認してください。インストーラーは、検証したアプリのコピーに限って初回起動用の隔離属性を解除します。

ビルドの基準コミット、依存パッケージ、実施した検証と未確認事項は `build-info.json` に記載しています。実アカウントでの新規ログインやモデル応答、別の実機 Mac での動作は、この配布の検証には含みません。

利用者のメッセージ・モデル応答・外部サービスから届く内容は翻訳しません。自動更新はありません。上流への追従は依頼時に行います。

[日本語版の方針](https://github.com/SORALNV/Octopus-SI-OS/blob/ja-v0.1.1-preview.2/docs/japanese-fork.md)
