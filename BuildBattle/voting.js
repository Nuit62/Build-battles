var Room = require('pixel_combats/room');

// Переменные модуля
var votes = {};
var votedPlayers = [];
var isVotingActive = false;

// Запуск голосования
function startVoting(duration) {
    votes = {};
    votedPlayers = [];
    isVotingActive = true;
    
    Room.Ui.GetContext().Hint.Value = "Голосуйте: /Vote [RoomId] (Осталось " + duration + " сек)";
    Room.Chat.OnMessage.Add(onVoteCommand);
    
    new Room.Timer(duration, endVoting).Start();
}

// Обработка команды /Vote
function onVoteCommand(e) {
    if (!isVotingActive) return;
    
    var voter = Room.Players.GetByRoomId(e.Sender);
    var args = e.Text.trim().split(' ');
    
    if (args[0] !== "/Vote" || args.length < 2) return;
    
    var targetRoomId = parseInt(args[1]);
    
    // Проверки
    if (votedPlayers.indexOf(voter.IdInRoom) !== -1) {
        voter.Message("Вы уже голосовали!");
        return;
    }
    
    if (!Room.Players.GetByRoomId(targetRoomId)) {
        voter.Message("Игрок не найден!");
        return;
    }
    
    // Засчитываем голос
    votes[targetRoomId] = (votes[targetRoomId] || 0) + 1;
    votedPlayers.push(voter.IdInRoom);
    voter.Message("Голос за игрока " + targetRoomId + " учтён!");
}

// Завершение голосования
function endVoting() {
    isVotingActive = false;
    Room.Chat.OnMessage.Remove(onVoteCommand);
    
    // Определяем победителя
    var winnerRoomId = null;
    var maxVotes = 0;
    
    for (var roomId in votes) {
        if (votes.hasOwnProperty(roomId) && votes[roomId] > maxVotes) {
            maxVotes = votes[roomId];
            winnerRoomId = roomId;
        }
    }
    
    // Результаты
    if (winnerRoomId) {
        var winner = Room.Players.GetByRoomId(parseInt(winnerRoomId));
        var winnerMsg = "🏆 Победитель: Игрок " + winnerRoomId + " (" + maxVotes + " голосов)";
        Room.Players.All.forEach(function(p) {
            p.Message(winnerMsg);
        });
    }
}

// Получение очков игрока
function getPlayerScore(roomId) {
    return votes[roomId] || 0;
}

// Экспорт функций
module.exports = {
    startVoting: startVoting,
    getPlayerScore: getPlayerScore
};