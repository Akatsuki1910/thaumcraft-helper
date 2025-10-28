import van from "vanjs-core";
import * as vanX from "vanjs-ext";
import { Hex } from "./hex";
import { ASPECT_NUM } from "./ts/aspectUti";
import { HEX_WIDTH, HEX_HEIGHT } from "./ts/hexUtil";
import { hexResolver } from "./ts/resolver";
const { main, p, div, input, section, button, span } = van.tags;

// メモリサイズを人間が読みやすい形式に変換
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const ViewHexCell = (
  i: number,
  num: number,
  isMini: boolean,
  fn?: () => void,
  sizeMinMax?: {
    min: {
      x: number;
      y: number;
    };
    max: {
      x: number;
      y: number;
    };
  }
) => {
  const size = isMini ? 1 / 2 : 1;

  if (num === -2 && !fn) {
    return div();
  }

  return div(
    {
      class: `hex-item`,
      "data-num": num ?? -2,
      style: Object.entries({
        top: `${
          Math.floor((i - (sizeMinMax?.min.y ?? 0) * HEX_WIDTH) / HEX_WIDTH) *
            82 *
            size +
          (((i - (sizeMinMax?.min.y ?? 0) * HEX_WIDTH) % HEX_WIDTH) % 2) *
            40 *
            size
        }px`,
        left: `${((i - (sizeMinMax?.min.x ?? 0)) % HEX_WIDTH) * 72 * size}px`,
      })
        .map((k) => `${k[0]}:${k[1]};`)
        .join(""),
    },
    Hex(fn)
  );
};

