import van from "vanjs-core";
import * as vanX from "vanjs-ext";
import { Hex } from "./hex";
import { ASPECT_NUM } from "./ts/aspectUti";
import { HEX_WIDTH, HEX_HEIGHT } from "./ts/hexUtil";
import { hexResolver } from "./ts/resolver";
const { main, p, div, input, section, button } = van.tags;

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
          (((i - (sizeMinMax?.min.x ?? 0)) % HEX_WIDTH) % 2) * 40 * size
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
                    }
                  );
                } catch (error) {
                  console.error("Resolver error:", error);
                } finally {
                  isResolving.val = false;
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
