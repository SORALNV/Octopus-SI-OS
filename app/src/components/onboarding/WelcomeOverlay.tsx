import { useEffect, useMemo, useRef, useState } from "react";
import { OctopusDotCloud } from "./OctopusDotCloud";
import { MorphVideoDotCloud } from "./MorphVideoDotCloud";
import { Glyph, type GlyphName } from "../IconGlyphs";
import { readWelcomeProgress, saveWelcomeProgress } from "../../onboarding/onboardingStorage";

type Props = {
  visitCount: number;
  onComplete: () => void;
};

type StepKind = "hero" | "manifesto" | "primitives" | "preview";

type Step = {
  kind: StepKind;
  cta: string;
};

const welcomeSteps: Step[] = [
  { kind: "hero", cta: "はじめる" },
  { kind: "preview", cta: "同意して続ける" },
  { kind: "manifesto", cta: "続ける" },
  { kind: "primitives", cta: "続ける" },
];

const primitives: Array<{ glyph: GlyphName; name: string; copy: string }> = [
  { glyph: "interfaces", name: "インターフェース", copy: "プロバイダー、チャネル、センサー、ワーカー、ツールの作業場所をつなぐ、定義済みの窓口です。" },
  { glyph: "ee", name: "作業環境", copy: "ツールが動作する場所です。ワークスペース、ブラウザー、デスクトップ、コンテナーなどがあります。" },
  { glyph: "sites", name: "成果物", copy: "メッセージ、ファイルの参照、ツールの呼び出しや結果など、インターフェースを通じてやり取りするデータです。" },
  { glyph: "binding", name: "ポリシーと紐付け", copy: "実行が使えるもの、接続できるインターフェース、読み取れるコンテキストを定めます。" },
  { glyph: "topology", name: "目標と実行", copy: "環境は目標と権限を持ち、実行は作業と入力待ちのチェックポイントを記録します。" },
  { glyph: "descriptor", name: "記述子", copy: "機能を定義し、システムに接続するための JSON です。" },
];

const HERO_SRC = "./octopus-providers.png";
const GITHUB_URL = "https://github.com/miuuyy/Octopus-SI-OS";
const X_URL = "https://x.com/miuuyy";
const DOCS_URL = "https://github.com/miuuyy/Octopus-SI-OS#readme";

type IdeaTheme = { heading: string; body: string; src: string };

const SHELL_MARK_SRC = "./mark-shell.png";
const SHELL_MARK_VIDEO_SRC = "./mark-shell.mp4";

const IDEA_THEMES: IdeaTheme[] = [
  {
    heading: "インターフェースでつながる",
    body:
      "Octopus が操作できる範囲を「システム」、その外側を「外部」と呼びます。モデルのプロバイダー、マイク、チャットのチャネルなど、定義されたインターフェースが両者をつなぎ、共通の仕組みで成果物をやり取りします。接続を追加するには、記述子とドライバーをインストールし、アクセスを許可します。カーネルを変更する必要はありません。",
    src: "./onboarding/artifact-protocol.png",
  },
  {
    heading: "必要なソフトウェアを追加",
    body:
      "基本システムを一度インストールすれば、あとは作業に必要なアプリケーションとドライバーを選べます。機能は JSON で定義し、必要に応じて実行コードを用意します。足りない機能は、権限を持つ開発用ワーカーが作成し、通常のファイル操作で登録できます。以後の実行でも、紐付けと権限が許す範囲でその機能を使えます。",
    src: "./onboarding/descriptor-evolution.png",
  },
  {
    heading: "作業を待機して、続きから再開",
    body:
      "実行は、目標と権限を持つ環境の中で作業を記録します。チェックポイントで待機し、必要な入力が届くと続きから再開できます。ツールは、ワークスペース、ブラウザー、デスクトップ、コンテナーなどの作業環境で動作します。待機中も、進捗と満たされていない条件はディスクに保存されます。",
    src: "./onboarding/worker-environment.png",
  },
  {
    heading: "結果を確かめる",
    body:
      "チェックポイントでは、作業を続ける前に成果物の検証を求められます。検証プログラムが確認を行い、合格すると実行基盤が検証記録を残します。たとえば、ビルドの検証ではビルドが成功したことを確認できます。検証記録は結果と証拠を結び付け、その検証で確認した範囲だけを証明します。",
    src: "./onboarding/verified-mark.png",
  },
  {
    heading: "作業ごとに権限を管理",
    body:
      "各実行の権限は、ワーカーの権限の上限、環境の階層、定義された紐付けが重なる範囲で決まります。Octopus は成果物が届くたびに権限を計算し直します。モデルには利用可能なツールとコンテキストを渡し、実行基盤と作業環境が権限の境界を守ります。内側の環境で権限を広げることはできず、さらに絞り込むことだけができます。",
    src: "./onboarding/policy-formation.png",
  },
  {
    heading: "あとから確認できる記録",
    body:
      "メッセージ、ツールの呼び出し、結果、メモリは、成果物としてインターフェースを通過します。内容と保存先はマニフェストで特定でき、移動の履歴は拒否や検証の失敗も含めて台帳に残ります。実行に何が届き、どの境界を通り、何を根拠に結果が示されたかをたどれます。",
    src: "./onboarding/artifact-ledger.png",
  },
  {
    heading: "作業をひとつの場所に",
    body:
      "ホームでは文字や音声で会話を続けられます。仕事をプロジェクトに整理し、エージェントを設定してタスクを任せましょう。アプリケーションはプロバイダー、サービス、コンテキストをつなぎ、ドライバーはツールが動く場所を用意します。ダッシュボードでは、その裏側にある環境、実行、移動を確認できます。設定と作業の記録は、ローカルのホームディレクトリに保存されます。",
    src: SHELL_MARK_SRC,
  },
];

