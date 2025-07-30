package main

import (
	"PVGKDLC/app"
	"PVGKDLC/models"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"log"
	"net/http"
	"sync"
)

func getPlayerType(t string) int {
	if t == "defense" {
		return 0
	}
	return 1
}

var (
	pack     map[string]int
	game     *app.Game
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	maxClients    = 6
	lastGameState = struct {
		sync.RWMutex
		Type      string           `json:"type"`
		Attackers int              `json:"attack"`
		Defenders int              `json:"defense"`
		Players   []*models.Player `json:"players"`
	}{}
)

func IsPlayerCard(game *app.Game, id string, row int, col int) bool {
	for _, card := range game.Players[id].CardsActive {
		if card.Row == row && card.Col == col {
			return true
		}
	}
	return false
}

func initGame() {

	pack = map[string]int{
		"Jakiro": 5,
		"Jack":   5,
		"Dima":   1,
		"Dem":    200,
		"Elvir":  1,
		"Tolya":  200,
		"Oleg":   2,
		"Kostya": 2,
		"Sasha":  1,
		"Mark":   1,
		"Max":    1,
		"Ilya":   1,
		"Artem":  1,
		"Vlad":   1,
	}

	game = &app.Game{
		Round: 1,
		Field: make([][]*models.Card, 10),
	}

	game.Deck = pack
	for i := range game.Field {
		game.Field[i] = make([]*models.Card, 5)
		for j := range game.Field[i] {
			game.Field[i][j] = &models.Card{}
		}
	}
	game.Players = make(map[string]*models.Player, 1)
	game.PlayerList = make([]*models.Player, 0)

}

