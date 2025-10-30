import "../public/wasm/wasm_exec.js";

declare global {
  interface Window {
    Go?: any;
    goHexResolver?: (
      aspectNum: number[],
      frames: number[],
      progress: (step: number, all: number, now: number) => Promise<void>
    ) => Promise<{ frame: number[]; steps: number }[]>;
  }
}

export interface WasmAnswer {
  frame: number[];
  steps: number;
}

class GoWasmResolver {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      if (typeof (window as any).Go !== "function") {
        throw new Error(
          "Go constructor not available. wasm_exec.js might not be loaded properly."
        );
      }

      const go = new (window as any).Go();

      const response = await fetch("/wasm/resolver.wasm");

      if (!response.ok) {
        throw new Error(
          `Failed to fetch WASM: ${response.status} ${response.statusText}`
        );
      }

      const module = await WebAssembly.instantiateStreaming(
        fetch("/wasm/resolver.wasm"),
        go.importObject
      );

      go.run(module.instance);

      await new Promise<void>((resolve, reject) => {
        const check = () => {
          if (typeof window.goHexResolver === "function") {
            resolve();
          } else {
            setTimeout(check, 10);
          }
        };
        setTimeout(check, 100);
        setTimeout(
          () => reject(new Error("Timeout waiting for goHexResolver")),
          5000
        );
      });

      this.isInitialized = true;
    } catch (error) {
      throw error;
    }
  }

  async hexResolver(
    aspectNum: number[],
    frames: number[],
    progress?: (
      count: number,
      answersFound: number,
      maxCount?: number
    ) => Promise<void>
  ): Promise<WasmAnswer[]> {
    await this.initialize();
    if (!(globalThis as any).goHexResolver)
      throw new Error("goHexResolver not available");

    // プログレス関数をPromiseベースでラップ
    const wrappedProgress = progress
      ? async (count: number, answersFound: number): Promise<void> => {
          // Go側から設定されるmaxCountプロパティを取得
          const maxCount = (wrappedProgress as any).maxCount;
          // プログレス関数を呼び出してPromiseを返す
          await Promise.resolve(progress(count, answersFound, maxCount));
        }
      : undefined;

    const res = await (globalThis as any).goHexResolver(
      aspectNum,
      frames,
      wrappedProgress
    );

    // 結果の検証
    if (!Array.isArray(res)) {
      return [];
    }

    return res;
  }
}

export const goWasmResolver = new GoWasmResolver();
