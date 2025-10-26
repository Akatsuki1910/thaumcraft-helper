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
  fn?: () => void
) => {
  const size = isMini ? 1 / 2 : 1;

  return div(
    {
      class: `hex-item`,
      "data-num": num ?? -2,
      style: Object.entries({
        top: `${
          Math.floor(i / HEX_WIDTH) * 82 * size +
          ((i % HEX_WIDTH) % 2) * 40 * size
        }px`,
        left: `${(i % HEX_WIDTH) * 72 * size}px`,
      })
        .map((k) => `${k[0]}:${k[1]};`)
        .join(""),
    },
    Hex(() => {
      fn && fn();
    })
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
  let answers = van.state<ReturnType<typeof hexResolver>>([]);

  let progressData = van.state<{ step: number; all: number; now: number }>({
    step: 0,
    all: 0,
    now: 0,
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
              onclick: () => {
                answers.val = hexResolver(
                  aspectNum.map((v) => v),
                  frames.map((v) => v),
                  (step, all, now) => {
                    // console.log("Progress:", { step, all, now });
                    progressData.val = { step, all, now };
                  }
                );
              },
              disabled: isDisabled.val,
            },
            "resolve"
          ),

        button(
          {
            onclick: () => {
              aspectNum.forEach((v, i) => {
                aspectNum[i] += 10;
              });
            },
          },
          "all 10 up"
        ),
        () =>
          p(
            `Progress: ${progressData.val.now} / ${progressData.val.all} (Step: ${progressData.val.step})`
          ),
        () =>
          div(
            { class: "answer-wrapper" },
            answers.val.map((v) =>
              div(
                { class: "hex-display", "data-mini": true },
                v.frame.map((vv, l) => ViewHexCell(l, vv, true))
              )
            )
          )
      )
    )
  );
};

van.add(document.body, Main());
