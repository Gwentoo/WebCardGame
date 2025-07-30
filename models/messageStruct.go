package models

type Message struct {
	ID                string `json:"id"`
	Type              string `json:"type"`
	Page              string `json:"page"`
	Text              string `json:"text"`
	Username          string `json:"username,omitempty"`
	Role              string `json:"role,omitempty"`
	Row               int    `json:"row,omitempty"`
	Col               int    `json:"col,omitempty"`
	Select            bool   `json:"select"`
	SelectedIndexCard int    `json:"selectedIndexCard"`
	Move              []int  `json:"move"`
	Vector            string `json:"vector"`
}
