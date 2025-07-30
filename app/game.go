package app

import (
	"PVGKDLC/models"
	"sync"
)

type Game struct {
	sync.Mutex
	Round      int
	Field      [][]*models.Card
	Players    map[string]*models.Player
	Attackers  int
	Defenders  int
	PlayerList []*models.Player
	Turn       int
	Deck       map[string]int
}
