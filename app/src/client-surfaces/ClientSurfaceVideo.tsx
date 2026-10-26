import { useState } from "react";
import { isSafeClientSurfaceVideoSource } from "../../electron/clientSurfaceDocumentSemantics.mjs";
import "./client-surface-video.css";

export function ClientSurfaceVideo({ source, title }: { source: string; title?: string }) {
  const [failed, setFailed] = useState(false);
  if (!isSafeClientSurfaceVideoSource(source)) {
    return <div className="client-surface-state" role="alert">動画を表示できません。HTTPS の動画リンクが必要です。</div>;
  }
  return (
    <figure className="client-surface-video">
      <video
        aria-label={title || "動画"}
        controls
        crossOrigin="anonymous"
        playsInline
        preload="metadata"
        src={source}
        onError={() => setFailed(true)}
        onLoadedMetadata={() => setFailed(false)}
      />
      <figcaption>
        {title ? <strong>{title}</strong> : null}
        <span>{new URL(source).hostname}</span>
      </figcaption>
      {failed ? <div role="alert">動画を読み込めませんでした。リンクを確認するか、別の動画をお試しください。</div> : null}
    </figure>
  );
}
