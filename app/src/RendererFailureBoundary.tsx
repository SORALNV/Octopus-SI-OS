import { Component, type ErrorInfo, type ReactNode } from "react";

const FAILURE_BUTTON_BASE = "border-token-border no-drag cursor-interaction flex items-center gap-1 border whitespace-nowrap select-none focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 rounded-lg h-token-button-composer px-3 py-0 text-sm leading-[18px]";
const FAILURE_PRIMARY_BUTTON_CLASS = `${FAILURE_BUTTON_BASE} bg-token-foreground text-token-dropdown-background enabled:hover:bg-token-foreground/80 border-transparent`;
const FAILURE_GHOST_BUTTON_CLASS = `${FAILURE_BUTTON_BASE} text-token-text-tertiary enabled:hover:bg-token-list-hover-background border-transparent`;

type State = {
  error: Error | null;
  componentStack: string;
};

export class RendererFailureBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, componentStack: "" };

  static getDerivedStateFromError(error: Error): State {
    return { error, componentStack: "" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const componentStack = info.componentStack ?? "";
    this.setState({ componentStack });
    void window.octopusTransport?.logClientEvent({
      level: "error",
      event: "renderer.boundary_failure",
      message: `${error.stack || error.message}\n${componentStack}`.slice(0, 8_000),
    }).catch(() => undefined);
  }

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;
    const detail = `${error.stack || error.message}\n${componentStack}`.trim();
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-token-main-surface-primary px-6 text-token-foreground">
        <div className="flex w-full max-w-md flex-col items-center gap-3 text-center">
          <h1 className="m-0 text-base font-medium">この画面を表示できなくなりました</h1>
          <p className="m-0 text-sm leading-5 text-token-text-secondary">実行記録は変更されていません。アプリを再読み込みするか、診断用に表示処理の詳細をコピーしてください。</p>
          <p className="m-0 max-w-full truncate font-mono text-xs leading-4 text-token-description-foreground" title={error.message}>{error.message}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
            <button className={FAILURE_PRIMARY_BUTTON_CLASS} onClick={() => window.location.reload()} type="button">アプリを再読み込み</button>
            <button className={FAILURE_GHOST_BUTTON_CLASS} onClick={() => void window.octopusTransport?.copyText(detail)} type="button">詳細をコピー</button>
            <button className={FAILURE_GHOST_BUTTON_CLASS} onClick={() => void window.octopusTransport?.openClientLogs()} type="button">ログを開く</button>
          </div>
        </div>
      </main>
    );
  }
}
