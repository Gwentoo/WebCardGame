const ROWS = 10;
const COLS = 5;
const urlParams = new URLSearchParams(window.location.search);
const existingPlayerID = urlParams.get('playerID');
let selectedCardIndex = null;
let selectedFieldCard = null;

const socket = new WebSocket(
    `ws://192.168.0.102:8080/ws?playerID=${existingPlayerID}`
);
socket.onopen = () => {
    console.log("Соединение установелено")
    socket.send(JSON.stringify({
        type: 'startInfo',
    }));
}

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Получено сообщение:', data);
    let isMyTurn;
    switch (data.type) {
        case 'startInfo':
            updateBalance(data.balance);
            updatePlayersList(data.players, data.idFirst);
            isMyTurn = data.idFirst === existingPlayerID;
            document.getElementById('nextTurnButton').disabled = !isMyTurn;
            const name = data.card.name
            const imagePath = `/images/${name}.png`
            addCardHand(0,
                data.card.hp,
                data.card.damage,
                data.card.speed,
                data.card.cost,
                data.card.radiusAttack === 0 ? "knight" : "archer",
                imagePath,
                name,
                data.role === 1 ? "attack" : "defense"

            )
            break;
        case 'selectPassive':
            if (data.select === false) {
                clearHighlights()
            } else {
                highlightCells(data.cells);
            }
            break;
        case 'nextTurn':
            updateBalance(data.balance)
            updatePlayersList(data.players, data.turnID)
            updateRound(data.round)
            isMyTurn = data.turnID === existingPlayerID;
            document.getElementById('nextTurnButton').disabled = !isMyTurn;
            selectedFieldCard = null
            selectedCardIndex = null
            if (data.turn === 0){
                const index = data.cardNum
                const name = data.card.name
                const imagePath = `/images/${name}.png`
                addCardHand(index,
                    data.card.hp,
                    data.card.damage,
                    data.card.speed,
                    data.card.cost,
                     data.card.radiusAttack === 0 ? "knight" : "archer",
                    imagePath,
                    name,
                    data.role === 1 ? "attack" : "defense"

                )
            }
            break;
        case 'placeCard':
            if (data.place){
                let imagePath = `/images/${data.card.name}.png`
                const isPlayerCard = data.id === existingPlayerID
                placeCardOnField(
                    data.row,
                    data.col,
                    data.card.name,
                    imagePath,
                    data.card.hp,
                    data.card.damage,
                    data.card.speed,
                    data.card.cost,
                    data.card.radiusAttack === 1 ? "archer" : "knight",
                    data.role === 1 ? "attack" : "defense",
                    isPlayerCard
                    );
                if (data.id === existingPlayerID){
                    deleteCardHand(selectedCardIndex)
                    updateBalance(data.balance)
                }
                clearHighlights()

            } else {
                console.log("Вы не можете сходить сюда.");
            }
            break;
        case "selectActive":
            if (data.select){
                highlightCells(data.canMoves)
            } else {
                console.log("Это не ваша карта");
            }
            break;
        case 'move':
            if (data.isMove){
                moveCard(data.move[0], data.move[1], data.move[2], data.move[3])

            } else {
                console.log("Это не ваша карта")
            }
            clearHighlights()
            selectedFieldCard = null
            selectedCardIndex = null
    }
}


function updatePlayersList(players, currentPlayerId) {
    const container = document.getElementById('playersContainer');
    container.innerHTML = '';

    players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = `player-item ${player.role}`;
        playerItem.innerHTML = `
            ${player.role === 1 ? '⚔️' : '🛡️'}
            ${player.username}
        `;
        if (player.id === currentPlayerId) {
            playerItem.classList.add('current-player');
        }
        if (player.id === existingPlayerID) {
            playerItem.innerHTML += ` (Вы)`
        }

        container.appendChild(playerItem);
    });
}

function toggleCardSelection(cardElement) {
    const index = cardElement.dataset.index;
    const isSelected = cardElement.classList.contains('selected');

    if (cardElement.querySelector(".card-text").textContent !== "") {
        if (isSelected) {
            cardElement.classList.remove('selected');
            selectedCardIndex = null;
            console.log(`Снята карта ID: ${index}`);
            socket.send(JSON.stringify({
                type: "selectPassive",
                index: index,
                select: false
            }));
        } else {
            document.querySelectorAll('.cards-column .card.selected').forEach(card => {
                card.classList.remove('selected');
            });
            cardElement.classList.add('selected');
            selectedCardIndex = index;
            console.log(`Выбрана карта ID: ${index}`);
            socket.send(JSON.stringify({
                type: "selectPassive",
                index: index,
                text: cardElement.querySelector(".card-text").textContent,
                select: true
            }));
        }
    }
}

