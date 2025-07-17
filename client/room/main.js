import { Color, Timer } from 'pixel_combats/basic';
import { Teams, GameMode, Players, Properties, LeaderBoard, Ui, Spawns, Damage, Build, Chat } from 'pixel_combats/room';

// Константы
const BUILD_TIME = 60;
const VOTE_TIME = 30;
const VOTE_REWARD = 1;
const KIK_THRESHOLD = 3; // Необходимое количество голосов для кика

// Состояния игры
const STATE_BUILD = "Build";
const STATE_VOTE = "Vote";
const STATE_END = "End";

// Переменные
let currentState = STATE_BUILD;
let votes = {};          // Голоса за постройки { [RoomId]: count }
let kikVotes = {};       // Голоса за кик { [RoomId]: Set(voterRoomIds) }
let votedPlayers = new Set();
let scores = {};

// Инициализация режима
export function init() {
    Properties.GetContext().GameModeName.Value = "Битва строителей";
    Damage.GetContext().DamageOut.Value = false;
    Spawns.GetContext().RespawnTime.Value = 0;

    const team = Teams.Add("Builders", "Строители", new Color(0.5, 0.5, 0.5, 0));
    team.Spawns.SpawnPointsGroups.Add(1);

    LeaderBoard.PlayerLeaderBoardValues = [
        { Value: "Scores", DisplayName: "Очки", ShortDisplayName: "🏆" },
        { Value: "Votes", DisplayName: "Голоса", ShortDisplayName: "👍" },
        { Value: "KikVotes", DisplayName: "Кик-голоса", ShortDisplayName: "⚠️" }
    ];

    Chat.OnMessage.Add(onChatMessage);
    new Timer(BUILD_TIME, startVoting).Start();
    updateGameState(STATE_BUILD);
}

function updateGameState(state) {
    currentState = state;
    Ui.GetContext().Hint.Value = getStateHint(state);
    Build.GetContext().BlocksSet.Value = (state === STATE_BUILD) ? BuildBlocksSet.AllClear : BuildBlocksSet.None;
}

function getStateHint(state) {
    switch (state) {
        case STATE_BUILD:
            return `Стройте! Осталось ${BUILD_TIME} сек.\nКик: /Kik [RoomId] (нужно ${KIK_THRESHOLD} голоса)`;
        case STATE_VOTE:
            return `Голосуйте за постройку: /Vote [RoomId]\nОсталось ${VOTE_TIME} сек.`;
        default:
            return "";
    }
}

// Обработчик команд чата
function onChatMessage(e) {
    const player = Players.GetByRoomId(e.Sender);
    const text = e.Text.trim();

    // Голосование за кик (работает в любой фазе)
    if (text.startsWith("/Kik ")) {
        handleKikVote(player, text);
        return;
    }

    // Голосование за постройку (только в фазе VOTE)
    if (currentState === STATE_VOTE && text.startsWith("/Vote ")) {
        handleBuildVote(player, text);
    }
}

// Обработка голоса за кик
function handleKikVote(voter, command) {
    const targetRoomId = parseInt(command.split(" ")[1]);

    if (isNaN(targetRoomId)) {
        voter.Message("Ошибка: укажите RoomId (например, /Kik 2)");
        return;
    }

    const target = Players.GetByRoomId(targetRoomId);
    if (!target) {
        voter.Message("Игрока с таким RoomId нет!");
        return;
    }

    if (voter.IdInRoom === targetRoomId) {
        voter.Message("Нельзя голосовать против себя!");
        return;
    }

    // Инициализация Set для голосов за игрока
    if (!kikVotes[targetRoomId]) {
        kikVotes[targetRoomId] = new Set();
    }

    // Добавляем голос
    kikVotes[targetRoomId].add(voter.IdInRoom);
    const votesCount = kikVotes[targetRoomId].size;

    voter.Message(`Ваш голос против ${targetRoomId} учтен (${votesCount}/${KIK_THRESHOLD})`);
    target.Message(`⚠️ Игрок ${voter.IdInRoom} голосует за ваш кик! (${votesCount}/${KIK_THRESHOLD})`);

    // Проверка на кик
    if (votesCount >= KIK_THRESHOLD) {
        target.Spawns.Despawn();
        target.Message("Вас исключили по голосованию!");
        Players.All.forEach(p => p.Message(`Игрок ${targetRoomId} исключен!`));
        delete kikVotes[targetRoomId];
    }
}

// Обработка голоса за постройку (прежний handleBuildVote)
function handleBuildVote(voter, command) {
    if (votedPlayers.has(voter.IdInRoom)) {
        voter.Message("Вы уже голосовали!");
        return;
    }

    const targetRoomId = parseInt(command.split(" ")[1]);
    if (!Players.GetByRoomId(targetRoomId)) {
        voter.Message("Игрока с таким RoomId нет!");
        return;
    }

    votes[targetRoomId] = (votes[targetRoomId] || 0) + 1;
    votedPlayers.add(voter.IdInRoom);
    voter.Message(`Ваш голос за игрока ${targetRoomId} учтен!`);
}

// Запуск голосования за постройки
function startVoting() {
    updateGameState(STATE_VOTE);
    votes = {};
    votedPlayers.clear();
    new Timer(VOTE_TIME, endVoting).Start();
}

// Завершение раунда
function endVoting() {
    updateGameState(STATE_END);

    // Начисление очков за постройки
    for (const [roomId, count] of Object.entries(votes)) {
        const player = Players.GetByRoomId(parseInt(roomId));
        if (player) {
            player.Properties.Scores.Value += count * VOTE_REWARD;
            player.Properties.Votes.Value = count;
        }
    }

    // Определение победителя
    const winnerRoomId = Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b, null);
    if (winnerRoomId) {
        const winner = Players.GetByRoomId(parseInt(winnerRoomId));
        const msg = `🏆 Победитель: Игрок ${winnerRoomId} (${votes[winnerRoomId]} голосов)!`;
        Players.All.forEach(p => p.Message(msg));
    }

    new Timer(10, resetGame).Start();
}

// Сброс игры
function resetGame() {
    Build.GetContext().ClearAll();
    Players.All.forEach(p => {
        p.Properties.Votes.Value = 0;
        p.Properties.KikVotes.Value = 0;
        p.Spawns.Spawn(); // Возвращаем всех исключенных игроков
    });
    kikVotes = {};
    new Timer(BUILD_TIME, startVoting).Start();
    updateGameState(STATE_BUILD);
}
