import "../public/wasm/wasm_exec.js";

declare global {
  interface Window {
    Go?: any;
    goHexResolver?: (
      aspectNum: number[],
      frames: number[],
      progress?: (step: number, all: number, now: number) => void
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
    if (this.isInitialized) return;

    const go = new (window as any).Go();
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
  }

  async hexResolver(
    aspectNum: number[],
    frames: number[],
    progress?: (step: number, all: number, now: number) => void
  ): Promise<WasmAnswer[]> {
    await this.initialize();
    if (!window.goHexResolver) throw new Error("goHexResolver not available");

    console.log("Calling WASM with:", {
      aspectNum,
      frames: frames.slice(0, 10),
      framesLength: frames.length,
    });
    const res = await window.goHexResolver(aspectNum, frames, progress);

    // 結果の検証
    if (!Array.isArray(res)) {
      console.error("Expected array but got:", typeof res, res);
      return [];
    }

    return res;
  }
}

export const goWasmResolver = new GoWasmResolver();
