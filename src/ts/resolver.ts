import { ASPECT_NUM, LINKS_MAP } from "./aspectUti";
import { HEX_HEIGHT, HEX_WIDTH } from "./hexUtil";

const startGoalInit = (frames: number[]) => {
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
  return { start, goal };
};

const hexCheck = async (
  sx: number,
  sy: number,
  fn: (x: number, y: number) => void | Promise<void>
) => {
  if (sy > 0) {
    const x = sx;
    const y = sy - 1;
    await fn(x, y);
  }

  if (sy < HEX_HEIGHT - 1) {
    const x = sx;
    const y = sy + 1;
    await fn(x, y);
  }

  if (sx < HEX_WIDTH - 1 && sy - ((sx + 1) % 2) >= 0) {
    const x = sx + 1;
    const y = sy - 1;
    await fn(x, y);
  }

  if (sx < HEX_WIDTH - 1) {
    const x = sx + 1;
    const y = sy;
    await fn(x, y);
  }

  if (sx > 0 && sy - ((sx - 1) % 2) >= 0) {
    const x = sx - 1;
    const y = sy - 1;
    await fn(x, y);
  }

  if (sx > 0) {
    const x = sx - 1;
    const y = sy;
    await fn(x, y);
  }
};

export const hexResolver = async (
  aspectNum: number[],
  frames: number[],
  progress: (step: number, all: number, now: number) => void
) => {
  const { start, goal } = startGoalInit(frames);

  const answer: {
    aspect: string;
    frame: number[];
    steps: number;
  }[] = [];

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

  let count = 0;
  const resolveAnswer = async (sx: number, sy: number, step: number) => {
    if (goal.every((g) => goalCheck([...frames], g[0], g[1]))) {
      answer.push({
        aspect: aspectNum.join(","),
        frame: [...frames],
        steps: step,
      });
      return;
    }

    const sd = frames[sx + sy * HEX_WIDTH];
    await hexCheck(sx, sy, async (x, y) => {
      count++;
      progress(step, 0, count);
      if (count % 1000 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      await commonResolveAnswer(x, y, sd, step + 1);
    });
  };

  const commonResolveAnswer = async (
    x: number,
    y: number,
    sd: number,
    step: number
  ) => {
    const d = frames[x + y * HEX_WIDTH];
    if (d === -1) {
      for (let i = 0; i < aspectNum.length; i++) {
        if (aspectNum[i] > 0) {
          if (LINKS_MAP.get(ASPECT_NUM[i])?.has(sd)) {
            if (aspectNum[i] === 0) continue;

            aspectNum[i]--;
            frames[x + y * HEX_WIDTH] = ASPECT_NUM[i];
            await resolveAnswer(x, y, step + 1);
            frames[x + y * HEX_WIDTH] = d;
            aspectNum[i]++;
          }
        }
      }
    }
  };

  await resolveAnswer(start[0], start[1], 0);

  const trueAnswers = [
    ...answer
      .filter((v) => v.steps === Math.min(...answer.map((vv) => vv.steps)))
      .reduce((acc, v) => {
        const key = v.aspect;
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