function initializeGrid() {

    const grid = document.getElementById('grid');
    const cells = []; // Массив для хранения всех клеток

    for (let row = 0; row <ROWS; row++) {
        const rowElement = document.createElement('div');
        rowElement.className = 'row';
        const rowCells = [];

        for (let col = 0; col < COLS; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.dataset.hasCard = 'false';

            cell.addEventListener('click', () => {
                toggleFieldSelection(cell);
            });

            rowElement.appendChild(cell);
            rowCells.push(cell);
        }

        grid.appendChild(rowElement);
        cells.push(rowCells);
    }

    window.gridCells = cells;
}

function toggleFieldSelection(cell) {
    const row = cell.dataset.row;
    const col = cell.dataset.col;

    if (cell.dataset.hasCard === 'true') {
        console.log("Я ТУТ????")
        cell.classList.add('selected');
        console.log(selectedFieldCard)
        if (selectedFieldCard !== null){
            if (selectedFieldCard[0] === row && selectedFieldCard[1] === col){
                selectedFieldCard = null
                cell.classList.remove('selected')
                clearHighlights()
            } else {

                const charName1 = window.gridCells[selectedFieldCard[0]][selectedFieldCard[1]].dataset.name
                const charName2 = cell.dataset.name
                if (charName1 === "Толя"){
                    if (charName2 !== "Олег") {
                        showActionDialog(function (selectedAction){
                            if (selectedAction === 'attack'){
                                console.log("АТАКА")
                            } else {
                                // socket.send(JSON.stringify({
                                //     type: "push",
                                //     move: [selectedFieldCard[0], selectedFieldCard[1], row, col],
                                //     id: existingPlayerID
                                // }))
                                let left, right, up, down = true
                                if (parseInt(col) === 0){
                                    left = false
                                } else {
                                    const cell = window.gridCells[parseInt(row)][parseInt(col)-1]
                                    if (cell.dataset.hasCard === 'true'){
                                        left = false
                                    }
                                }
                                if (parseInt(col) === 4){
                                    right = false
                                } else {
                                    const cell = window.gridCells[parseInt(row)][parseInt(col)+1]
                                    if (cell.dataset.hasCard === 'true'){
                                        right = false
                                    }
                                }
                                if (parseInt(row) === 0){
                                    up = false
                                } else {
                                    const cell = window.gridCells[parseInt(row)-1][parseInt(col)]
                                    if (cell.dataset.hasCard === 'true'){
                                        up = false
                                    }
                                }
                                if (parseInt(row) === 9){
                                    down = false
                                } else {
                                    const cell = window.gridCells[parseInt(row)+1][parseInt(col)]
                                    if (cell.dataset.hasCard === 'true'){
                                        down = false
                                    }
                                }
                                showDirectionDialog({
                                    up: up,
                                    down: down,
                                    left: left,
                                    right: right
                                }, (direction) => {
                                    socket.send(JSON.stringify({
                                        type: "push",
                                        move: [parseInt(selectedFieldCard[0]), parseInt(selectedFieldCard[1]), parseInt(row), parseInt(col)],
                                        vector: `${direction}`,
                                        id: existingPlayerID
                                    }))
                                });


                            }
                        })
                    }

                } else {


                }


            }

        } else {

            console.log(1)
            selectedFieldCard = [ row, col ];
            console.log(`Выбрана карта на поле: (${row},${col})`);
            socket.send(JSON.stringify({
                type: "selectActive",
                select: false,
                row: parseInt(row),
                col: parseInt(col),
                id: existingPlayerID,
            }));

        }

    } else {

        if (selectedFieldCard !== null){

            if (selectedFieldCard[0] !== row || selectedFieldCard[1] !== col){

                socket.send(JSON.stringify({
                    type: "move",
                    move: [parseInt(selectedFieldCard[0]), parseInt(selectedFieldCard[1]), parseInt(row), parseInt(col)],
                    id: existingPlayerID,
                }))
                clearHighlights()
                selectedFieldCard = null
                cell.classList.remove('selected')

            }
        } else {

            socket.send(JSON.stringify({
                type: "placeCard",
                id: existingPlayerID,
                selectedIndexCard: parseInt(selectedCardIndex),
                row: parseInt(row),
                col: parseInt(col),
            }));
            selectedFieldCard = null
            cell.classList.remove('selected')
        }

    }
}

