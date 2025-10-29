# Hex Resolver Go Implementation

TypeScriptの`hexResolver`関数をGoで書き直した実装です。

## ファイル構成

- `types.go`: 定数、構造体、データ型の定義
- `resolver.go`: メインのリゾルバー実装
- `main.go`: サンプル実行用のメイン関数
- `go.mod`: Goモジュール定義

## 主な機能

### HexResolver関数

元のTypeScript版と同じ機能を提供：

```go
func HexResolver(ctx context.Context, aspectNum []int, frames []int, progress ProgressFunc) ([]Answer, error)
```

- `ctx`: コンテキスト（キャンセルやタイムアウト制御）
- `aspectNum`: 利用可能なアスペクト数の配列
- `frames`: 六角形グリッドの状態配列
- `progress`: プログレス報告用コールバック関数
- 戻り値: 解答の配列とエラー

### 改善点

1. **コンテキスト対応**: Goの慣習に従いcontextパッケージを使用
2. **エラーハンドリング**: Goの標準的なエラー処理
3. **型安全性**: 強い型付けによる安全性向上
4. **並行性**: goroutineフレンドリーな実装

## 使用方法

```bash
# サンプル実行
cd src/go
go run main.go
```

## データ構造

### Answer

```go
type Answer struct {
    Frame []int `json:"frame"`  // 解答時のフレーム状態
    Steps int   `json:"steps"`  // 解答までのステップ数
}
```

### StartGoal

```go
type StartGoal struct {
    Start [2]int    // スタート位置 [x, y]
    Goal  [][2]int  // ゴール位置の配列
}
```

## アルゴリズム

1. フレーム配列からスタート位置とゴール位置を特定
2. 再帰的に隣接する六角形マスを探索
3. アスペクトの配置可能性をチェック
4. 全てのゴールに到達可能な解を探索
5. 最小ステップ数の解をフィルタリングして返却
