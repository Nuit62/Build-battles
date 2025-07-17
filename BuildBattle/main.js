// Имитация импортов через глобальные объекты
var Basic = require('pixel_combats/basic');
var Room = require('pixel_combats/room');

// Константы
var BUILD_TIME = 60;
var VOTE_TIME = 30;
var VOTE_REWARD = 1;
var KIK_THRESHOLD = 3;

// Состояния игры
var STATE_BUILD = "Сборка";
var STATE_VOTE = "Голосование";
var STATE_END = "Конец";

// Переменные
var currentState = STATE_BUILD;
var votes = {};
var kikVotes = {};
var votedPlayers = [];
var scores = {};

// Основная функция инициализации
function init() {
    // Настройки
    Room.Properties.GetContext().GameModeName.Value = "Битва строителей";
    Room.Damage.GetContext().DamageOut.Value = false;
    Room.Spawns.GetContext().RespawnTime.Value = 0;

    // Создаем команду
    var team = Room.Teams.Add("Builders", "Строители", new Basic.Color(0.5, 0.5, 0.5, 0));
    team.Spawns.SpawnPointsGroups.Add(1);

    // Лидерборд
    Room.LeaderBoard.PlayerLeaderBoardValues = [
        { Value: "Scores", DisplayName: "Очки", ShortDisplayName: "🏆" },
        { Value: "Votes", DisplayName: "Голоса", ShortDisplayName: "👍" }
    ];

    // Обработчик чата
    Room.Chat.OnMessage.Add(onChatMessage);

    // Запуск таймера
    new Room.Timer(BUILD_TIME, startVoting).Start();
    updateGameState(STATE_BUILD);
}

function updateGameState(state) {
    currentState = state;
    Room.Ui.GetContext().Hint.Value = getStateHint(state);
    
    if (state === STATE_BUILD) {
        Room.Build.GetContext().BlocksSet.Value = Room.BuildBlocksSet.AllClear;
    } else if (state === STATE_VOTE) {
        Room.Build.GetContext().BlocksSet.Value = Room.BuildBlocksSet.None;
    }
}

function getStateHint(state) {
    if (state === STATE_BUILD) {
        return "Стройте! Осталось " + BUILD_TIME + " сек.\nКик: /Kik [RoomId] (нужно " + KIK_THRESHOLD + " голоса)";
    } else if (state === STATE_VOTE) {
        return "Голосуйте за постройку: /Vote [RoomId]\nОсталось " + VOTE_TIME + " сек.";
    }
    return "";
}

// Обработчик команд чата
function onChatMessage(e) {
    if (currentState !== STATE_VOTE) return;
    
    var player = Room.Players.GetByRoomId(e.Sender);
    var text = e.Text.trim();
    
    if (text.indexOf("/Vote ") === 0) {
        handleBuildVote(player, text);
    }
}

// Обработка голоса за постройку
function handleBuildVote(voter, command) {
    if (votedPlayers.indexOf(voter.IdInRoom) !== -1) {
        voter.Message("Вы уже голосовали!");
        return;
    }
    
    var targetRoomId = parseInt(command.split(" ")[1]);
    if (!Room.Players.GetByRoomId(targetRoomId)) {
        voter.Message("Игрока с таким RoomId нет!");
        return;
    }
    
    votes[targetRoomId] = (votes[targetRoomId] || 0) + 1;
    votedPlayers.push(voter.IdInRoom);
    voter.Message("Ваш голос за игрока " + targetRoomId + " учтен!");
}

// Запуск голосования
function startVoting() {
    updateGameState(STATE_VOTE);
    votes = {};
    votedPlayers = [];
    new Room.Timer(VOTE_TIME, endVoting).Start();
}

// Завершение голосования
function endVoting() {
    updateGameState(STATE_END);
    
    // Начисление очков
    for (var roomId in votes) {
        if (votes.hasOwnProperty(roomId)) {
            var player = Room.Players.GetByRoomId(parseInt(roomId));
            if (player) {
                player.Properties.Scores.Value += votes[roomId] * VOTE_REWARD;
            }
        }
    }
    
    // Определение победителя
    var winnerRoomId = null;
    var maxVotes = 0;
    
    for (var id in votes) {
        if (votes[id] > maxVotes) {
            maxVotes = votes[id];
            winnerRoomId = id;
        }
    }
    
    // Сообщение о победителе
    if (winnerRoomId) {
        var winner = Room.Players.GetByRoomId(parseInt(winnerRoomId));
        var winnerMessage = "🏆 Победитель: Игрок " + winnerRoomId + " (" + maxVotes + " голосов)!";
        Room.Players.All.forEach(function(p) {
            p.Message(winnerMessage);
        });
    }
    
    // Перезапуск игры
    new Room.Timer(10, resetGame).Start();
}

// Сброс игры
function resetGame() {
    Room.Build.GetContext().ClearAll();
    Room.Players.All.forEach(function(p) {
        p.Properties.Votes.Value = 0;
        p.Spawns.Spawn();
    });
    new Room.Timer(BUILD_TIME, startVoting).Start();
    updateGameState(STATE_BUILD);
}

// Экспорт функции init
module.exports = { init: init };