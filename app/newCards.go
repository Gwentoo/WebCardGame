package app

import (
	"PVGKDLC/models"
	"PVGKDLC/utils"
)

var Cards = map[string]models.Card{
	"Dima":   {Name: "Дима", Damage: 1, Speed: 1, Cost: 4},
	"Jack":   {Name: "Джейк", Hp: 1, Damage: 1, Speed: 2, Cost: 0, RadiusAttack: 0, Cat: true},
	"Jakiro": {Name: "Юкира", Hp: 1, Damage: 2, Speed: 1, Cost: 0, RadiusAttack: 0, Cat: true},
	"Tolya":  {Name: "Толя", Hp: 4, Damage: 5, Speed: 1, Cost: 3, RadiusAttack: 0},
	"Oleg":   {Name: "Олег", Hp: 10, Damage: 1, Speed: 1, Cost: 5, RadiusAttack: 0},
	"Kostya": {Name: "Костя", Hp: 2, Damage: 3, Speed: 1, Cost: 4, RadiusAttack: 1},
	"Dem":    {Name: "Дем", Hp: 3, Damage: 1, Speed: 1, Cost: 2, RadiusAttack: 0},
	"Sasha":  {Name: "Саша", Hp: 2, Damage: 1, Speed: 1, Cost: 4, RadiusAttack: 0},
	"Mark":   {Name: "Марк", Hp: 1, Damage: 1, Speed: 1, Cost: 3, RadiusAttack: 0},
	"Max":    {Name: "Макс", Hp: 1, Damage: 1, Speed: 1, Cost: 4, RadiusAttack: 0},
	"Ilya":   {Name: "Илья", Hp: 8, Damage: 4, Speed: 1, Cost: 8, RadiusAttack: 0},
	"Vlad":   {Name: "Влад", Hp: 4, Damage: 3, Speed: 1, Cost: 4, RadiusAttack: 1},
	"Elvir":  {Name: "Эльвир", Hp: 1, Damage: 1, Speed: 1, Cost: 4, RadiusAttack: 0},
	"Artem":  {Name: "Артем", Hp: 1, Damage: 1, Speed: 1, Cost: 3, RadiusAttack: 0},
}

func NewCards(game *Game) {
	for _, player := range game.PlayerList {
		if len(player.CardsPassive) < 5 {
			newCard := utils.WeightedRandomChoice(game.Deck)
			if newCard != "" {
				player.CardsPassive = append(player.CardsPassive, Cards[newCard])
				game.Deck[newCard] -= 1
			}
		}
	}
}