const IDEA_SRCS = IDEA_THEMES.map((theme) => theme.src);

export function WelcomeOverlay({ visitCount, onComplete }: Props) {
  const [savedProgress] = useState(readWelcomeProgress);
  const [stepIndex, setStepIndex] = useState(savedProgress.step);
  const [heroAssembled, setHeroAssembled] = useState(savedProgress.heroSeen);
  const replayKey = useRef(0);
  const steps = useMemo(() => welcomeSteps, []);
  const step = steps[stepIndex];
  const isHero = step.kind === "hero";
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const footerHidden = isHero && !heroAssembled;

  useEffect(() => {
    saveWelcomeProgress({ step: stepIndex, heroSeen: true });
  }, [stepIndex]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter" || event.key === "ArrowRight") {
        event.preventDefault();
        advance();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        back();
      } else if (event.key === "Escape" && !isLast) {
        event.preventDefault();
        onComplete();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function goTo(index: number) {
    if (steps[index].kind === "hero") {
      replayKey.current += 1;
      setHeroAssembled(false);
    }
    setStepIndex(index);
  }

  function advance() {
    if (stepIndex < steps.length - 1) {
      goTo(stepIndex + 1);
      return;
    }
    onComplete();
  }

  function back() {
    if (stepIndex > 0) goTo(stepIndex - 1);
  }

  return (
    <main className="welcome" data-visit-count={visitCount} data-step={step.kind} aria-labelledby="welcome-title">
      <header className="welcome-top">
        <div className="welcome-brand">
          <img className="welcome-brand-mark" src="./octopus-logo.png" alt="" />
          <span className="welcome-brand-name">Octopus&nbsp;OS</span>
        </div>
        {!isLast ? (
          <button className="welcome-skip" type="button" onClick={onComplete}>
            スキップ
          </button>
        ) : (
          <span className="welcome-skip welcome-skip-spacer" aria-hidden="true" />
        )}
      </header>

      {isHero ? (
        <HeroStage
          assembled={heroAssembled}
          onAssembled={() => setHeroAssembled(true)}
          replayKey={replayKey.current}
          skipReveal={savedProgress.heroSeen}
        />
      ) : (
        <div className="welcome-stage" key={stepIndex} data-kind={step.kind}>
          {step.kind === "manifesto" ? <IdeaStep /> : null}
          {step.kind === "primitives" ? <PrimitivesStep /> : null}
          {step.kind === "preview" ? <PreviewStep /> : null}
        </div>
      )}

      <footer className="welcome-footer" data-hidden={footerHidden ? "true" : "false"}>
        <div className="welcome-footer-side welcome-footer-left">
          {!isFirst ? (
            <button className="welcome-back" type="button" onClick={back}>
              戻る
            </button>
          ) : null}
        </div>
        <div className="welcome-step-count" aria-hidden="true">
          <span className="welcome-step-now">{String(stepIndex + 1).padStart(2, "0")}</span>
          <span className="welcome-step-sep">/</span>
          <span className="welcome-step-total">{String(steps.length).padStart(2, "0")}</span>
        </div>
        <div className="welcome-footer-side welcome-footer-right">
          <button className="welcome-next" type="button" onClick={advance}>
            {step.cta}
          </button>
        </div>
      </footer>
    </main>
  );
}

function HeroStage({
  assembled,
  onAssembled,
  replayKey,
  skipReveal,
}: {
  assembled: boolean;
  onAssembled: () => void;
  replayKey: number;
  skipReveal: boolean;
}) {
  return (
    <div className="welcome-hero-stage">
      <div className="welcome-hero-bg">
        <OctopusDotCloud src={HERO_SRC} framing="bottom" onAssembled={onAssembled} replayKey={replayKey} skipReveal={skipReveal} />
        <div className="welcome-hero-veil" aria-hidden="true" />
      </div>
      <div className={`welcome-hero-copy${assembled ? " is-in" : ""}`}>
        <span className="welcome-tag">研究プレビュー</span>
        <h1 id="welcome-title" className="welcome-title welcome-title-hero">
          Octopus&nbsp;OS へようこそ
        </h1>
        <p className="welcome-body welcome-hero-body">
          エージェントのためのオペレーティングシステムです。話しかけて仕事を頼み、使えるアプリケーションやツールを選べます。
        </p>
      </div>
    </div>
  );
}

function IdeaStep() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(0);
  const sectionIndexRef = useRef(0);
  const wheelDeltaRef = useRef(0);
  const wheelLockedRef = useRef(false);
  const wheelResetTimerRef = useRef<number | null>(null);
  const wheelUnlockTimerRef = useRef<number | null>(null);

  function computeProgress() {
    const el = scrollRef.current;
    if (!el) return;
    const sections = Array.from(el.querySelectorAll<HTMLElement>(".welcome-idea-section"));
    if (sections.length > 0) {
      const progress = Math.max(0, Math.min(sections.length - 1, el.scrollTop / Math.max(1, el.clientHeight)));
      progressRef.current = progress;
      sectionIndexRef.current = Math.round(progress);
    }
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      if (wheelUnlockTimerRef.current != null) window.clearTimeout(wheelUnlockTimerRef.current);
      wheelUnlockTimerRef.current = window.setTimeout(() => {
        wheelLockedRef.current = false;
      }, 260);
      if (wheelLockedRef.current) return;
      wheelDeltaRef.current += event.deltaY;
      if (wheelResetTimerRef.current != null) window.clearTimeout(wheelResetTimerRef.current);
      wheelResetTimerRef.current = window.setTimeout(() => {
        wheelDeltaRef.current = 0;
      }, 140);
      if (Math.abs(wheelDeltaRef.current) < 28) return;
      const sections = Array.from(el.querySelectorAll<HTMLElement>(".welcome-idea-section"));
      const direction = wheelDeltaRef.current > 0 ? 1 : -1;
      const nextIndex = Math.max(0, Math.min(sections.length - 1, sectionIndexRef.current + direction));
      wheelDeltaRef.current = 0;
      if (nextIndex === sectionIndexRef.current) return;
      sectionIndexRef.current = nextIndex;
      wheelLockedRef.current = true;
      el.scrollTo({ top: nextIndex * el.clientHeight, behavior: "smooth" });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    computeProgress();
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (wheelResetTimerRef.current != null) window.clearTimeout(wheelResetTimerRef.current);
      if (wheelUnlockTimerRef.current != null) window.clearTimeout(wheelUnlockTimerRef.current);
    };
  }, []);

  return (
    <section className="welcome-idea">
      <div className="welcome-idea-left">
        <span className="welcome-tag">基本の考え方</span>
        <div className="welcome-idea-scroll" ref={scrollRef} onScroll={computeProgress}>
          {IDEA_THEMES.map((theme, i) => (
            <div className="welcome-idea-section" key={theme.heading}>
              <h2 className="welcome-idea-heading" {...(i === 0 ? { id: "welcome-title" } : {})}>
                {theme.heading}
              </h2>
              <p className="welcome-body">{theme.body}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="welcome-idea-art" aria-hidden="true">
        <MorphVideoDotCloud
          srcs={IDEA_SRCS}
          videoSrc={SHELL_MARK_VIDEO_SRC}
          progressRef={progressRef}
          particleScale={1.6}
          monochrome
          sparkle
          className="welcome-video-cloud"
        />
      </div>
    </section>
  );
}

function PrimitivesStep() {
  return (
    <section className="welcome-primitives">
      <span className="welcome-tag">仕組み</span>
      <h1 id="welcome-title" className="welcome-title">
        少数の基本要素を組み合わせる
      </h1>
      <p className="welcome-body welcome-body-wide">
        小さなカーネルが基本要素をつなぎ、アプリケーションやドライバーが必要な機能を提供します。
      </p>
      <div className="welcome-grid">
        {primitives.map((item, index) => (
          <article className="welcome-card" key={item.name} style={{ "--i": index } as React.CSSProperties}>
            <Glyph name={item.glyph} size={20} className="welcome-card-glyph" />
            <h2 className="welcome-card-title">{item.name}</h2>
            <p className="welcome-card-copy">{item.copy}</p>
          </article>
        ))}
      </div>
      <a className="welcome-textlink" href={DOCS_URL} target="_blank" rel="noreferrer">
        ドキュメントを読む
        <Glyph name="chevronDown" size={14} className="welcome-textlink-arrow" />
      </a>
    </section>
  );
}

function PreviewStep() {
  return (
    <section className="welcome-centered">
      <span className="welcome-tag">はじめる前に</span>
      <h1 id="welcome-title" className="welcome-title">
        このアプリは研究プレビューです
      </h1>
      <p className="welcome-body">
        Octopus は開発初期の段階で、活発に更新されています。未完成の部分や互換性のない変更があり、設計も変わることがあります。ご自身の ChatGPT アカウントを使い、ローカルで動作します。
      </p>
      <div className="welcome-support">
        <span className="welcome-support-label">プロジェクトをフォロー・応援する</span>
        <div className="welcome-support-links">
          <a className="welcome-pill" href={GITHUB_URL} target="_blank" rel="noreferrer">
            <GitHubIcon />
            GitHub でスターを付ける
          </a>
          <a className="welcome-pill" href={X_URL} target="_blank" rel="noreferrer">
            <XIcon />
            X でフォロー
          </a>
        </div>
      </div>
    </section>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2.3c-5.46 0-9.9 4.42-9.9 9.88 0 4.37 2.84 8.08 6.78 9.39.5.09.68-.22.68-.48 0-.24-.01-1.02-.02-1.85-2.76.6-3.34-1.17-3.34-1.17-.45-1.15-1.1-1.45-1.1-1.45-.9-.62.07-.61.07-.61 1 .07 1.52 1.02 1.52 1.02.88 1.51 2.31 1.08 2.88.82.09-.64.35-1.08.63-1.32-2.2-.25-4.52-1.1-4.52-4.9 0-1.08.39-1.97 1.02-2.66-.1-.25-.44-1.26.1-2.62 0 0 .83-.27 2.72 1.02.79-.22 1.64-.33 2.48-.33.84 0 1.69.11 2.48.33 1.89-1.29 2.72-1.02 2.72-1.02.54 1.36.2 2.37.1 2.62.64.69 1.02 1.58 1.02 2.66 0 3.81-2.32 4.65-4.53 4.9.36.31.68.92.68 1.86 0 1.34-.01 2.42-.01 2.75 0 .27.18.58.69.48a9.9 9.9 0 0 0 6.77-9.39c0-5.46-4.43-9.88-9.9-9.88Z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M13.65 10.63 20.12 3h-1.53l-5.62 6.62L8.49 3H3.32l6.78 10.01L3.32 21h1.53l5.93-6.99L15.52 21h5.17l-7.04-10.37Zm-2.1 2.47-.69-1L5.4 4.16h2.36l4.41 6.41.69 1 5.73 8.33h-2.36l-4.68-6.8Z"
      />
    </svg>
  );
}
