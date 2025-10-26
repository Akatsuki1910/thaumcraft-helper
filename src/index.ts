import van from "vanjs-core";
import * as vanX from "vanjs-ext";
import { Hex } from "./hex";
import { ASPECT_NUM } from "./ts/aspectUti";
const { main, p, div, input, section, button } = van.tags;

const Main = () => {
  const selectNum = van.state<number | null>(null);
  const aspectNum = vanX.reactive<number[]>(
    [...Array(ASPECT_NUM.length)].map(() => 0)
  );
  const frames = vanX.reactive<number[]>(
    [...Array(11)].map(() => Array(10).fill(-2)).flat()
  );

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

    console.log({ num, frameCount });
    return !(
      num !== 0 &&
      frameCount.empty !== 0 &&
      num > frameCount.empty &&
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
          return div(
            {
              class: `hex-item`,
              "data-num": v ?? -2,
              style: Object.entries({
                top: `${Math.floor(i / 11) * 82 + ((i % 11) % 2) * 40}px`,
                left: `${(i % 11) * 72}px`,
              })
                .map((k) => `${k[0]}:${k[1]};`)
                .join(""),
            },
            Hex(() => {
              if (selectNum.val) {
                v.val = selectNum.val ?? -1;
                selectNum.val = null;
              } else if (v.val !== -2) {
                v.val = -2;
              } else {
                v.val = selectNum.val ?? -1;
                selectNum.val = null;
              }
            })
          );
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
              class: "reset-button button",
              onclick: () => {},
              disabled: isDisabled.val,
            },
            "resolve"
          )
      )
    )
  );
};

van.add(document.body, Main());
