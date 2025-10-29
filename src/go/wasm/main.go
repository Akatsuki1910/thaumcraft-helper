package main

import (
	"context"
	"fmt"
	"syscall/js"
	"time"

	"thaumcraft-helper/pkg/resolver"
)

// JSの関数をGoのProgressFuncに変換するためのヘルパー
func convertProgressFunc(jsFunc js.Value) resolver.ProgressFunc {
	if jsFunc.IsNull() || jsFunc.IsUndefined() {
		return nil
	}
	return func(step, all, now int) {
		jsFunc.Invoke(step, all, now)
	}
}

// hexResolverWrapper はJavaScriptから呼び出し可能なラッパー関数
func hexResolverWrapper() js.Func {
	return js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		// 引数の検証
		if len(args) < 2 {
			return map[string]interface{}{
				"error": "引数が不足しています。aspectNum, frames, progress関数が必要です。",
			}
		}

		// aspectNumの変換
		aspectNumJS := args[0]
		aspectNum := make([]int, aspectNumJS.Length())
		for i := 0; i < aspectNumJS.Length(); i++ {
			aspectNum[i] = aspectNumJS.Index(i).Int()
		}

		// framesの変換
		framesJS := args[1]
		frames := make([]int, framesJS.Length())
		for i := 0; i < framesJS.Length(); i++ {
			frames[i] = framesJS.Index(i).Int()
		}

		// progress関数の変換（オプション）
		var progress resolver.ProgressFunc
		if len(args) > 2 && !args[2].IsNull() && !args[2].IsUndefined() {
			progress = convertProgressFunc(args[2])
		}

		// Promiseを返すために、Goでgoroutineを使って非同期処理を行う
		handler := js.FuncOf(func(this js.Value, promiseArgs []js.Value) interface{} {
			resolve := promiseArgs[0]
			reject := promiseArgs[1]

			go func() {
				defer func() {
					if r := recover(); r != nil {
						fmt.Printf("Recovered in hexResolverWrapper: %v\n", r)
						reject.Invoke(js.ValueOf(map[string]interface{}{
							"error": fmt.Sprintf("Panic: %v", r),
						}))
					}
				}()

				fmt.Printf("Go: Starting hexResolver with aspectNum=%v, frames length=%d\n", aspectNum, len(frames))

				// タイムアウト付きコンテキスト（30秒）
				ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
				defer cancel()

				// hexResolverを実行
				answers, err := resolver.HexResolver(ctx, aspectNum, frames, progress)
				if err != nil {
					fmt.Printf("Go: hexResolver error: %v\n", err)
					reject.Invoke(js.ValueOf(map[string]interface{}{
						"error": err.Error(),
					}))
					return
				}

				fmt.Printf("Go: hexResolver completed with %d answers\n", len(answers))

				// 空の結果の場合の処理
				if len(answers) == 0 {
					fmt.Println("Go: No answers found, returning empty array")
					resolve.Invoke(js.ValueOf([]interface{}{}))
					return
				}

				// 結果をJavaScript形式に変換
				result := make([]interface{}, len(answers))
				for i, answer := range answers {
					// nilチェック
					if answer.Frame == nil {
						fmt.Printf("Go: Warning - answer %d has nil frame\n", i)
						continue
					}

					// フレーム配列を安全に変換
					frameArray := make([]interface{}, len(answer.Frame))
					for j, frameValue := range answer.Frame {
						frameArray[j] = frameValue
					}

					result[i] = map[string]interface{}{
						"frame": frameArray,
						"steps": answer.Steps,
					}
				}

				fmt.Printf("Go: Converting %d results to JS format\n", len(result))

				// 結果を安全にJavaScriptに変換
				defer func() {
					if r := recover(); r != nil {
						fmt.Printf("Panic during JS conversion: %v\n", r)
						reject.Invoke(js.ValueOf(map[string]interface{}{
							"error": fmt.Sprintf("JS conversion failed: %v", r),
						}))
					}
				}()

				// 結果を返す
				resolve.Invoke(js.ValueOf(result))
			}()

			return nil
		})

		// Promise を作成して返す
		promise := js.Global().Get("Promise").New(handler)
		return promise
	})
}

func main() {
	c := make(chan struct{}, 0)

	// グローバルにhexResolver関数を登録
	js.Global().Set("goHexResolver", hexResolverWrapper())

	// プログラムを終了させないために待機
	<-c
}