function placeCardOnField(row, col, name, imagePath, hp, damage, speed, cost, type, role, isPlayerCard) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
        console.error('Некорректные координаты');
        return;
    }
    const cell = window.gridCells[row][col];
    if (!cell) {
        console.error('Ячейка не найдена');
        return;
    }

    cell.innerHTML = '';

    const card = document.createElement('div');
    card.className = `card-on-field ${role}-card-on-field`;

    if (isPlayerCard) {
        card.classList.add('player-card');
        if (role === "attack") {
            card.classList.add('attacking-card');
        } else {
            card.classList.add('defending-card');
        }
    } else {
        card.classList.add('opponent-card');
    }

    const weaponIcon = type === 'archer' ? '🏹' : '⚔️';

    card.innerHTML = `
        <div class="card-bg"></div>
        <div class="card-image" style="background-image: url('${imagePath}')"></div>
        <div class="card-stats hp">❤️${hp}</div>
        <div class="card-stats damage">${weaponIcon}${damage}</div>
        <div class="card-stats speed">🏃${speed}</div>
        <div class="card-stats cost">💰${cost}</div>
    `;

    cell.appendChild(card);
    cell.dataset.hasCard = 'true';
    cell.dataset.cardType = type;
    cell.dataset.cardRole = role;
    cell.dataset.name = name;
}

function moveCard(fromRow, fromCol, toRow, toCol) {

    const sourceCell = window.gridCells[fromRow][fromCol];
    const targetCell = window.gridCells[toRow][toCol];

    const card = sourceCell.querySelector('.card-on-field');
    if (!card) return false;

    card.classList.add('moving-card');

    const startRect = sourceCell.getBoundingClientRect();
    const endRect = targetCell.getBoundingClientRect();
    const dx = endRect.left - startRect.left;
    const dy = endRect.top - startRect.top;

    card.style.transform = `translate(${dx}px, ${dy}px) scale(1.1)`;
    card.style.transition = 'transform 0.5s ease, opacity 0.3s ease';
    card.style.zIndex = '1000';

    setTimeout(() => {
        sourceCell.innerHTML = '';
        sourceCell.dataset.hasCard = 'false';
        targetCell.appendChild(card);
        targetCell.dataset.hasCard = 'true';
        targetCell.dataset.cardType = sourceCell.dataset.cardType;
        targetCell.dataset.cardRole = sourceCell.dataset.cardRole;
        targetCell.dataset.name = sourceCell.dataset.name;
        delete sourceCell.dataset.cardType;
        delete sourceCell.dataset.cardRole;
        delete sourceCell.dataset.name;
        card.style.transform = '';
        card.style.transition = '';
        card.style.zIndex = '';
        card.classList.remove('moving-card');
        targetCell.classList.remove('selected')
        sourceCell.classList.remove('selected')

    }, 500);

    return true;
}

