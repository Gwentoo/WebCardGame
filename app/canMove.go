package app

import (
	"PVGKDLC/models"
)

func TwoSteps(row int, col int) [][]int {
	steps := make([][]int, 0)
	for r := -1; r < 2; r++ {
		for c := -1; c < 2; c++ {
			if c == 0 && r == 0 {
				continue
			}
			if row+r < 10 && row+r >= 0 && col+c < 5 && col+c >= 0 {
				steps = append(steps, []int{row + r, col + c})
			}
		}
	}
	if row+2 < 10 && row+2 >= 0 {
		steps = append(steps, []int{row + 2, col})
	}
	if row-2 < 10 && row-2 >= 0 {
		steps = append(steps, []int{row - 2, col})
	}
	if col+2 < 5 && col+2 >= 0 {
		steps = append(steps, []int{row, col + 2})
	}
	if col-2 < 5 && col-2 >= 0 {
		steps = append(steps, []int{row, col - 2})
	}
	return steps
}

func OneStep(row int, col int) [][]int {
	steps := make([][]int, 0)
	if row+1 < 10 && row+1 >= 0 {
		steps = append(steps, []int{row + 1, col})
	}
	if row-1 < 10 && row-1 >= 0 {
		steps = append(steps, []int{row - 1, col})
	}
	if col+1 < 5 && col+1 >= 0 {
		steps = append(steps, []int{row, col + 1})
	}
	if col-1 < 5 && col-1 >= 0 {
		steps = append(steps, []int{row, col - 1})
	}
	return steps
}

func CanMove(game *Game, player *models.Player, card *models.Card) map[string][][]int {
	row := card.Row
	col := card.Col
	canMoves := make(map[string][][]int, 1)
	if card.Traveled == card.Speed {
		return canMoves
	}
	if card.Name == "Толя" {
		cells := OneStep(row, col)
		for _, pair := range cells {
			if game.Field[pair[0]][pair[1]].Name != "" {
				canMoves["orange"] = append(canMoves["orange"], []int{pair[0], pair[1]})
			} else {
				canMoves["green"] = append(canMoves["green"], []int{pair[0], pair[1]})
			}
		}
	}

	return canMoves
}
