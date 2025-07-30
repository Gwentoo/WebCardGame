const generateID = () => Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);


let socket = null;

async function loadInitialState() {
    try {
        const response = await fetch('/api/state');
        if (response.ok) {
            const state = await response.json();
            updateGameState(state);
        }
    } catch (error) {
        console.error('Ошибка загрузки состояния:', error);
    }
}

function updateGameState(state) {
    document.getElementById('attackValue').textContent = state.attack || 0;
    document.getElementById('defenseValue').textContent = state.defense || 0;
    const container = document.getElementById('playersContainer');
    container.innerHTML = '';
    if (state.players) {
        state.players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = `player-item ${player.role}`;
            playerItem.innerHTML = `
                ${player.role === 1 ? '⚔️' : '🛡️'}
                ${player.username}
            `;
            container.appendChild(playerItem);
        });
    }
}


document.addEventListener('DOMContentLoaded', () => {
    loadInitialState()

    document.getElementById('connectButton').addEventListener('click', connectToServer);
});

function startGame(){
    socket.send(JSON.stringify({type:'start'}));
}

function connectToServer(){

    const username = document.getElementById('usernameInput').value.trim();
    const role = document.getElementById('roleSelect').value;
    if (!username) {
        alert('Введите ник!');
        return;
    }

    if (socket) {
        socket.close();
    }

    const playerID = generateID();

    localStorage.setItem('playerID', playerID);

    socket = new WebSocket(
        `ws://192.168.0.102:8080/ws?playerID=${playerID}`
    );
    socket.onopen = () => {
        console.log('Соединение установлено');

        socket.send(JSON.stringify({
            type: 'join',
            username: username,
            role: role
        }));
        document.getElementById('connectButton').textContent = 'Подключено';
        document.getElementById('connectButton').disabled = true;
    };

    socket.onclose = () => {
        console.log('Соединение закрыто');
        document.getElementById('connectButton').textContent = 'Подключиться';
        document.getElementById('connectButton').disabled = false;
    };

    socket.onerror = (error) => {
        console.error('Ошибка WebSocket:', error);
        alert('Ошибка подключения к серверу');
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Получено сообщение:', data);

        // Обработка разных типов сообщений от сервера
        switch(data.type) {
            case 'lobby':
                updateStats(data.attack, data.defense);
                updatePlayersList(data.players);
                break;
            case 'navigate':

                window.location.href = `${data.page}?playerID=${playerID}`;
                break;
            case 'error':
                alert(data.text)
                break;

        }
    };
}

function updatePlayersList(players) {
    const container = document.getElementById('playersContainer');
    container.innerHTML = '';

    players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = `player-item ${player.role}`;

        playerItem.innerHTML = `
            ${player.role === 1 ? '⚔️' : '🛡️'}
            ${player.username}
        `;
        container.appendChild(playerItem);
    });
}

function updateStats(attack, defense) {
    document.getElementById('attackValue').textContent = attack;
    document.getElementById('defenseValue').textContent = defense;
}

