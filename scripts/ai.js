/**
 * ai.js - AI implementation for Ahead by Eight game
 */

// AI difficulty levels
const AI_DIFFICULTY = {
    BEGINNER: 'beginner',
    ADVANCED: 'advanced'
};

// AIPlayer class for computer opponent
class AIPlayer {
    constructor(game, difficulty = AI_DIFFICULTY.BEGINNER) {
        this.game = game;
        this.difficulty = difficulty;
        this.isFirstTurn = true;
    }

    // Set difficulty level
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
    }

    // AI takes turn
    async takeTurn() {
        // 行動を返すPromiseを作成
        return new Promise(async (resolve, reject) => {
            try {
                // 考え中のメッセージを表示
                this.game.ui.showMessage('相手が考え中...', 'info');
                await this.delay(1000);

                // ギミック使用の判断
                const gimmickUsed = await this.considerUsingGimmick();
                if (gimmickUsed) {
                    await this.delay(1000);
                    this.game.ui.showMessage('相手がギミックを使用しました', 'info');
                }

                // カードを出すかスキップするかの判断
                const playableCards = this.getPlayableCards();
                const shouldSkip = this.shouldSkip(playableCards);

                if (shouldSkip) {
                    // スキップを選択
                    this.game.ui.showMessage('相手がパスを選択します...', 'info');
                    await this.delay(1000);
                    resolve({ action: 'skip' });
                    return;
                }

                // カード選択の判断
                const selectedCard = this.difficulty === AI_DIFFICULTY.BEGINNER
                    ? this.beginnerSelectCard(playableCards)
                    : this.advancedSelectCard(playableCards, this.game.opponentHand.cards);

                if (selectedCard) {
                    // 選択したカードを表示
                    this.game.ui.showMessage(`相手が${selectedCard.value}を出します...`, 'info');
                    await this.delay(1000);
                    resolve({ action: 'play', card: selectedCard });
                    return;
                }

                // カードが選択できない場合はスキップ
                this.game.ui.showMessage('相手がパスを選択します...', 'info');
                await this.delay(1000);
                resolve({ action: 'skip' });

            } catch (error) {
                console.error('AI decision error:', error);
                reject(error);
            }
        });
    }

    // 遅延を追加するヘルパーメソッド
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // プレイ可能なカードを取得
    getPlayableCards() {
        const hand = this.game.opponentHand.cards;
        let playableCards = [];

        if (this.game.field.cards.length === 0) {
            // フィールドが空の場合は全てのカードが使用可能
            playableCards = [...hand];
        } else {
            // フィールドの最強カードより強いカードをフィルタリング
            const highestFieldCard = this.game.field.getHighestCard();
            const highestFieldValue = highestFieldCard.effectiveValue !== undefined
                ? highestFieldCard.effectiveValue
                : highestFieldCard.value;

            for (const card of hand) {
                let effectiveValue = card.value;
                if (this.game.opponentPowerupCount > 0) {
                    effectiveValue += 1;
                }

                if (this.game.field.reversed) {
                    if (effectiveValue < highestFieldValue) {
                        playableCards.push(card);
                    }
                } else {
                    if (effectiveValue > highestFieldValue) {
                        playableCards.push(card);
                    }
                }
            }
        }

        // ブロックされたカードを除外
        if (this.game.opponentBlockedCardId) {
            playableCards = playableCards.filter(card => 
                card.id !== this.game.opponentBlockedCardId
            );
        }

        return playableCards;
    }

    // スキップするかどうかの判断
    shouldSkip(playableCards) {
        // プレイ可能なカードがない場合は必ずスキップ
        if (playableCards.length === 0) {
            return true;
        }

        // プレイヤーの手札が3枚以下の場合は必ずカードを出す
        const playerHandCount = this.game.playerHand.count;
        if (playerHandCount <= 3 && playableCards.length > 0) {
            return false;
        }

        // フィールドの状態を確認
        const fieldTotal = this.game.field.total;
        const handCount = this.game.opponentHand.count;

        // 上級AIの場合はより戦略的な判断
        if (this.difficulty === AI_DIFFICULTY.ADVANCED) {
            // フィールド合計が35点に近い場合の判断
            const isNear35 = fieldTotal >= 30 && fieldTotal <= 34;
            
            if (isNear35 && this.game.field.cards.length % 2 === 1) {
                return Math.random() < 0.7; // 70%の確率でスキップ
            }

            // 手札が少ない場合はスキップを避ける
            if (handCount <= 3) {
                return Math.random() < 0.2; // 20%の確率でスキップ
            }

            // 通常は低確率でスキップ
            return Math.random() < 0.15;
        }
        // 初級AIの場合はシンプルな判断
        else {
            // フィールド合計が高い場合のみスキップを考慮
            if (fieldTotal >= 25) {
                return Math.random() < 0.3; // 30%の確率でスキップ
            }
            return Math.random() < 0.05; // 5%の確率でスキップ
        }
    }

    // 初級AIのカード選択ロジック
    beginnerSelectCard(playableCards) {
        if (playableCards.length === 0) return null;

        // 初手の場合は1を出す
        if (this.game.field.cards.length === 0) {
            const cardOne = playableCards.find(card => card.value === 1);
            if (cardOne) return cardOne;
        }

        // 最も低い値のカードを選択
        return playableCards.reduce((lowest, card) => 
            card.value < lowest.value ? card : lowest,
            playableCards[0]
        );
    }

    // 上級AIのカード選択ロジック
    advancedSelectCard(playableCards, fullHand) {
        if (playableCards.length === 0) return null;

        // フィールドの状態を分析
        const fieldTotal = this.game.field.total;
        const isReversed = this.game.field.reversed;
        const playerHandCount = this.game.playerHand.count;

        // 手札の分析
        const highCards = playableCards.filter(card => card.value >= 6);
        const midCards = playableCards.filter(card => card.value >= 3 && card.value <= 5);
        const lowCards = playableCards.filter(card => card.value <= 2);

        // 勝利に近い場合
        if (fullHand.length <= 2) {
            return isReversed
                ? playableCards.reduce((lowest, card) => card.value < lowest.value ? card : lowest, playableCards[0])
                : playableCards.reduce((highest, card) => card.value > highest.value ? card : highest, playableCards[0]);
        }

        // フィールド合計が35に近い場合
        if (fieldTotal >= 30) {
            return lowCards.length > 0 ? lowCards[0] : playableCards[0];
        }

        // プレイヤーの手札が少ない場合
        if (playerHandCount <= 2) {
            return highCards.length > 0 ? highCards[0] : playableCards[0];
        }

        // 通常時は中間の値のカードを使用
        if (midCards.length > 0) {
            return midCards[Math.floor(Math.random() * midCards.length)];
        }

        // デフォルトは最も低い値のカードを使用
        return playableCards.reduce((lowest, card) => 
            card.value < lowest.value ? card : lowest,
            playableCards[0]
        );
    }

    // ギミック使用の判断
    async considerUsingGimmick() {
        const availableGimmicks = this.game.gimmickManager.opponentGimmicks.filter(g => !g.used);
        if (availableGimmicks.length === 0 || this.game.isGimmickActive) {
            return false;
        }

        // 初級AIはランダムにギミックを使用
        if (this.difficulty === AI_DIFFICULTY.BEGINNER) {
            if (Math.random() < 0.2) {
                const gimmick = availableGimmicks[Math.floor(Math.random() * availableGimmicks.length)];
                return this.game.gimmickManager.useGimmick(gimmick, false);
            }
            return false;
        }

        // 上級AIは状況に応じてギミックを使用
        const fieldTotal = this.game.field.total;
        const playerHandCount = this.game.playerHand.count;
        const ownHandCount = this.game.opponentHand.count;

        for (const gimmick of availableGimmicks) {
            switch (gimmick.type) {
                case 'reversal':
                    if (fieldTotal >= 25 || playerHandCount <= 2) {
                        return this.game.gimmickManager.useGimmick(gimmick, false);
                    }
                    break;
                case 'powerup':
                    if (ownHandCount <= 3 || fieldTotal >= 20) {
                        return this.game.gimmickManager.useGimmick(gimmick, false);
                    }
                    break;
                case 'recovery':
                    if (this.game.discardPile.length >= 3) {
                        return this.game.gimmickManager.useGimmick(gimmick, false);
                    }
                    break;
                case 'reset':
                    if (fieldTotal >= 30 || playerHandCount <= 2) {
                        return this.game.gimmickManager.useGimmick(gimmick, false);
                    }
                    break;
            }
        }

        return false;
    }
}

// Export classes
window.AIPlayer = AIPlayer;
window.AI_DIFFICULTY = AI_DIFFICULTY;