const Main = () => {
  const selectNum = van.state<number | null>(null);
  const aspectNum = vanX.reactive<number[]>(
    [...Array(ASPECT_NUM.length)].map(() => 0)
  );
  const frames = vanX.reactive<number[]>(
    [...Array(HEX_WIDTH)].map(() => Array(HEX_HEIGHT).fill(-2)).flat()
  );
  let answers = van.state<{ frame: number[]; steps: number }[]>([]);
  let isResolving = van.state(false);

  let progressData = van.state<{ step: number; all: number; now: number }>({
    step: 0,
    all: 0,
    now: 0,
  });

  // メモリ使用量の状態管理
  let memoryData = van.state<{
    used: number;
    total: number;
    usedHeap: number;
    totalHeap: number;
  }>({
    used: 0,
    total: 0,
    usedHeap: 0,
    totalHeap: 0,
  });

  // メモリ監視を定期的に実行
  let memoryInterval: NodeJS.Timeout | number;
  const updateMemoryUsage = () => {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      memoryData.val = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        usedHeap: memory.usedJSHeapSize,
        totalHeap: memory.jsHeapSizeLimit,
      };
    } else {
      // メモリAPIが使用できない場合のフォールバック
      memoryData.val = {
        used: 0,
        total: 0,
        usedHeap: 0,
        totalHeap: 0,
      };
    }
  };

  // 通常は1秒ごと、処理中は500msごとにメモリ使用量を更新
  const startMemoryMonitoring = (intensive = false) => {
    if (memoryInterval) clearInterval(memoryInterval);
    memoryInterval = setInterval(updateMemoryUsage, intensive ? 500 : 1000);
  };

  startMemoryMonitoring();
  updateMemoryUsage(); // 初回実行

  const sizeMinMax = vanX.reactive<{
    min: {
      x: number;
      y: number;
    };
    max: {
      x: number;
      y: number;
    };
  }>({
    min: {
      x: -1,
      y: -1,
    },
    max: {
      x: -1,
      y: -1,
    },
  });

  const isDisabled = van.derive(() => {
    const num = aspectNum.reduce((acc, v) => acc + v, 0);
    const frameCount = frames.reduce(
      (acc, v) => {
        return {
          empty: acc.empty + (v === -1 ? 1 : 0),
          filled: acc.filled + (v > 0 ? 1 : 0),
        };
      },
      {
        empty: 0,
        filled: 0,
      }
    );

    return !(
      num !== 0 &&
      frameCount.empty !== 0 &&
      num >= frameCount.empty &&
      frameCount.filled >= 2
    );
  });

  return main(
    div(
      { class: "container" },
      section(
        { class: "hex-wrapper" },
        div(
          { class: "hex-aspect-selector" },
          ASPECT_NUM.map((v, i) =>
            div({ class: "aspect-row" }, () =>
              button({
                class: `aspect-${v} button ${
                  selectNum.val === v ? "selected" : ""
                }`,
                ariaLabel: `Aspect ${v}`,
                onclick: () => (selectNum.val = v),
              })
            )
          )
        ),
        vanX.list(div({ class: "hex-display" }), frames, (v, _, i) => {
          return ViewHexCell(i, v.val, false, () => {
            if (selectNum.val) {
              v.val = selectNum.val ?? -1;
              selectNum.val = null;
            } else if (v.val !== -2) {
              v.val = -2;
            } else {
              v.val = selectNum.val ?? -1;
              selectNum.val = null;
            }
          });
        })
      ),
      section(
        vanX.list(div({ class: "aspects-grid" }), aspectNum, (v, _, i) =>
          div(
            { class: "aspect-row" },
            div({
              class: `aspect-${ASPECT_NUM[i]}`,
              ariaLabel: `Aspect ${ASPECT_NUM[i]}`,
            }),
            input({
              class: "input-num",
              type: "number",
              value: v,
              min: 0,
              step: 1,
              onchange: (e) => {
                const val = parseInt((e.target as HTMLInputElement).value, 10);
                if (!isNaN(val)) {
                  v.val = val;
                }
              },
            })
          )
        ),
        () =>
          button(
            {
              onclick: async () => {
                if (isResolving.val) return;

                isResolving.val = true;
                progressData.val = { step: 0, all: 0, now: 0 };
                startMemoryMonitoring(true); // 処理中は頻繁に監視

                for (let i = 0; i < frames.length; i++) {
                  const x = i % HEX_WIDTH;
                  const y = Math.floor(i / HEX_WIDTH);
                  const a = frames[i];

                  if (a !== -2) {
                    if (sizeMinMax.min.x === -1 || x < sizeMinMax.min.x) {
                      sizeMinMax.min.x = x;
                    }
                    if (sizeMinMax.min.y === -1 || y < sizeMinMax.min.y) {
                      sizeMinMax.min.y = y;
                    }
                    if (sizeMinMax.max.x === -1 || x > sizeMinMax.max.x) {
                      sizeMinMax.max.x = x;
                    }
                    if (sizeMinMax.max.y === -1 || y > sizeMinMax.max.y) {
                      sizeMinMax.max.y = y;
                    }
                  }
                }

                console.log("Size MinMax:", sizeMinMax);

                try {
                  answers.val = await hexResolver(
                    aspectNum.map((v) => v),
                    frames.map((v) => v),
                    (step, all, now) => {
                      progressData.val = { step, all, now };
                      updateMemoryUsage(); // プログレス更新時にもメモリを更新
                    }
                  );
                } catch (error) {
                  console.error("Resolver error:", error);
                } finally {
                  isResolving.val = false;
                  startMemoryMonitoring(false); // 処理完了後は通常の監視間隔に戻す
                }
              },
              disabled: () => isDisabled.val || isResolving.val,
            },
            () => (isResolving.val ? "処理中..." : "resolve")
          ),
        button(
          {
            onclick: () => {
              aspectNum.forEach((v, i) => {
                aspectNum[i] += 10;
              });
            },
            disabled: () => isResolving.val,
          },
          "all 10 up"
        ),
        button(
          {
            onclick: () => {
              answers.val = [];
            },
            disabled: () => isResolving.val,
          },
          "reset"
        ),
        () =>
          div(
            { class: "progress-section" },
            isResolving.val || progressData.val.all > 0
              ? div(
                  p(
                    `Step: ${progressData.val.step} | Progress: ${progressData.val.now} / ${progressData.val.all}`
                  ),
                  progressData.val.all > 0
                    ? div(
                        {
                          class: "progress-bar-container",
                        },
                        div({
                          class: "progress-bar",
                          style: `width: ${Math.round(
                            (progressData.val.now / progressData.val.all) * 100
                          )}%;`,
                        }),
                        div(
                          {
                            class: "progress-text",
                          },
                          `${Math.round(
                            (progressData.val.now / progressData.val.all) * 100
                          )}%`
                        )
                      )
                    : null
                )
              : p("Ready")
          ),
        () =>
          div(
            { class: "progress-section memory-info" },
            p("Memory Usage"),
            div(
              p(
                `Heap: ${formatBytes(memoryData.val.usedHeap)} / ${formatBytes(
                  memoryData.val.totalHeap
                )}`
              ),
              memoryData.val.totalHeap > 0
                ? div(
                    {
                      class: "progress-bar-container",
                    },
                    div({
                      class: "progress-bar",
                      style: `width: ${Math.round(
                        (memoryData.val.usedHeap / memoryData.val.totalHeap) *
                          100
                      )}%; background-color: ${
                        memoryData.val.usedHeap / memoryData.val.totalHeap > 0.8
                          ? "#f44336"
                          : memoryData.val.usedHeap / memoryData.val.totalHeap >
                            0.6
                          ? "#ff9800"
                          : "#2196f3"
                      };`,
                    }),
                    div(
                      {
                        class: "progress-text",
                      },
                      `${Math.round(
                        (memoryData.val.usedHeap / memoryData.val.totalHeap) *
                          100
                      )}%`
                    )
                  )
                : div(
                    { style: "color: #999; font-style: italic;" },
                    "Memory information not available"
                  ),
              p(
                { style: "font-size: 12px; color: #666; margin-top: 5px;" },
                `Total JS Heap: ${formatBytes(memoryData.val.total)}`
              )
            )
          ),
        () =>
          div(
            { class: "answer-wrapper" },
            answers.val.map((v) =>
              div(
                {
                  class: "hex-display",
                  "data-mini": true,
                  style: Object.entries({
                    width: `${
                      (sizeMinMax.max.x - sizeMinMax.min.x + 0.5) * (72 / 2) +
                      28
                    }px`,
                    height: `${
                      (sizeMinMax.max.y - sizeMinMax.min.y + 0.5) * 50
                    }px`,
                  })
                    .map((k) => `${k[0]}:${k[1]};`)
                    .join(""),
                },
                v.frame.map((vv, l) =>
                  ViewHexCell(l, vv, true, undefined, sizeMinMax)
                )
              )
            )
          )
      )
    )
  );
};

van.add(document.body, Main());
