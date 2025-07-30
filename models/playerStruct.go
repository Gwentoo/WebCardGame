package models

import (
	"github.com/gorilla/websocket"
)

type Player struct {
	ID           string          `json:"id"`
	Name         string          `json:"username"`
	Balance      int             `json:"balance"`
	Role         int             `json:"role"` //0 -  defence, 1 - attack
	Perm         int             `json:"perm"`
	CardsActive  []*Card         `json:"cardsActive"`
	CardsPassive []Card          `json:"cardsPassive"`
	Conn         *websocket.Conn `json:"conn"`
	IsActive     bool
}