function initializeCardList() {
    window.cardList = {
        cards: [[], [], []],
        getCard: function (row, col) {
            if (row >= 0 && row < this.cards.length &&
                col >= 0 && col < this.cards[row].length) {
                return this.cards[row][col];
            }
            return null;
        }
    };

    const deckColumns = document.querySelectorAll('.deck-column');

    deckColumns.forEach((column, rowIndex) => {

        column.innerHTML = '';

        for (let colIndex = 0; colIndex < 5; colIndex++) {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.row = rowIndex;
            card.dataset.col = colIndex;
            card.innerHTML = `
                <span class="corner-text top-left"></span>
                <span class="corner-text top-right"></span>
                <span class="corner-text bottom-left"></span>
                <span class="corner-text bottom-right"></span>
                <span class="card-text"></span>
            `;
            column.appendChild(card);
            window.cardList.cards[rowIndex][colIndex] = card;
        }
    });
    addCardToList(0, 0, 0, 1, 1, 4, "knight", "/images/Дима.png", "Дима", "Атака: Побеждает, если доходит до 8 этажа.<br>Защита: Нельзя уйти с 9 этажа, радиус атаки 2.")
    addCardToList(1, 0, 1, 1, 2, 0, "knight", "/images/Джейк.png", "Джейк", "Не побеждает на 9 этаже.")
    addCardToList(2, 0, 1, 2, 1, 0, "knight", "/images/Юкира.png", "Юкира", "Не побеждает на 9 этаже.")
    addCardToList(0, 1, 4, 5, 1, 3, "knight", "/images/Толя.png", "Толя", "Может толкнуть любого игрока рядом с собой (кроме Олега)")
    addCardToList(1, 1, 10, 1, 1, 5, "archer", "/images/Олег.png", "Олег", "Атакует только с радиусом 1. Если на него нападет мечник, то не может нанести ответный урон. Героя нельзя толкнуть.")
    addCardToList(2, 1, 2, 3, 1, 4, "archer", "/images/Костя.png", "Костя")
    addCardToList(0, 2, 3, 1, 1, 2, "knight", "/images/Дем.png", "Дем", "Атака: Может свободно ходить по этажу.<br>Защита: За каждый этаж получает +1 к урону.")
    addCardToList(1, 2, 2, 1, 1, 4, "knight", "/images/Саша.png", "Саша", "Атака: Получает несгораемую монету за каждый этаж.<br>Защита: За каждого мёртвого героя получает несгораемую монету.")
    addCardToList(2, 2, 1, 1, 1, 3, "knight", "/images/Марк.png", "Марк", "Может перепрыгнуть любого героя.")
    addCardToList(0, 3, 1, 1, 1, 4, "knight", "/images/Макс.png", "Макс", "Все союзники находящиеся с ним на одной строке или на одном столбце получают +2 к урону")
    addCardToList(1, 3, 8, 4, 1, 8, "knight", "/images/Илья.png", "Илья", "За подъем на этаж и за каждую атаку теряет одну монету.")
    addCardToList(2, 3, 4, 3, 1, 4, "archer", "/images/Влад.png", "Влад", "Герой погибает, если на пересечении с ним оказывается кот.")
    addCardToList(0, 4, 1, 1, 1, 4, "knight", "/images/Эльвир.png", "Эльвир", "Атака: При размещении на поле можно заменить карту с руки на карту из сброса.<br>Защита: При размещении игрок получает карту из сброса.")
    addCardToList(1, 4, 1, 1, 1, 3, "knight", "/images/Артем.png", "Артем", "Когда карта разыграна, на следующий ход игрок может разыграть 2 карты.")
    addCardToList(2, 4, 100, 100, 100, 0, "knight", "/images/JDH.png", "JDH", "Тут могла быть ваша реклама.")
}

function initializeDeck() {
    const cardsContainer = document.querySelector('.cards-column');
    if (!cardsContainer) return;

    cardsContainer.innerHTML = '';

    for (let i = 4; i >= 0; i--) {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.index = i;
        card.dataset.selected = 'false'

        card.innerHTML = `
            <span class="corner-text top-left"></span>
            <span class="corner-text top-right"></span>
            <span class="corner-text bottom-left"></span>
            <span class="corner-text bottom-right"></span>
            <span class="card-text"></span>
        `;

        card.addEventListener('click', function () {
            toggleCardSelection(this);
        });
        cardsContainer.appendChild(card);
    }
}

function addCardToList(row, col, hp, damage, speed, cost, type, imagePath, name, description) {
    const card = window.cardList.getCard(row, col)

    let weaponIcon = type === 'archer' ? '🏹' : '⚔️';
    if (name === "Дима") {
        weaponIcon = '🏹/⚔️'
    }
    card.innerHTML = `
        
        <img src="${imagePath}" alt="${name}" class="card-img">
        <span class="corner-text top-left">❤️${hp}</span>
        <span class="corner-text top-right">${weaponIcon}${damage}</span>
        <span class="corner-text bottom-left">🏃${speed}</span>
        <span class="corner-text bottom-right">💰${cost}</span>
        <span class="card-text">${name}</span>
        <div class="card-description">${description || 'Описание карты'}</div>
    `;

}

function addCardHand(cardIndex, hp, damage, speed, cost, type, imagePath, name, role) {
    if (cardIndex < 0 || cardIndex > 4) {
        console.error('Индекс карты должен быть от 0 до 4');
        return;
    }

    const card = document.querySelector(`.cards-column .card[data-index="${cardIndex}"]`);
    if (!card) {
        console.error(`Карта с индексом ${cardIndex} не найдена`);
        return;
    }

    if (role === 'attack') {
        card.classList.add('attack-card');
    } else if (role === 'defense') {
        card.classList.add('defense-card');
    }

    const weaponIcon = type === 'archer' ? '🏹' : '⚔️';

    card.innerHTML = `
        
        <img src="${imagePath}" alt="" class="card-img">
        <span class="corner-text top-left">❤️${hp}</span>
        <span class="corner-text top-right">${weaponIcon}${damage}</span>
        <span class="corner-text bottom-left">🏃${speed}</span>
        <span class="corner-text bottom-right">💰${cost}</span>
        <span class="card-text">${name}</span>
    `;
}