func handleWebSocket(c echo.Context) error {
	playerID := c.QueryParam("playerID")
	if playerID == "" {
		return c.JSON(http.StatusBadRequest, "PlayerID is required")
	}

	ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}

	game.Lock()
	if len(game.Players) > maxClients {
		ws.WriteJSON(models.Message{
			Type: "error",
			Text: "Lobby is full",
		})
		ws.Close()
		return nil
	}
	game.Unlock()

	player, exists := game.Players[playerID]
	if exists {
		if player.Conn != nil {
			player.Conn.Close()
		}
		player.Conn = ws
		player.IsActive = true
		broadcastGameState()
		log.Printf("Player %s reconnected", player.Name)
	} else {

	}

	for {
		var msg models.Message
		if err := ws.ReadJSON(&msg); err != nil {
			break
		}

		switch msg.Type {
		case "join":
			newPlayer := &models.Player{
				ID:       playerID,
				Name:     msg.Username,
				Role:     getPlayerType(msg.Role),
				Balance:  1,
				Conn:     ws,
				IsActive: true,
			}

			game.Players[playerID] = newPlayer
			switch msg.Role {
			case "attack":
				game.Attackers++
			case "defense":
				game.Defenders++
			}

			broadcastGameState()
		case "start":
			if game.Attackers >= 0 && game.Defenders >= 0 {
				game.PlayerList = make([]*models.Player, 0, len(game.Players))
				for _, p := range game.Players {
					game.PlayerList = append(game.PlayerList, p)
				}
				app.NewCards(game)

				broadcast(models.Message{
					Type: "navigate",
					Page: "/views/game.html",
				})
			} else {
				ws.WriteJSON(models.Message{
					Type: "error",
					Text: "Need at least 1 attacker and 1 defender",
				})
			}
		case "startInfo":
			if player, exists := game.Players[playerID]; exists {
				game.Lock()
				ws.WriteJSON(struct {
					Type     string           `json:"type"`
					Players  []*models.Player `json:"players"`
					Balance  int              `json:"balance"`
					IDFirst  string           `json:"idFirst"`
					Card     models.Card      `json:"card"`
					CardRole int              `json:"role"`
				}{
					Type:     "startInfo",
					Players:  game.PlayerList,
					Balance:  player.Balance,
					IDFirst:  game.PlayerList[0].ID,
					Card:     player.CardsPassive[0],
					CardRole: player.Role,
				})
				game.Unlock()
			}
		case "selectPassive":

			if !msg.Select {
				ws.WriteJSON(struct {
					Type  string  `json:"type"`
					Cells [][]int `json:"cells"`
				}{
					Type:  "selectPassive",
					Cells: [][]int{},
				})
			} else {
				ws.WriteJSON(struct {
					Type  string             `json:"type"`
					Cells map[string][][]int `json:"cells"`
				}{
					Type:  "selectPassive",
					Cells: app.CanPut(game, game.Players[playerID], msg.Text),
				})
			}
		case "nextTurn":
			if game.Turn == len(game.Players)-1 {
				game.Round += 1
				game.Turn = 0
				app.NewBalance(game)
				app.NewCards(game)
			} else {
				game.Turn += 1
			}
			for i := 0; i < 10; i++ {
				for j := 0; j < 5; j++ {
					game.Field[i][j].Traveled = 0
				}
			}
			var card models.Card
			if len(player.CardsPassive) > 0 {
				card = player.CardsPassive[len(player.CardsPassive)-1]
			} else {
				card = models.Card{}
			}
			for _, player := range game.Players {
				player.Conn.WriteJSON(struct {
					Type     string           `json:"type"`
					Players  []*models.Player `json:"players"`
					Round    int              `json:"round"`
					TurnID   string           `json:"turnID"`
					Balance  int              `json:"balance"`
					Card     models.Card      `json:"card"`
					CardNum  int              `json:"cardNum"`
					Turn     int              `json:"turn"`
					CardRole int              `json:"role"`
				}{
					Type:     "nextTurn",
					Players:  game.PlayerList,
					Round:    game.Round,
					TurnID:   game.PlayerList[game.Turn].ID,
					Balance:  player.Balance,
					Card:     card,
					CardNum:  len(player.CardsPassive) - 1,
					Turn:     game.Turn,
					CardRole: player.Role,
				})
			}
		case "placeCard":
			if msg.ID == game.PlayerList[game.Turn].ID {
				canCells := app.CanPut(game, game.PlayerList[game.Turn], game.PlayerList[game.Turn].CardsPassive[msg.SelectedIndexCard].Name)
				card := game.Players[msg.ID].CardsPassive[msg.SelectedIndexCard]

				if game.PlayerList[game.Turn].Balance < card.Cost {
					ws.WriteJSON(struct {
						Type  string `json:"type"`
						Place bool   `json:"place"`
					}{
						Type:  "placeCard",
						Place: false,
					})
					ws.WriteJSON(struct {
						Type  string             `json:"type"`
						Cells map[string][][]int `json:"cells"`
					}{
						Type:  "selectPassive",
						Cells: map[string][][]int{},
					})

					break
				}
				for _, cells := range canCells {
					for _, pair := range cells {
						if pair[0] == msg.Row && pair[1] == msg.Col {

							card.Row = msg.Row
							card.Col = msg.Col
							game.Players[msg.ID].Balance -= card.Cost
							game.Field[pair[0]][pair[1]] = &card
							game.Players[msg.ID].CardsPassive = append(game.Players[msg.ID].CardsPassive[:msg.SelectedIndexCard], game.Players[msg.ID].CardsPassive[msg.SelectedIndexCard+1:]...)
							game.Players[msg.ID].CardsActive = append(game.Players[msg.ID].CardsActive, &card)

							for _, p := range game.Players {
								p.Conn.WriteJSON(struct {
									Type    string      `json:"type"`
									ID      string      `json:"id"`
									Place   bool        `json:"place"`
									Balance int         `json:"balance"`
									Row     int         `json:"row"`
									Col     int         `json:"col"`
									Card    models.Card `json:"card"`
									Role    int         `json:"role"`
								}{
									Type:    "placeCard",
									ID:      msg.ID,
									Place:   true,
									Balance: game.Players[msg.ID].Balance,
									Row:     msg.Row,
									Col:     msg.Col,
									Card:    card,
									Role:    game.Players[msg.ID].Role,
								})
							}

						}
					}

				}

			} else {
				ws.WriteJSON(struct {
					Type  string `json:"type"`
					Place bool   `json:"place"`
				}{
					Type:  "placeCard",
					Place: false,
				})
				ws.WriteJSON(struct {
					Type  string             `json:"type"`
					Cells map[string][][]int `json:"cells"`
				}{
					Type:  "selectPassive",
					Cells: map[string][][]int{},
				})
			}
		case "selectActive":
			if IsPlayerCard(game, msg.ID, msg.Row, msg.Col) {
				canMoves := app.CanMove(game, game.Players[msg.ID], game.Field[msg.Row][msg.Col])
				ws.WriteJSON(struct {
					Type     string             `json:"type"`
					Select   bool               `json:"select"`
					CanMoves map[string][][]int `json:"canMoves"`
				}{
					Type:     "selectActive",
					Select:   true,
					CanMoves: canMoves,
				})
			} else {
				ws.WriteJSON(struct {
					Type   string `json:"type"`
					Select bool   `json:"select"`
				}{
					Type:   "selectActive",
					Select: false,
				})
			}
		case "move":

			if IsPlayerCard(game, msg.ID, msg.Move[0], msg.Move[1]) {
				canMoves := app.CanMove(game, game.Players[msg.ID], game.Field[msg.Move[0]][msg.Move[1]])
				for _, cells := range canMoves {
					for _, pair := range cells {
						if pair[0] == msg.Move[2] && pair[1] == msg.Move[3] {
							move(msg.Move[0], msg.Move[1], msg.Move[2], msg.Move[3], msg.Move, false)
						}
					}
				}
			} else {
				ws.WriteJSON(struct {
					Type   string `json:"type"`
					IsMove bool   `json:"isMove"`
				}{
					Type:   "move",
					IsMove: false,
				})
			}
		case "push":

			switch msg.Vector {
			case "up":
				move(msg.Move[2], msg.Move[3], msg.Move[2]-1, msg.Move[3], []int{msg.Move[2], msg.Move[3], msg.Move[2] - 1, msg.Move[3]}, true)
			case "down":
				move(msg.Move[2], msg.Move[3], msg.Move[2]+1, msg.Move[3], []int{msg.Move[2], msg.Move[3], msg.Move[2] + 1, msg.Move[3]}, true)
			case "left":
				move(msg.Move[2], msg.Move[3], msg.Move[2], msg.Move[3]-1, []int{msg.Move[2], msg.Move[3], msg.Move[2], msg.Move[3] - 1}, true)
			case "right":
				move(msg.Move[2], msg.Move[3], msg.Move[2], msg.Move[3]+1, []int{msg.Move[2], msg.Move[3], msg.Move[2], msg.Move[3] + 1}, true)

			}
			move(msg.Move[0], msg.Move[1], msg.Move[2], msg.Move[3], msg.Move, true)
		}
	}

	game.Lock()
	if player, exists := game.Players[playerID]; exists {
		player.IsActive = false
	}
	game.Unlock()
	broadcastGameState()

	return nil
}

