import { ASPECT_NUM, LINKS_MAP } from "./aspectUti";
import { HEX_HEIGHT, HEX_WIDTH } from "./hexUtil";

export const hexResolver = async (
  aspectNum: number[],
  frames: number[],
  progress: (step: number, all: number, now: number) => void
) => {
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
    aspect: number[];
    frame: number[];
    steps: number;
  }[] = [];

  const hexCheck = (
    sx: number,
    sy: number,
    fn: (x: number, y: number) => void
  ) => {
    if (sy > 0) {
      const x = sx;
      const y = sy - 1;
      fn(x, y);
    }

    if (sy < HEX_HEIGHT - 1) {
      const x = sx;
      const y = sy + 1;
      fn(x, y);
    }

    if (sx < HEX_WIDTH - 1 && sy - ((sx + 1) % 2) >= 0) {
      const x = sx + 1;
      const y = sy - 1;
      fn(x, y);
    }

    if (sx < HEX_WIDTH - 1) {
      const x = sx + 1;
      const y = sy;
      fn(x, y);
    }

    if (sx > 0 && sy - ((sx - 1) % 2) >= 0) {
      const x = sx - 1;
      const y = sy - 1;
      fn(x, y);
    }

    if (sx > 0) {
      const x = sx - 1;
      const y = sy;
      fn(x, y);
    }
  };

  const goalCheck = (f: number[], sx: number, sy: number) => {
    const sd = f[sx + sy * HEX_WIDTH];
    if (sx === start[0] && sy === start[1]) {
      return true;
    }

    let flg = false;
    hexCheck(sx, sy, (x, y) => {
      if (flg) return;

      const d = f[x + y * HEX_WIDTH];
      if (d > 0 && LINKS_MAP.get(sd)?.has(d)) {
        f[sx + sy * HEX_WIDTH] = -2;
        flg = goalCheck(f, x, y);
      }
    });
    return flg;
  };

  const loopResolveAnswer = (
    an: number[],
    f: number[],
    sx: number,
    sy: number,
    step: number
  ) => {
    const sd = f[sx + sy * HEX_WIDTH];

    if (goal.every((g) => goalCheck([...f], g[0], g[1]))) {
      answer.push({ aspect: an, frame: f, steps: step });
      return;
    }

    if (answer.length > 0) return;

    const nextData: { cpAn: number[]; cpF: number[]; x: number; y: number }[] =
      [];
    hexCheck(sx, sy, (x, y) => {
      const d = commonResolveAnswer(x, y, sd, an, f);
      nextData.push(...d);
    });

    return nextData;
  };

  const resolveAnswer = async (
    an: number[],
    f: number[],
    sx: number,
    sy: number
  ) => {
    let step = 0;
    let nextData = loopResolveAnswer(an, f, sx, sy, step) ?? [];
    while (true) {
      step++;
      if (nextData.length === 0) break;
      const currentData = nextData;
      nextData = [];

      for (let l = 0; l < currentData.length; l++) {
        const v = currentData[l];
        progress(step, currentData.length, l + 1);

        if (l % 1000 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        const res = loopResolveAnswer(v.cpAn, v.cpF, v.x, v.y, step);
        if (res) {
          nextData.push(...res);
        }
      }
    }
  };

  const commonResolveAnswer = (
    x: number,
    y: number,
    sd: number,
    an: Parameters<typeof resolveAnswer>[0],
    f: Parameters<typeof resolveAnswer>[1]
  ) => {
    const nextData: { cpAn: typeof an; cpF: typeof f; x: number; y: number }[] =
      [];

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
            nextData.push({ cpAn, cpF, x, y });
          }
        }
      }
    }

    return nextData;
  };

  await resolveAnswer(aspectNum, frames, start[0], start[1]);

  const trueAnswers = [
    ...answer
      .filter((v) => v.steps === Math.min(...answer.map((vv) => vv.steps)))
      .reduce((acc, v) => {
        const key = v.aspect.join(",");
        if (!acc.has(key)) {
          acc.set(key, v);
        }

        return acc;
      }, new Map<string, (typeof answer)[number]>())
      .values(),
  ].map((v) => ({
    frame: v.frame,
    steps: v.steps,
  }));

  return trueAnswers;
};