function deleteCardHand(cardIndex) {
    const cardsContainer = document.querySelector('.cards-column');

    const cards = Array.from(cardsContainer.querySelectorAll('.card'))
        .sort((a, b) => parseInt(a.dataset.index) - parseInt(b.dataset.index));

    for (let i = parseInt(cardIndex); i < cards.length - 1; i++) {
        const nextCard = cards[i + 1];
        const currentCard = cards[i];

        currentCard.innerHTML = nextCard.innerHTML;
        currentCard.className = nextCard.className;
        currentCard.dataset.selected = nextCard.dataset.selected;

    }

    const lastCard = cards[cards.length - 1];
    lastCard.innerHTML = `
        <span class="corner-text top-left"></span>
        <span class="corner-text top-right"></span>
        <span class="corner-text bottom-left"></span>
        <span class="corner-text bottom-right"></span>
        <span class="card-text"></span>
    `;
    lastCard.className = 'card';
    lastCard.dataset.selected = 'false';

    selectedCardIndex = null
}

function highlightCells(cellsToHighlight) {
    console.log(cellsToHighlight)
    clearHighlights();

    // Проходим по всем цветам в словаре
    for (const [colorType, coordinates] of Object.entries(cellsToHighlight)) {
        // Проходим по всем координатам для этого цвета
        coordinates.forEach(([row, col]) => {
            const cell = window.gridCells[row][col];
            cell.classList.remove('highlight-green', 'highlight-orange', 'highlight-red');
            // Добавляем соответствующий класс и стили
            let highlightClass;
            let styles = {};

            switch(colorType) {
                case 'green':
                    highlightClass = 'highlight-green';
                    styles = {
                        backgroundColor: 'rgba(100, 255, 100, 0.4)',
                        border: '2px solid #00ff00',
                        boxShadow: 'inset 0 0 10px rgba(0, 255, 0, 0.6)'
                    };
                    break;

                case 'orange':
                    highlightClass = 'highlight-orange';
                    styles = {
                        backgroundColor: 'rgba(255, 165, 0, 0.7)',
                        border: '2px solid #ffa500',
                        boxShadow: 'inset 0 0 10px rgba(255, 165, 0, 0.6)'
                    };
                    break;

                case 'red':
                    highlightClass = 'highlight-red';
                    styles = {
                        backgroundColor: 'rgba(255, 50, 50, 0.7)',
                        border: '2px solid #ff0000',
                        boxShadow: 'inset 0 0 10px rgba(255, 0, 0, 0.6)'
                    };
                    break;
            }

            cell.classList.add(highlightClass);
            Object.assign(cell.style, {
                transform: 'scale(1.03)',
                zIndex: '10',
                transition: 'all 0.2s ease-out',
                ...styles
            });
        });
    }
}

function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('highlighted');
        cell.style.backgroundColor = '';
        cell.style.border = '';
        cell.style.boxShadow = '';
        cell.style.transform = '';
        cell.style.zIndex = '';
    });
}

function updateBalance(value) {
    const balanceElement = document.getElementById('balanceValue');
    balanceElement.textContent = value;
    balanceElement.classList.add('value-change');
    setTimeout(() => balanceElement.classList.remove('value-change'), 500);
}

function updateRound(value) {
    const roundElement = document.getElementById('roundValue');
    roundElement.textContent = value;
    roundElement.classList.add('value-change');
    setTimeout(() => roundElement.classList.remove('value-change'), 500);
}

function nextTurn() {
    const button = document.getElementById('nextTurnButton');
    if (button.disabled) {
        console.log('Сейчас не ваш ход!');
        return;
    }

    socket.send(JSON.stringify({
        type: 'nextTurn',
    }));

    button.disabled = true;

}


document.addEventListener("DOMContentLoaded", () => {
    initializeDeck();
    initializeGrid()
    initializeCardList()
})

