import type { AdmittedClientSurfaceDocument } from "../../client-surfaces/types";
import "../icon-glyphs/worker";
import type { TopologySnapshot } from "../../data/topology";
import type { OctopusClientAccessProfile } from "../../electron";
import { Glyph } from "../IconGlyphs";
import { OctopusEmptyState } from "../OctopusSurface";
import type { ProjectedAssistantCodeComment } from "../chat/assistantDirectives";
import { WorkerEnvironmentSurfacePanel } from "./RunEnvironmentView";
import {
  dispatchOpenWorkerEnvironmentPane,
  resolvePaneClientSurface,
  resolvePaneSurface,
  resolveWorkerEnvironment,
  type WorkerEnvironmentPaneTarget,
} from "./workerEnvironmentPane";

type Props = {
  accessProfile: OctopusClientAccessProfile;
  assistantCodeComments?: ProjectedAssistantCodeComment[];
  snapshot: TopologySnapshot;
  surfaces: AdmittedClientSurfaceDocument[];
  target: WorkerEnvironmentPaneTarget;
};

export function WorkerEnvironmentPaneTab({ accessProfile, assistantCodeComments = [], snapshot, surfaces, target }: Props) {
  const resolved = resolveWorkerEnvironment(snapshot, target.workerEnvironmentId);
  if (!resolved) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col bg-token-main-surface-primary" role="status">
        <OctopusEmptyState
          className="h-full min-h-0 flex-1 select-none"
          description={snapshot.projection.mode === "connecting"
            ? snapshot.projection.detail
            : "実行基盤からこの作業環境の情報が提供されなくなりました。タブは閉じるまで残ります。"}
          icon={<Glyph name="ee" size={32} />}
          title={snapshot.projection.mode === "connecting" ? "Octopus に接続しています" : "作業環境の情報がありません"}
        />
      </div>
    );
  }
  const document = resolvePaneClientSurface(surfaces, target);
  if (target.clientSurface && !document) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col bg-token-main-surface-primary" role="status">
        <OctopusEmptyState
          className="h-full min-h-0 flex-1 select-none"
          description="このタブの画面のリビジョンは、現在は提供されていません。タブを閉じて、最新のリビジョンを開き直してください。"
          icon={<Glyph name="plugins" size={32} />}
          title="作業環境の画面が変更されました"
        />
      </div>
    );
  }
  const surface = document ? null : resolvePaneSurface(resolved.workerEnvironment, target);
  if (!document && !surface && (target.surfaceId || target.filePath || target.panelKind && target.panelKind !== "overview")) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col bg-token-main-surface-primary" role="status">
        <OctopusEmptyState
          className="h-full min-h-0 flex-1 select-none"
          description="このタブの画面は利用できなくなりました。タブを閉じて、現在の作業環境から画面を開き直してください。"
          icon={<Glyph name="ee" size={32} />}
          title="作業環境の画面が変更されました"
        />
      </div>
    );
  }
  return (
    <div className="we-pane-tab">
      <WorkerEnvironmentSurfacePanel
        accessProfile={accessProfile}
        assistantCodeComments={assistantCodeComments}
        document={document}
        environment={resolved.workerEnvironment}
        filePath={target.filePath}
        onOpenFile={(filePath, fileSurface) => dispatchOpenWorkerEnvironmentPane({
          workerEnvironmentId: resolved.workerEnvironment.id,
          surfaceId: fileSurface.id,
          panelKind: "file",
          filePath,
        })}
        run={resolved.run}
        surface={surface}
      />
    </div>
  );
}
