import van from "vanjs-core";
import { Hex } from "./hex";
const { main, p, div, input, section, button } = van.tags;
import * as vanX from "vanjs-ext";

const Main = () => {
  const selectNum = van.state<number | null>(null);
  const frames = vanX.reactive<number[]>(
    [...Array(11)].map(() => Array(10).fill(-2)).flat()
  );

  return main(
    div(
      { class: "container" },
      section(
        { class: "hex-wrapper" },
        div(
          { class: "hex-aspect-selector" },
          [...Array(56)].map((_, i) =>
            div({ class: "aspect-row" }, () =>
              button({
                class: `aspect-${i + 1} button ${
                  selectNum.val === i ? "selected" : ""
                }`,
                ariaLabel: `Aspect ${i + 1}`,
                onclick: () => (selectNum.val = i),
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
              if (v.val !== -2) {
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
        div(
          { class: "aspects-grid" },
          [...Array(56)].map((_, i) =>
            div(
              { class: "aspect-row" },
              div({
                class: `aspect-${i + 1}`,
                ariaLabel: `Aspect ${i + 1}`,
              }),
              input({
                class: "input-num",
                type: "number",
                value: 0,
              })
            )
          )
        )
      )
    )
  );
};

van.add(document.body, Main());
