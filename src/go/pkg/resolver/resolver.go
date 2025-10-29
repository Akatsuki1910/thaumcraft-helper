package resolver

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"
)

// ProgressFunc はプログレス報告用の関数型
type ProgressFunc func(step, all, now int)

// startGoalInit はフレーム配列からstart位置とgoal位置を初期化する
func startGoalInit(frames []int) StartGoal {
	start := [2]int{-1, -1}
	var goal [][2]int

	for i, v := range frames {
		if v > 0 {
			x := i % HexWidth
			y := i / HexWidth
			if start[0] == -1 && start[1] == -1 {
				start = [2]int{x, y}
			} else {
				goal = append(goal, [2]int{x, y})
			}
		}
	}

	return StartGoal{
		Start: start,
		Goal:  goal,
	}
}

// hexCheck は六角形の隣接位置をチェックする
func hexCheck(sx, sy int, fn func(x, y int)) {
	// 上
	if sy > 0 {
		fn(sx, sy-1)
	}

	// 下
	if sy < HexHeight-1 {
		fn(sx, sy+1)
	}

	// 右上
	if sx < HexWidth-1 {
		y := sy - ((sx + 1) % 2)
		if y >= 0 {
			fn(sx+1, y)
		}
	}

	// 右
	if sx < HexWidth-1 {
		fn(sx+1, sy)
	}

	// 左上
	if sx > 0 {
		y := sy - ((sx - 1) % 2)
		if y >= 0 {
			fn(sx-1, y)
		}
	}

	// 左
	if sx > 0 {
		fn(sx-1, sy)
	}
}

// goalCheck はゴールに到達可能かチェックする
func goalCheck(f []int, sx, sy int, start [2]int) bool {
	sd := f[sx+sy*HexWidth]
	if sx == start[0] && sy == start[1] {
		return true
	}

	result := false
	hexCheck(sx, sy, func(x, y int) {
		if result {
			return
		}

		d := f[x+y*HexWidth]
		if d > 0 && LinksMap[sd] != nil && LinksMap[sd][d] {
			f[sx+sy*HexWidth] = -2
			result = goalCheck(f, x, y, start)
		}
	})

	return result
}

// copySlice はスライスのコピーを作成する
func copySlice(src []int) []int {
	dst := make([]int, len(src))
	copy(dst, src)
	return dst
}

// allGoalsReached は全てのゴールに到達可能かチェックする
func allGoalsReached(frames []int, goals [][2]int, start [2]int) bool {
	for _, goal := range goals {
		framesCopy := copySlice(frames)
		if !goalCheck(framesCopy, goal[0], goal[1], start) {
			return false
		}
	}
	return true
}

// HexResolver はメインのリゾルバー関数
func HexResolver(ctx context.Context, aspectNum []int, frames []int, progress ProgressFunc) ([]FilteredAnswers, error) {
	sg := startGoalInit(frames)
	start := sg.Start
	goal := sg.Goal

	var answers []Answer
	count := 0

	// commonResolveAnswer は共通の解答処理
	var commonResolveAnswer func(x, y, sd, step int)

	// resolveAnswer は再帰的に解を探索する
	var resolveAnswer func(sx, sy, step int)
	resolveAnswer = func(sx, sy, step int) {
		// コンテキストのキャンセルチェック
		select {
		case <-ctx.Done():
			return
		default:
		}

		if allGoalsReached(frames, goal, start) {
			// Convert []int to []string for joining
			aspectStrs := make([]string, len(aspectNum))
			for i, num := range aspectNum {
				aspectStrs[i] = fmt.Sprintf("%d", num)
			}

			answers = append(answers, Answer{
				AspectKey: strings.Join(aspectStrs, ","),
				Frame:     copySlice(frames),
				Steps:     step,
			})
			return
		}

		sd := frames[sx+sy*HexWidth]
		hexCheck(sx, sy, func(x, y int) {
			count++
			if progress != nil {
				progress(step, 0, count)
			}

			// 1000回ごとにgoroutineの協調的スケジューリング
			if count%1000 == 0 {
				time.Sleep(0)
			}

			commonResolveAnswer(x, y, sd, step+1)
		})
	}

	commonResolveAnswer = func(x, y, sd, step int) {
		d := frames[x+y*HexWidth]
		if d == -1 {
			for i := 0; i < len(aspectNum); i++ {
				if aspectNum[i] > 0 {
					if LinksMap[AspectNum[i]] != nil && LinksMap[AspectNum[i]][sd] {
						if aspectNum[i] == 0 {
							continue
						}

						aspectNum[i]--
						frames[x+y*HexWidth] = AspectNum[i]
						resolveAnswer(x, y, step)
						frames[x+y*HexWidth] = d
						aspectNum[i]++
					}
				}
			}
		}
	}

	resolveAnswer(start[0], start[1], 0)

	// 最小ステップ数を見つける
	if len(answers) == 0 {
		var ans = FilteredAnswers{
			Frame: answers[0].Frame,
			Steps: answers[0].Steps,
		}
		return []FilteredAnswers{ans}, nil
	}

	fmt.Printf("Go: Total answers found: %d\n", len(answers))

	minSteps := math.MaxInt32
	for _, answer := range answers {
		if answer.Steps < minSteps {
			minSteps = answer.Steps
		}
	}

	// 最小ステップ数のものだけをフィルタリング
	var filteredAnswers []FilteredAnswers
	aspectMap := make(map[string]Answer)

	for _, answer := range answers {
		if answer.Steps == minSteps {

			if _, exists := aspectMap[answer.AspectKey]; !exists {
				aspectMap[answer.AspectKey] = answer
			}
		}
	}

	for _, answer := range aspectMap {
		filteredAnswers = append(filteredAnswers, FilteredAnswers{
			Frame: answer.Frame,
			Steps: answer.Steps,
		})
	}

	return filteredAnswers, nil
}