function showActionDialog(callback) {
    // Создаем элементы модального окна
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';

    // Создаем контейнер диалога
    const dialog = document.createElement('div');
    dialog.style.backgroundColor = '#2c3e50';
    dialog.style.padding = '20px';
    dialog.style.borderRadius = '10px';
    dialog.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
    dialog.style.textAlign = 'center';
    dialog.style.color = 'white';

    // Заголовок
    const title = document.createElement('h2');
    title.textContent = 'Выберите действие';
    dialog.appendChild(title);

    // Кнопка "Атаковать"
    const attackBtn = document.createElement('button');
    attackBtn.textContent = '⚔️ Атаковать';
    attackBtn.style.margin = '10px';
    attackBtn.style.padding = '10px 20px';
    attackBtn.style.fontSize = '16px';
    attackBtn.style.backgroundColor = '#e74c3c';
    attackBtn.style.color = 'white';
    attackBtn.style.border = 'none';
    attackBtn.style.borderRadius = '5px';
    attackBtn.style.cursor = 'pointer';

    // Кнопка "Толкнуть"
    const pushBtn = document.createElement('button');
    pushBtn.textContent = '👐 Толкнуть';
    pushBtn.style.margin = '10px';
    pushBtn.style.padding = '10px 20px';
    pushBtn.style.fontSize = '16px';
    pushBtn.style.backgroundColor = '#3498db';
    pushBtn.style.color = 'white';
    pushBtn.style.border = 'none';
    pushBtn.style.borderRadius = '5px';
    pushBtn.style.cursor = 'pointer';

    // Обработчики кнопок
    attackBtn.onclick = function() {
        document.body.removeChild(modal);
        callback('attack'); // Возвращаем выбранное действие
    };

    pushBtn.onclick = function() {
        document.body.removeChild(modal);
        callback('push'); // Возвращаем выбранное действие
    };

    // Добавляем элементы в DOM
    dialog.appendChild(attackBtn);
    dialog.appendChild(pushBtn);
    modal.appendChild(dialog);
    document.body.appendChild(modal);
}

function showDirectionDialog(options, callback) {
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';

    // Контейнер диалога
    const dialog = document.createElement('div');
    dialog.style.backgroundColor = '#2c3e50';
    dialog.style.padding = '20px';
    dialog.style.borderRadius = '10px';
    dialog.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
    dialog.style.textAlign = 'center';
    dialog.style.color = 'white';

    // Заголовок
    const title = document.createElement('h2');
    title.textContent = 'Выберите направление';
    title.style.marginBottom = '20px';
    dialog.appendChild(title);

    // Контейнер для кнопок
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'grid';
    buttonsContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
    buttonsContainer.style.gap = '10px';

    // Функция создания кнопки направления
    function createDirectionButton(direction, label, icon) {
        if (options[direction] !== false) { // Показываем только если не отключено
            const btn = document.createElement('button');
            btn.innerHTML = icon + ' ' + label;
            btn.style.padding = '12px';
            btn.style.borderRadius = '5px';
            btn.style.border = 'none';
            btn.style.cursor = 'pointer';
            btn.style.transition = 'all 0.2s';
            btn.style.fontSize = '16px';
            btn.style.backgroundColor = '#3498db';
            btn.style.color = 'white';

            btn.onmouseenter = () => btn.style.transform = 'scale(1.05)';
            btn.onmouseleave = () => btn.style.transform = '';

            btn.onclick = () => {
                modal.style.opacity = '0';
                setTimeout(() => document.body.removeChild(modal), 300);
                callback(direction);
            };

            return btn;
        }
        return null;
    }


    const emptyCell = document.createElement('div'); // Пустая ячейка для сетки

    const upBtn = createDirectionButton('up', 'Вверх', '⬆️');
    const leftBtn = createDirectionButton('left', 'Влево', '⬅️');
    const rightBtn = createDirectionButton('right', 'Вправо', '➡️');
    const downBtn = createDirectionButton('down', 'Вниз', '⬇️');


    if (upBtn) buttonsContainer.appendChild(emptyCell.cloneNode());
    if (upBtn) buttonsContainer.appendChild(upBtn);
    if (upBtn) buttonsContainer.appendChild(emptyCell.cloneNode());

    if (leftBtn || rightBtn) {
        if (leftBtn) buttonsContainer.appendChild(leftBtn);
        buttonsContainer.appendChild(emptyCell.cloneNode());
        if (rightBtn) buttonsContainer.appendChild(rightBtn);
    }

    if (downBtn) buttonsContainer.appendChild(emptyCell.cloneNode());
    if (downBtn) buttonsContainer.appendChild(downBtn);
    if (downBtn) buttonsContainer.appendChild(emptyCell.cloneNode());

    dialog.appendChild(buttonsContainer);
    modal.appendChild(dialog);
    document.body.appendChild(modal);


    setTimeout(() => {
        modal.style.opacity = '1';
        dialog.style.transform = 'scale(1)';
    }, 10);
}