func move(fromRow int, fromCol int, toRow int, toCol int, move []int, push bool) {
	card := game.Field[fromRow][fromCol]
	card.Row = toRow
	card.Col = toCol
	if push {
		card.Traveled += card.Speed
	} else {
		if fromRow != toRow && fromCol != toCol {
			card.Traveled += 2
		}
		if fromRow == toRow || fromCol == toCol {
			card.Traveled += 1
		}
	}

	game.Field[toRow][toCol] = card
	game.Field[fromRow][fromCol] = &models.Card{}
	for _, p := range game.PlayerList {
		p.Conn.WriteJSON(struct {
			Type   string `json:"type"`
			IsMove bool   `json:"isMove"`
			Move   []int  `json:"move"`
		}{
			Type:   "move",
			IsMove: true,
			Move:   move,
		})
	}

}

func broadcast(msg models.Message) {
	game.Lock()
	defer game.Unlock()

	for _, player := range game.Players {
		if player.Conn != nil && player.IsActive {
			err := player.Conn.WriteJSON(msg)
			if err != nil {
				player.Conn.Close()
				player.IsActive = false
			}
		}
	}
}

func broadcastGameState() {
	game.Lock()
	defer game.Unlock()

	players := make([]*models.Player, 0, len(game.Players))
	for _, player := range game.Players {
		players = append(players, player)

	}

	lastGameState.Lock()
	lastGameState.Type = "lobby"
	lastGameState.Players = players
	lastGameState.Defenders = game.Defenders
	lastGameState.Attackers = game.Attackers
	lastGameState.Unlock()

	state := struct {
		Type      string           `json:"type"`
		Attackers int              `json:"attack"`
		Defenders int              `json:"defense"`
		Players   []*models.Player `json:"players"`
	}{
		Type:      "lobby",
		Attackers: game.Attackers,
		Defenders: game.Defenders,
		Players:   players,
	}

	for _, player := range game.Players {
		if player.Conn != nil && player.IsActive {
			err := player.Conn.WriteJSON(state)
			if err != nil {
				player.IsActive = false
			}
		}

	}
}
func main() {

	initGame()
	e := echo.New()
	e.Use(middleware.CORS())
	e.Use(middleware.Logger())
	e.Static("/", "public")
	e.GET("/", func(c echo.Context) error { return c.File("public/views/index.html") })
	e.GET("/ws", handleWebSocket)
	e.GET("/api/state", handleGetState)
	e.Logger.Fatal(e.Start(":8080"))
}

func handleGetState(c echo.Context) error {
	lastGameState.RLock()
	defer lastGameState.RUnlock()

	return c.JSON(http.StatusOK, lastGameState)
}
