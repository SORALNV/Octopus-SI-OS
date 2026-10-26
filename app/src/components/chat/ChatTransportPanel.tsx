import type { OctopusProviderInterface } from "../../electron";

type Props = {
  endpoint: string;
  token: string;
  providerInterfaceId: string;
  providerInterfaces: OctopusProviderInterface[];
  activeProvider?: OctopusProviderInterface;
  artifactTransfer: {
    status: string;
    reason: string;
    path: string;
  };
  providerInterfaceError: string;
  onEndpointChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  onProviderInterfaceChange: (value: string) => void;
};

export function ChatTransportPanel({
  endpoint,
  token,
  providerInterfaceId,
  providerInterfaces,
  activeProvider,
  artifactTransfer,
  providerInterfaceError,
  onEndpointChange,
  onTokenChange,
  onProviderInterfaceChange,
}: Props) {
  return (
    <div className="chat-transport-panel">
      <label>
        <span>エンドポイント</span>
        <input value={endpoint} onChange={(event) => onEndpointChange(event.target.value)} spellCheck={false} />
      </label>
      <label>
        <span>プロバイダーのインターフェース</span>
        {providerInterfaces.length ? (
          <select value={providerInterfaceId} onChange={(event) => onProviderInterfaceChange(event.target.value)}>
            {providerInterfaces.map((provider) => (
              <option key={provider.id} value={provider.id}>{provider.label}</option>
            ))}
          </select>
        ) : (
          <input value={providerInterfaceId} onChange={(event) => onProviderInterfaceChange(event.target.value)} spellCheck={false} />
        )}
      </label>
      <label>
        <span>Bearer トークン</span>
        <input value={token} onChange={(event) => onTokenChange(event.target.value)} spellCheck={false} type="password" />
      </label>
      <div className="chat-provider-kinds">
        <span>成果物の転送</span>
        <strong title={artifactTransfer.path || artifactTransfer.reason}>
          {artifactTransfer.status}{artifactTransfer.reason ? ` / ${artifactTransfer.reason}` : ""}
        </strong>
      </div>
      <div className="chat-provider-kinds">
        <span>ハンドラーの参照</span>
        <strong>{activeProvider?.runtimeHandlerRef || "情報なし"}</strong>
      </div>
    </div>
  );
}
