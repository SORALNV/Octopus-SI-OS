import type { GestureArtId } from "./GestureIllustration";

export type GestureGuideId = "point" | "pinch" | "carry" | "throw" | "resize";

export type GestureGuideEntry = Readonly<{ title: string; sentence: string; art: GestureArtId }>;

export const GESTURE_GUIDE: Readonly<Record<GestureGuideId, GestureGuideEntry>> = {
  point: {
    title: "指をさして移動",
    sentence: "人さし指で画面内の位置を示すと、その位置にフォーカスが移ります。カメラ映像の端がウィンドウの端に対応します。",
    art: "point",
  },
  pinch: {
    title: "指をつまんで選択",
    sentence: "親指と人さし指を合わせてから離すと、フォーカス中の項目をクリックするように選択できます。",
    art: "pinch",
  },
  carry: {
    title: "つまんだまま移動",
    sentence: "指をつまんだまま手を動かすと、ホームのウィジェットを別の場所に移動できます。",
    art: "carry",
  },
  throw: {
    title: "投げて非表示にする",
    sentence: "ウィジェットをつかんでいるときに手を払って途中で指を離すと、そのウィジェットを非表示にできます。",
    art: "throw",
  },
  resize: {
    title: "両手でサイズを変更",
    sentence: "両手で指をつまみ、左右に広げるとウィジェットが大きくなり、近づけると小さくなります。",
    art: "resize",
  },
};
