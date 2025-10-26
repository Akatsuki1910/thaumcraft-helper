import van from "vanjs-core";
import { DataSet } from "vis-data";
import { Network } from "vis-network";
import { EDGES } from "./ts/aspectUti";

const { main, div } = van.tags;

const Main = () => {
  const init = () => {
    const nodes = new DataSet(
      [...Array(55)].map((_, i) => ({
        id: i + 1,
        shape: "circularImage",
        image: `/aspect/aspect_${i + 1}.png`,
      }))
    );

    const edges = new DataSet(
      EDGES.map(([from, to1, to2], i) => [
        { id: i * 2 + 1, from, to: to1 },
        { id: i * 2 + 2, from, to: to2 },
      ]).flat()
    );

    // create a network
    const container = document.getElementById("node");
    if (!container) return;
    const data = {
      nodes: nodes,
      edges: edges,
    };
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
