package app

func NewBalance(game *Game) {
	for i := range game.Players {
		game.Players[i].Balance = 0
		game.Players[i].Balance = game.Players[i].Perm + game.Round
	}
}
