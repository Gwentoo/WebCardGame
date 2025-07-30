package models

type Card struct {
	Name         string `json:"name"`
	Hp           int    `json:"hp"`
	Damage       int    `json:"damage"`
	Speed        int    `json:"speed"`
	Cost         int    `json:"cost"`
	RadiusAttack int    `json:"radiusAttack"`
	Row          int    `json:"row"`
	Col          int    `json:"col"`
	Cat          bool   `json:"cat"`
	Role         int    `json:"role"`
	Traveled     int    `json:"traveled"`
}

func DimaAttackAbility(card Card) bool {
	if card.Row == 8 {
		return true
	}
	return false
}
func DimaDefAbility(card Card) {
	// Нельзя выйти с 9 этажа, но радиус атаки 1
}

func JackAbility() {
	//Не побеждает на 9 этаже
}

func JakiroAbility() {
	//Не побеждает на 9 этаже
}

func TolyaAbility() {
	//Толкает чела рядом на любую (пустую) клетку (если не Олег)
}

func OlegAbility() {
	//Нельзя передвинуть
}

//OLEG
//Атакует ТОЛЬКО на радиус 2, при нападении на него не может дать сдачи

//DEM
// Если атака, то свободно влево-вправо, если деф, то +1 к урону за каждый этаж (учесть, чтобы не было фарма)

//SASHA
// Если атака, то за каждый пройденный вверх этаж +1 несгораемая монета, если деф, то если погибает любой юнит, то +1 несгораемая монета

//MARK
// Перепрыгивает как шашка любого чела

//MAX
// Все союзники на этом столбце/этой строке получают +2 к дамагу

//MAXIMUS
// Для подьема на этаж требует оплату в монетку, для атаки требует оплату монетку (спуск и передвижение вправо и влево бесплатные)

//VLAD
// Умирает, если на пересечении с ним оказывается кот

//ELVIR
//Если атака: когда выкладывается, можно заменить карту с руки на карту из сброса. Если защита: когда выкладывается, просто так взять карту из броса

//ARTEM
// Когда разыграли карту Артема, в некст ходу можно разыграть 2 карты
