package app

import (
	"PVGKDLC/models"
)

func CanPut(game *Game, player *models.Player, name string) map[string][][]int {
	canPut := make(map[string][][]int, 1)

	var maxNum = 6
	if player.Role == 0 {
		if name == "Дима" {
			maxNum = 2
		}
		for i := 0; i < maxNum; i++ {
			for j := 0; j < 5; j++ {
				if game.Field[i][j].Name == "" {
					canPut["green"] = append(canPut["green"], []int{i, j})
				}
			}
		}

	} else {
		for i := 0; i < 5; i++ {

			if game.Field[9][i].Name == "" {
				canPut["green"] = append(canPut["green"], []int{9, i})
			}
		}
	}

	return canPut
}
