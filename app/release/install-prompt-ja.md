> 配布前の原稿です。`ja-v0.1.1-preview.2` はまだ公開していません。公開までは実行せず、[公開済み 0.1.0 版のプロンプト](https://github.com/SORALNV/Octopus-SI-OS/blob/ja-v0.1.0-preview.1/app/release/install-prompt-ja.md) を使ってください。

この Mac に、私の Fork の Octopus 日本語版をインストールしてください。ソースを Clone したり、Rust・Node を用意してビルドしたりせず、ビルド済み DMG を使ってください。実行できる作業はあなたが進めて、ログインや macOS の許可など本人の操作が必要なところだけ案内してください。

配布元と対象:
- リポジトリ: https://github.com/SORALNV/Octopus-SI-OS
- Release: https://github.com/SORALNV/Octopus-SI-OS/releases/tag/ja-v0.1.1-preview.2
- DMG: https://github.com/SORALNV/Octopus-SI-OS/releases/download/ja-v0.1.1-preview.2/Octopus-0.1.1-macos-arm64.dmg
- チェックサム: https://github.com/SORALNV/Octopus-SI-OS/releases/download/ja-v0.1.1-preview.2/checksums.txt
- インストーラー: https://github.com/SORALNV/Octopus-SI-OS/releases/download/ja-v0.1.1-preview.2/install.sh

まず Mac の CPU と OS を確認してください。Apple Silicon（Rosetta 動作中の場合も含む）かつ macOS 14以降が対象です。Intel や古い OS なら、この DMG は実行せず対応外と伝えてください。

Command Line Tools for Xcode を確認し、未導入なら標準のインストールを開始して、必要な本人操作を案内してください。Node と Rust は不要です。

Release の説明とインストーラーを取得して内容を確認し、checksums.txt に記載された SHA-256 とインストーラー・DMG の実際の SHA-256 を照合してください。一致しなければ実行を中止してください。インストーラーはダウンロード先のファイルから実行し、curl の出力を直接シェルへ渡さないでください。インストーラーを使うと DMG の取得・照合・マウント・署名確認・コピーが行われます。手動で同じ処理を行っても構いません。

インストール先は書き込み可能なら /Applications/Octopus.app、そうでなければ ~/Applications/Octopus.app にしてください。既存の Octopus の場所と起動状況も確認してください。起動中で未完了の処理があれば勝手に強制終了せず、終了できるところで案内してください。既存アプリは削除せず別名でバックアップし、Home・会話履歴・設定・認証情報はそのまま残してください。他の Mac から API キーや認証情報をコピーしないでください。

これは Apple 未公証・ad-hoc 署名の非公式プレビューです。コピーしたアプリで codesign --verify --deep --strict を実行し、アプリ ID が com.octopus.desktop、バージョンが 0.1.1、表示言語が日本語であることを確認してください。初回起動のための隔離属性の解除が必要なら、検証した Octopus.app だけを対象にしてください。Gatekeeper 全体や SIP は無効にしないでください。

DMG を取り外し、インストール先のアプリを開いて、日本語の画面が表示されるところまで確認してください。ChatGPT のログインと macOS 権限の許可は本人操作にしてください。最後にインストール先・Release・チェックサムと署名の検証結果・起動確認・未確認事項を短く報告してください。コピーや起動に失敗した場合は成功扱いにしないでください。
