import { Players, Chat, Ui } from 'pixel_combats/room';

// Переменные модуля
let votes = {};         // { [targetRoomId]: количество голосов }
let votedPlayers = [];   // Игроки, которые уже проголосовали
let isVotingActive = false;

// Запуск голосования
export function startVoting(duration) {
    votes = {};
    votedPlayers = [];
    isVotingActive = true;
    
    Ui.GetContext().Hint.Value = `Голосуйте: /Vote [RoomId] (Осталось ${duration} сек)`;
    
    // Обработчик команд чата
    Chat.OnMessage.Add(onVoteCommand);
    
    // Таймер завершения голосования
    new Timer(duration, () => {
        endVoting();
    }).Start();
}

// Обработка команды /Vote
function onVoteCommand(e) {
    if (!isVotingActive) return;
    
    const voter = Players.GetByRoomId(e.Sender);
    const args = e.Text.trim().split(' ');
    
    if (args[0] !== "/Vote" || args.length < 2) return;
    
    const targetRoomId = parseInt(args[1]);
    
    // Проверки
    if (votedPlayers.includes(e.Sender)) {
        voter.Message("Вы уже голосовали!");
        return;
    }
    
    if (!Players.GetByRoomId(targetRoomId)) {
        voter.Message("Игрок не найден!");
        return;
    }
    
    // Засчитываем голос
    votes[targetRoomId] = (votes[targetRoomId] || 0) + 1;
    votedPlayers.push(e.Sender);
    voter.Message(`Голос за игрока ${targetRoomId} учтён!`);
}

// Завершение голосования
function endVoting() {
    isVotingActive = false;
    Chat.OnMessage.Remove(onVoteCommand);
    
    // Определяем победителя
    let winnerRoomId = null;
    let maxVotes = 0;
    
    for (const [roomId, count] of Object.entries(votes)) {
        if (count > maxVotes) {
            maxVotes = count;
            winnerRoomId = roomId;
        }
    }
    
    // Результаты
    if (winnerRoomId) {
        const winner = Players.GetByRoomId(parseInt(winnerRoomId));
        Players.All.forEach(p => {
            p.Message(`🏆 Победитель: Игрок ${winnerRoomId} (${maxVotes} голосов)`);
        });
    } else {
        Players.All.forEach(p => {
            p.Message("Никто не получил голосов :(");
        });
    }
}

// Получение очков игрока (для лидерборда)
export function getPlayerScore(roomId) {
    return votes[roomId] || 0;
}