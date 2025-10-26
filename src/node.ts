import van from "vanjs-core";
import { DataSet } from "vis-data";
import { Network } from "vis-network";
import { ASPECT_NUM, EDGES } from "./ts/aspectUti";

const { main, div } = van.tags;

const nodes = new DataSet(
  ASPECT_NUM.map((v, i) => ({
    id: v,
    shape: "circularImage",
    image: new URL(`/aspect/aspect_${v}.png`, import.meta.url).pathname,
  }))
);

const edges = new DataSet(
  EDGES.map(([from, to1, to2], i) => [
    { id: i * 2 + 1, from, to: to1 },
    { id: i * 2 + 2, from, to: to2 },
  ]).flat()
);

const data = {
  nodes: nodes,
  edges: edges,
};

const Main = () => {
  const init = () => {
    const container = document.getElementById("node");
    if (!container) return;

    const options = {};
    const network = new Network(container, data, options);
  };

  const initFlg = van.state(false);
  van.derive(() => {
    initFlg.val && init();
  });
  initFlg.val = true;

  return main(div({ id: "node", class: "node-container" }));
};

van.add(document.body, Main());
