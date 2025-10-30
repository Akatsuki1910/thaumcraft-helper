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

	return func(count, answersFound int) {
		if jsFunc.IsNull() || jsFunc.IsUndefined() {
			return
		}

		done := make(chan bool, 1)
		hasCompleted := false

		// panic回復
		defer func() {
			if r := recover(); r != nil {
				if !hasCompleted {
					select {
					case done <- true:
					default:
					}
				}
			}
		}()

		// JavaScript関数を呼び出し
		result := jsFunc.Invoke(count, answersFound)

		// 結果がPromiseかどうかチェック
		if !result.IsNull() && !result.IsUndefined() {
			// Promiseのthenメソッドが存在するかチェック
			if then := result.Get("then"); !then.IsUndefined() && !then.IsNull() {
				// Promiseの場合、完了を待機
				successCallback := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
					if !hasCompleted {
						hasCompleted = true
						select {
						case done <- true:
						default:
						}
					}
					return nil
				})

				errorCallback := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
					if !hasCompleted {
						hasCompleted = true
						select {
						case done <- true:
						default:
						}
					}
					return nil
				})

				// 正しくPromiseのthen/catchを設定
				result.Call("then", successCallback, errorCallback)

				// 最大500msまで待機（UIの応答性を保つため）
				select {
				case <-done:
					time.Sleep(0)
					return
				case <-time.After(500 * time.Millisecond):
					if !hasCompleted {
						hasCompleted = true
					}
					time.Sleep(0)
					return
				}
			} else {
				// Promiseでない場合はそのまま返す
				return
			}
		} else {
			// 結果がnullまたはundefinedの場合
			return
		}
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

		var emptyFrameCount = 0
		for i := 0; i < framesJS.Length(); i++ {
			frames[i] = framesJS.Index(i).Int()
			if frames[i] == -1 {
				emptyFrameCount++
			}
		}

		// 取り得る最大の探索数を計算
		// emptyFrameCount個の空きスロットに対する、アスペクト数の順列の概算
		var allCount = 0
		if emptyFrameCount > 0 {
			// アスペクト数の合計を計算
			totalAspects := 0
			aspectTypes := 0
			for i := 0; i < aspectNumJS.Length(); i++ {
				if aspectNum[i] > 0 {
					totalAspects += aspectNum[i]
					aspectTypes++
				}
			}

			// 最大探索数の概算計算
			// 実際の探索は隣接チェックなので、これは上限の目安
			if totalAspects > 0 && emptyFrameCount > 0 {
				// 基本的な組み合わせ数の概算
				// 各空きスロットに配置可能なアスペクト数の積
				maxCombinations := 1
				remainingAspects := totalAspects

				for slot := 0; slot < emptyFrameCount && remainingAspects > 0; slot++ {
					// 各スロットで選択可能なアスペクト数（最大でアスペクト種類数）
					choices := aspectTypes
					if choices > remainingAspects {
						choices = remainingAspects
					}
					if choices > 0 {
						maxCombinations *= choices
						remainingAspects--
					}

					// // 計算量が膨大になることを防ぐ
					// if maxCombinations > 10000000 { // 1000万を上限
					// 	maxCombinations = 10000000
					// 	break
					// }
				}

				// 隣接チェックによる展開を考慮（約6倍）
				allCount = maxCombinations * 6

				// デバッグ情報
				fmt.Printf("Max search estimation: empty=%d, aspects=%d, types=%d, estimate=%d\n",
					emptyFrameCount, totalAspects, aspectTypes, allCount)
			}
		}

		// progress関数の変換（オプション）
		var progress resolver.ProgressFunc
		if len(args) > 2 && !args[2].IsNull() && !args[2].IsUndefined() {
			originalProgress := convertProgressFunc(args[2])
			// 最初の呼び出しで最大探索数を通知
			firstCall := true
			// allCountを含めた拡張progress関数を作成
			progress = func(count, answersFound int) {
				if originalProgress != nil {
					// 最初の呼び出し時に最大探索数も一緒に渡す
					if firstCall && allCount > 0 {
						// JavaScript側のprogress関数に最大探索数を渡すために、
						// カスタム関数を呼び出す
						if jsFunc := args[2]; !jsFunc.IsNull() && !jsFunc.IsUndefined() {
							// maxCountプロパティを設定
							jsFunc.Set("maxCount", allCount)
						}
						fmt.Printf("Starting resolver with estimated max search count: %d\n", allCount)
						firstCall = false
					}
					originalProgress(count, answersFound)
				}
			}
		}

		// Promiseを返すために、Goでgoroutineを使って非同期処理を行う
		handler := js.FuncOf(func(this js.Value, promiseArgs []js.Value) interface{} {
			resolve := promiseArgs[0]
			reject := promiseArgs[1]

			go func() {
				defer func() {
					if r := recover(); r != nil {
						reject.Invoke(js.ValueOf(map[string]interface{}{
							"error": fmt.Sprintf("Panic: %v", r),
						}))
					}
				}()

				// タイムアウト付きコンテキスト（600秒）
				ctx, cancel := context.WithTimeout(context.Background(), 600*time.Second)
				defer cancel()

				// hexResolverを実行
				answers, err := resolver.HexResolver(ctx, aspectNum, frames, progress)
				if err != nil {
					reject.Invoke(js.ValueOf(map[string]interface{}{
						"error": err.Error(),
					}))
					return
				}

				// 空の結果の場合の処理
				if len(answers) == 0 {
					resolve.Invoke(js.ValueOf([]interface{}{}))
					return
				}

				// 結果をJavaScript形式に変換
				result := make([]interface{}, len(answers))
				for i, answer := range answers {
					// nilチェック
					if answer.Frame == nil {
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

				// 結果を安全にJavaScriptに変換
				defer func() {
					if r := recover(); r != nil {
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
