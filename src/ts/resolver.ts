import { ASPECT_NUM, LINKS_MAP } from "./aspectUti";
import { HEX_HEIGHT, HEX_WIDTH } from "./hexUtil";

export const hexResolver = (aspectNum: number[], frames: number[]) => {
  let start: [number, number] = [-1, -1];
  let goal: [number, number][] = [];
  for (let i = 0; i < frames.length; i++) {
    let v = frames[i];
    if (v > 0) {
      const x = i % HEX_WIDTH;
      const y = Math.floor(i / HEX_WIDTH);
      if (start[0] === -1 && start[1] === -1) {
        start = [x, y];
      } else {
        goal.push([x, y]);
      }
    }
  }

  const answer: {
    frame: number[];
    steps: number;
  }[] = [];

  const hexCheck = (
    s: [number, number],
    fn: (x: number, y: number) => void
  ) => {
    if (s[1] > 0) {
      const x = s[0];
      const y = s[1] - 1;
      fn(x, y);
    }

    if (s[1] < HEX_HEIGHT - 1) {
      const x = s[0];
      const y = s[1] + 1;
      fn(x, y);
    }

    if (s[0] < HEX_WIDTH - 1 && s[1] - ((s[0] + 1) % 2) >= 0) {
      const x = s[0] + 1;
      const y = s[1];
      fn(x, y);
    }

    if (s[0] < HEX_WIDTH - 1 && s[1] - ((s[0] + 1) % 2) < HEX_HEIGHT - 1) {
      const x = s[0] + 1;
      const y = s[1] + 1;
      fn(x, y);
    }

    if (s[0] > 0 && s[1] - (s[0] % 2) >= 0) {
      const x = s[0] - 1;
      const y = s[1] - 1;
      fn(x, y);
    }

    if (s[0] > 0 && s[1] - (s[0] % 2) < HEX_HEIGHT - 1) {
      const x = s[0] - 1;
      const y = s[1];
      fn(x, y);
    }
  };

  const goalCheck = (f: number[], s: [number, number]) => {
    f[s[0] + s[1] * HEX_WIDTH] = -2;
    if (s[0] === start[0] && s[1] === start[1]) {
      return true;
    }

    let flg = false;
    hexCheck(s, (x, y) => {
      if (flg) return;

      const d = f[x + y * HEX_WIDTH];
      if (d > 0) {
        flg = goalCheck(f, [x, y]);
      }
    });
    return flg;
  };

  const resolveAnswer = (
    an: number[],
    f: number[],
    s: [number, number],
    step: number
  ) => {
    const sd = f[s[0] + s[1] * HEX_WIDTH];

    if (goal.every((g) => goalCheck([...f], g))) {
      answer.push({ frame: f, steps: step });
      return;
    }

    hexCheck(s, (x, y) => {
      commonResolveAnswer(x, y, sd, an, f, step);
    });
  };

  const commonResolveAnswer = (
    x: number,
    y: number,
    sd: number,
    an: Parameters<typeof resolveAnswer>[0],
    f: Parameters<typeof resolveAnswer>[1],
    step: Parameters<typeof resolveAnswer>[3]
  ) => {
    const d = f[x + y * HEX_WIDTH];
    if (d === -1) {
      for (let i = 0; i < an.length; i++) {
        if (an[i] > 0) {
          if (LINKS_MAP.get(ASPECT_NUM[i])?.has(sd)) {
            const cpAn = [...an];
            if (cpAn[i] === 0) continue;
            cpAn[i]--;
            const cpF = [...f];
            cpF[x + y * HEX_WIDTH] = ASPECT_NUM[i];
            resolveAnswer(cpAn, cpF, [x, y], step + 1);
          }
        }
      }
    }
  };

  resolveAnswer(aspectNum, frames, start, 0);

  const trueAnswers = answer.filter(
    (v) => v.steps === Math.min(...answer.map((vv) => vv.steps))
  );

  console.log("Answers found:", trueAnswers);

  return trueAnswers;
};
