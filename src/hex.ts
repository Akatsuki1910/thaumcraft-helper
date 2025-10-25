import van from "vanjs-core";
const { div, button } = van.tags;
const { svg, polygon } = van.tags("http://www.w3.org/2000/svg");

export const Hex = (fn: () => void) => {
  return div(
    { class: "hex" },
    svg(
      { viewBox: "0 0 100 100" },
      polygon({
        points: [...Array(6)]
          .map((_, i) => {
            const angle = (i / 6) * 2 * Math.PI;
            const x = 50 + 45 * Math.cos(angle);
            const y = 50 + 45 * Math.sin(angle);
            return `${x},${y}`;
          })
          .join(" "),
        stroke: "black",
        fill: "white",
        "stroke-width": "1",
      })
    ),
    button({
      class: "hex-button",
      onclick: fn,
    })
  );
};
