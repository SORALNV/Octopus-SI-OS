# Octopus 日本語版 0.1.0 Preview 1

[miuuyy/Octopus-SI-OS](https://github.com/miuuyy/Octopus-SI-OS) の非公式日本語版です。初回案内、設定、メニュー、ナビゲーション、操作時の案内を日本語化しています。今回は日本語固定で、日英切り替えにはまだ対応していません。

## ダウンロードとインストール

**Apple Silicon（M1以降）・macOS 14以降**向けです。Intel Mac には対応していません。

- `Octopus-{{version}}-macos-{{architecture}}.dmg` をダウンロードし、`Octopus.app` を Applications にコピーします。DMG 上から直接起動しないでください。
- 別の Mac のコーディングエージェントに `install-prompt-ja.md` の内容を貼れば、取得・検証・インストールを依頼できます。
- 既存のアプリを更新する場合は、アプリと実行中の処理を終了してから行ってください。Home・会話・設定・認証情報は削除しないでください。

Node・Rust・ソースの Clone は不要です。Command Line Tools for Xcode が必要です。未導入の場合は `xcode-select --install` でインストールします。ChatGPT へのログインや必要な macOS 権限の許可は各 Mac で行ってください。

## 署名と初回起動

このプレビューは ad-hoc 署名で、Apple の公証を受けていません。`checksums.txt` で DMG の SHA-256 を照合し、コピーしたアプリを `codesign --verify --deep --strict` で検証してください。隔離属性の解除が必要な場合は、検証したアプリに限って行います。

添付の `install.sh` はこの Fork の Preview 1 を取得し、SHA-256・署名・アプリ ID・バージョンを検証してからインストールします。検証済みコピーの隔離属性を解除し、既存アプリはバックアップとして残します。内容を確認してから実行してください。

## 検証範囲・既知の制限

- 専用テスト用 Home で、パッケージ版の初回案内・Home・設定・日本語検索を確認済みです。DMG 作成時に全ファイルの内容・権限・リンクとコード署名を再検証しています。
- 別の実機 Mac へのインストール、実アカウントでの新規ログインとモデル応答は未検証です。
- 利用者のメッセージ、モデル応答、外部サービスの文言は翻訳しません。訳語やレイアウトはプレビューとして改善中です。
- 日本語化の基準は上流 `c44cede`、アプリのソースは日本語化コミット `2ba67fb` です。その後の上流更新は含みません。
- 以前からローカルにあった依存パッケージ更新と ES2023 の型検査設定を使って作成しています。公開ソースとの差は `build-info.json` に記載しています。
- 自動更新はありません。上流への追従は依頼時に行います。

[日本語版の方針](https://github.com/SORALNV/Octopus-SI-OS/blob/main/docs/japanese-fork.md) · [初回設定](https://github.com/SORALNV/Octopus-SI-OS/blob/main/docs/getting-started.md)
