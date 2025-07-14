/**
 * ranking.js - アカウントシステムと連携したランキングシステム
 */

// ランキング階級とポイント
const RANKING_TIERS = {
    BRONZE: { name: 'ブロンズ', minPoints: 0, maxPoints: 1499 },
    SILVER: { name: 'シルバー', minPoints: 1500, maxPoints: 2499 },
    GOLD: { name: 'ゴールド', minPoints: 2500, maxPoints: 3499 },
    PLATINUM: { name: 'プラチナ', minPoints: 3500, maxPoints: 4499 },
    DIAMOND: { name: 'ダイヤモンド', minPoints: 4500, maxPoints: 5999 },
    MASTER: { name: 'マスター', minPoints: 6000, maxPoints: 99999 }
};

// グローバルランキング用のプレイヤーデータ
const GLOBAL_PLAYERS = [
    { name: 'CardMaster99', points: 5420, country: '🇯🇵', accountNumber: 'a1b2c3d4e5f6g7h8i9j0' },
    { name: 'NumberKing', points: 4980, country: '🇺🇸', accountNumber: 'k1l2m3n4o5p6q7r8s9t0' },
    { name: 'AheadMaster', points: 4750, country: '🇬🇧', accountNumber: 'u1v2w3x4y5z6a7b8c9d0' },
    // ... 他のプレイヤーデータ ...
];

class RankingSystem {
    constructor() {
        this.accountManager = new AccountManager();
        this.playerData = this.loadPlayerData();
        this.globalRankings = this.generateGlobalRankings();
        this.isSearching = false;
        this.searchTimer = null;
        this.searchTime = 0;
    }

    // アカウントに基づいてプレイヤーデータを読み込む
    loadPlayerData() {
        if (!this.accountManager.isLoggedIn()) {
            return {
                name: '未登録プレイヤー',
                points: 0,
                wins: 0,
                losses: 0,
                winStreak: 0,
                country: '🇯🇵'
            };
        }

        const account = this.accountManager.getAccountInfo();
        return {
            name: account.email.split('@')[0],
            points: account.rankingPoints || 0,
            wins: account.matchHistory.filter(m => m.result === 'win').length,
            losses: account.matchHistory.filter(m => m.result === 'lose').length,
            winStreak: this.calculateWinStreak(account.matchHistory),
            country: '🇯🇵',
            accountNumber: account.accountNumber
        };
    }

