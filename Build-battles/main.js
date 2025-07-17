
import { Ui, Players, Timer, Build, Properties } from 'pixel_combats/room';
import * as Voting from './voting.js'; // Импорт модуля голосования

// Константы
const BUILD_TIME = 60; // Время строительства в секундах
const VOTE_TIME = 30;  // Время голосования в секундах

// Инициализация режима
export function init() {
    // Настройки
    Properties.GetContext().GameModeName.Value = "Битва строителей";
    Build.GetContext().BlocksSet.Value = BuildBlocksSet.AllClear;
    
    // Запуск фазы строительства
    startBuildPhase();
}

function startBuildPhase() {
    Ui.GetContext().Hint.Value = `Стройте! Осталось ${BUILD_TIME} сек.`;
    
    // Таймер завершения строительства
    new Timer(BUILD_TIME, () => {
        Build.GetContext().BlocksSet.Value = BuildBlocksSet.None; // Отключаем строительство
        Voting.startVoting(VOTE_TIME); // Запускаем голосование
    }).Start();
}

// Обновление лидерборда
function updateLeaderboard() {
    Players.All.forEach(player => {
        player.Properties.Scores.Value = Voting.getPlayerScore(player.IdInRoom);
    });
}