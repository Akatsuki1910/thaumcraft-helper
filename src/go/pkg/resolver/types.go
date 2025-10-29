package resolver

// 定数定義（公開）
const (
	HexWidth  = 11
	HexHeight = 10
)

// ASPECT_NUM は1-61と73の値を含む配列
var AspectNum = func() []int {
	aspects := make([]int, 62)
	for i := 0; i < 61; i++ {
		aspects[i] = i + 1
	}
	aspects[61] = 73
	return aspects
}()

// EDGES は [from, to1, to2] の形式のエッジ定義
var Edges = [][3]int{
	{12, 15, 29},
	{20, 1, 15},
	{26, 1, 27},
	{31, 27, 29},
	{32, 15, 27},
	{38, 1, 3},
	{42, 1, 29},
	{43, 3, 29},
	{44, 3, 40},
	{47, 27, 40},
	{6, 26, 44},
	{11, 42, 44},
	{13, 40, 44},
	{17, 40, 26},
	{18, 3, 44},
	{23, 40, 47},
	{25, 29, 44},
	{33, 32, 42},
	{59, 32, 20},
	{34, 27, 44},
	{61, 27, 42},
	{39, 29, 20},
	{45, 29, 26},
	{48, 1, 26},
	{2, 42, 39},
	{4, 13, 1},
	{5, 1, 33},
	{8, 6, 45},
	{9, 25, 26},
	{50, 11, 42},
	{51, 15, 33},
	{57, 17, 23},
	{36, 44, 45},
	{55, 42, 48},
	{46, 29, 33},
	{7, 15, 36},
	{49, 36, 25},
	{54, 8, 11},
	{35, 1, 36},
	{14, 6, 7},
	{52, 11, 35},
	{60, 29, 7},
	{16, 14, 27},
	{19, 11, 14},
	{22, 13, 14},
	{30, 40, 14},
	{10, 16, 14},
	{21, 16, 26},
	{24, 16, 22},
	{58, 19, 30},
	{28, 6, 16},
	{37, 15, 19},
	{73, 2, 19},
	{41, 26, 40},
	{56, 21, 32},
	{53, 37, 15},
}

// LinksMap はエッジから生成されるリンクマップ
var LinksMap = func() map[int]map[int]bool {
	linksMap := make(map[int]map[int]bool)

	for _, edge := range Edges {
		from, to1, to2 := edge[0], edge[1], edge[2]

		// from -> to1, to2
		if linksMap[from] == nil {
			linksMap[from] = make(map[int]bool)
		}
		linksMap[from][to1] = true
		linksMap[from][to2] = true

		// to1 -> from
		if linksMap[to1] == nil {
			linksMap[to1] = make(map[int]bool)
		}
		linksMap[to1][from] = true

		// to2 -> from
		if linksMap[to2] == nil {
			linksMap[to2] = make(map[int]bool)
		}
		linksMap[to2][from] = true
	}

	return linksMap
}()

// Answer 構造体
type Answer struct {
	AspectKey string
	Frame     []int
	Steps     int
}

type FilteredAnswers struct {
	Frame []int `json:"frame"`
	Steps int   `json:"steps"`
}

// StartGoal 構造体
type StartGoal struct {
	Start [2]int
	Goal  [][2]int
}