    // 連勝数を計算
    calculateWinStreak(history) {
        let streak = 0;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].result === 'win') {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    // グローバルランキングを生成
    generateGlobalRankings() {
        const allPlayers = [...GLOBAL_PLAYERS];

        // ログイン中のプレイヤーを追加
        if (this.accountManager.isLoggedIn()) {
            allPlayers.push({
                ...this.playerData,
                isPlayer: true
            });
        }

        // ポイントでソート
        return allPlayers.sort((a, b) => b.points - a.points);
    }

    // プレイヤーの階級を取得
    getPlayerTier() {
        const points = this.playerData.points;

        for (const [key, tier] of Object.entries(RANKING_TIERS)) {
            if (points >= tier.minPoints && points <= tier.maxPoints) {
                const tierRange = tier.maxPoints - tier.minPoints;
                const tierProgress = points - tier.minPoints;
                const subTier = Math.min(3, Math.floor((tierProgress / tierRange) * 3) + 1);
                const romanNumerals = ['I', 'II', 'III'];
                
                return `${tier.name} ${romanNumerals[subTier - 1]}`;
            }
        }

        return 'ブロンズ I';
    }

    // マッチメイキングを開始
    startMatchmaking(callback) {
        if (!this.accountManager.isLoggedIn()) {
            showRegistrationForm();
            return;
        }

        if (this.isSearching) return;

        this.isSearching = true;
        this.searchTime = 0;

        // UI更新
        document.getElementById('waiting-overlay').style.display = 'flex';

        // タイマー更新
        this.searchTimer = setInterval(() => {
            this.searchTime++;
            const minutes = Math.floor(this.searchTime / 60);
            const seconds = this.searchTime % 60;
            document.getElementById('waiting-time').textContent = 
                `待機時間: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);

        // 対戦相手を探す（3-10秒のシミュレーション）
        const matchTime = 3000 + Math.random() * 7000;
        setTimeout(() => {
            if (this.isSearching) {
                this.stopMatchmaking();
                const opponent = this.findOpponent();
                if (callback) callback(opponent);
            }
        }, matchTime);
    }

    // マッチメイキングを停止
    stopMatchmaking() {
        this.isSearching = false;
        if (this.searchTimer) {
            clearInterval(this.searchTimer);
            this.searchTimer = null;
        }
        document.getElementById('waiting-overlay').style.display = 'none';
    }

    // 対戦相手を探す
    findOpponent() {
        const playerPoints = this.playerData.points;
        const pointRange = 500; // 500ポイント以内のプレイヤーとマッチング

        // 適切な対戦相手をフィルタリング
        const suitableOpponents = GLOBAL_PLAYERS.filter(player => {
            if (player.accountNumber === this.playerData.accountNumber) return false;
            const pointDiff = Math.abs(player.points - playerPoints);
            return pointDiff <= pointRange;
        });

        // 適切な対戦相手がいない場合はランダム
        if (suitableOpponents.length === 0) {
            return GLOBAL_PLAYERS[Math.floor(Math.random() * GLOBAL_PLAYERS.length)];
        }

        return suitableOpponents[Math.floor(Math.random() * suitableOpponents.length)];
    }

    // 対戦結果を記録
    recordMatchResult(won, opponent) {
        if (!this.accountManager.isLoggedIn()) {
            console.warn('ログインしていないため、対戦結果を記録できません');
            return 0;
        }

        // ポイント変動を計算
        const opponentPoints = opponent.points || 1250;
        const playerPoints = this.playerData.points;
        const pointDiff = opponentPoints - playerPoints;
        
        let pointsChange;
        if (won) {
            pointsChange = Math.floor(20 + Math.max(0, pointDiff / 100));
            pointsChange = Math.min(50, Math.max(10, pointsChange));
        } else {
            pointsChange = -Math.floor(15 + Math.max(0, -pointDiff / 100));
            pointsChange = Math.max(-30, Math.min(-5, pointsChange));
        }

        // アカウントデータを更新
        const account = this.accountManager.getAccountInfo();
        account.rankingPoints = Math.max(0, (account.rankingPoints || 0) + pointsChange);

        // 対戦履歴を追加
        const matchData = {
            result: won ? 'win' : 'lose',
            opponent: opponent.name,
            points: pointsChange,
            timestamp: new Date().toISOString()
        };

        this.accountManager.addMatchHistory(matchData);

        // データを更新
        this.playerData = this.loadPlayerData();
        this.globalRankings = this.generateGlobalRankings();

        return pointsChange;
    }

    // UI更新
    updateUI() {
        if (!this.accountManager.isLoggedIn()) {
            document.getElementById('player-name').textContent = '未登録プレイヤー';
            document.getElementById('player-rank').textContent = '-';
            document.getElementById('player-points').textContent = '0';
            return;
        }

        // プレイヤー情報を更新
        document.getElementById('player-name').textContent = this.playerData.name;
        document.getElementById('player-rank').textContent = this.getPlayerTier();
        document.getElementById('player-points').textContent = this.playerData.points;

        // ランキングリストを更新
        this.updateRankingList('global-ranking', this.globalRankings);

        // 対戦履歴を更新
        this.updateMatchHistory();
    }

    // ランキングリストを更新
    updateRankingList(containerId, rankings) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        rankings.forEach((player, index) => {
            const item = document.createElement('div');
            item.className = 'ranking-item';
            if (player.isPlayer) item.classList.add('you');

            const rank = document.createElement('div');
            rank.className = `rank ${index < 3 ? `top-${index + 1}` : ''}`;
            rank.textContent = index + 1;

            const name = document.createElement('div');
            name.className = 'player-name';
            name.textContent = `${player.country || ''} ${player.isPlayer ? 'あなた' : player.name}`;

            const points = document.createElement('div');
            points.className = 'points';
            points.textContent = `${player.points}pt`;

            item.appendChild(rank);
            item.appendChild(name);
            item.appendChild(points);
            container.appendChild(item);
        });
    }

    // 対戦履歴を更新
    updateMatchHistory() {
        const container = document.getElementById('match-history');
        if (!container) return;

        container.innerHTML = '';

        const account = this.accountManager.getAccountInfo();
        if (!account || !account.matchHistory || account.matchHistory.length === 0) {
            container.innerHTML = '<div class="empty-history">対戦履歴がありません</div>';
            return;
        }

        account.matchHistory.slice(0, 10).forEach(match => {
            const item = document.createElement('div');
            item.className = 'history-item';

            const result = document.createElement('div');
            result.className = `history-result ${match.result}`;
            result.textContent = match.result === 'win' ? '勝利' : '敗北';

            const opponent = document.createElement('div');
            opponent.className = 'history-opponent';
            opponent.textContent = `vs ${match.opponent}`;

            const points = document.createElement('div');
            points.className = 'history-points';
            points.textContent = `${match.points > 0 ? '+' : ''}${match.points}pt`;

            item.appendChild(result);
            item.appendChild(opponent);
            item.appendChild(points);
            container.appendChild(item);
        });
    }
}

// ランキングシステムを初期化
let rankingSystem;

document.addEventListener('DOMContentLoaded', () => {
    rankingSystem = new RankingSystem();
    rankingSystem.updateUI();

    // マッチング開始ボタン
    const startButton = document.getElementById('start-ranking-match');
    if (startButton) {
        startButton.addEventListener('click', () => {
            rankingSystem.startMatchmaking((opponent) => {
                sessionStorage.setItem('rankingOpponent', JSON.stringify(opponent));
                sessionStorage.setItem('isRankingMatch', 'true');
                window.location.href = 'GamePage.html?mode=ranking';
            });
        });
    }

    // マッチングキャンセルボタン
    const cancelButton = document.getElementById('cancel-matchmaking');
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            rankingSystem.stopMatchmaking();
        });
    }
});
