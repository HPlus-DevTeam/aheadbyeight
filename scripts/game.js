/**
 * game.js - Core game logic for Ahead by Eight
 */

// Main Game class
class Game {
    constructor() {
        this.deck = new Deck();
        this.playerHand = new Hand();
        this.opponentHand = new Hand();
        this.field = new Field();
        this.discardPile = [];
        
        // Game state
        this.isPlayerTurn = true;
        this.playerScore = 0;
        this.opponentScore = 0;
        this.gameActive = false;
        this.turnNumber = 0;
        this.monitorPlayerEmptyHand = false; // プレイヤーの手札が空になったかを監視
        this.monitorOpponentEmptyHand = false; // 相手の手札が空になったかを監視
        this.aiTurnInProgress = false; // AI行動中フラグ
        this.isProcessingTurnEnd = false; // ターン終了処理中フラグ（重複処理防止）
        
        // Timer
        this.turnTimeLimit = 15; // Initial time limit
        this.currentTime = this.turnTimeLimit;
        this.timerInterval = null;
        this.timeoutMode = 0; // 0: 15s, 1: 10s, 2: 5s
        
        // Gimmick effects
        this.isGimmickActive = false;
        this.playerPowerupCount = 0;
        this.opponentPowerupCount = 0;
        this.playerHasRevivalGimmick = false;
        this.opponentHasRevivalGimmick = false;
        this.playerBlockedCardId = null;
        this.opponentBlockedCardId = null;
        this.isResetCoinActive = false; // Flag to prevent scoring when reset coin is used
        
        // Initialize systems
        this.ui = new GameUI(this);
        this.gimmickManager = new GimmickManager(this);
        this.ai = new AIPlayer(this, AI_DIFFICULTY.BEGINNER);
        
        // Start the welcome screen
        this.ui.showWelcomeScreen();
    }

    // Set AI difficulty level
    setDifficulty(difficulty) {
        this.ai.setDifficulty(difficulty);
    }

    // Initialize and start a new game
    async startGame() {
        // Reset game state
        this.resetGameState();
        
        // Create one full set of cards (1-8) for each player instead of random cards
        for (let i = 1; i <= 8; i++) {
            this.playerHand.addCard(new Card(i));
            this.opponentHand.addCard(new Card(i));
        }
        
        // Let player select gimmicks
        await this.gimmickManager.selectPlayerGimmicks(2);
        this.gimmickManager.selectAIGimmicks(2);
        this.gimmickManager.renderPlayerGimmicks();
        
        // Determine who goes first (random)
        this.isPlayerTurn = Math.random() < 0.5;
        
        // Render initial game state
        this.updateGameState();
        
        // Start the game
        this.gameActive = true;
        this.startTurn();
        
        this.ui.showMessage('ゲームスタート！', 'info');
    }

    // Start a player's turn
    startTurn() {
        this.turnNumber++;
        console.log('Starting turn', this.turnNumber, 'Player turn:', this.isPlayerTurn);
        
        // Reset timer based on timeout mode
        clearInterval(this.timerInterval);
        switch(this.timeoutMode) {
            case 0: this.turnTimeLimit = 15; break;
            case 1: this.turnTimeLimit = 10; break;
            case 2: this.turnTimeLimit = 5; break;
        }
        this.currentTime = this.turnTimeLimit;
        this.ui.updateTimer(this.currentTime);
        
        // Update UI to show whose turn it is
        this.ui.updateTurnIndicator();
        
        // Check if the current player has any playable cards
        const isPlayer = this.isPlayerTurn;
        const hasPlayableCards = this.hasPlayableCards(isPlayer);
        
        // Start timer for both players
        this.timerInterval = setInterval(() => {
            this.currentTime--;
            this.ui.updateTimer(this.currentTime);
            
            if (this.currentTime <= 0) {
                clearInterval(this.timerInterval);
                
                // Time's up - adjust timer and force move
                if (this.timeoutMode < 2) {
                    // Reduce time limit: 15s -> 10s -> 5s
                    this.timeoutMode++;
                }

                if (this.isPlayerTurn) {
                    this.ui.showMessage('時間切れ！自動的にパスします。', 'warning');
                    this.handleSkip(true);
                } else {
                    console.log('CPU timeout - forcing a move');
                    this.handleAITimeout();
                }
            }
        }, 1000);
        
        // For the player's turn
        if (isPlayer) {
            // Check if player has unused gimmicks
            const hasUnusedGimmicks = this.gimmickManager.playerGimmicks.some(g => !g.used);
            
            // If no playable cards and no unused gimmicks, automatically skip
            if (!hasPlayableCards && !hasUnusedGimmicks) {
                this.ui.showMessage(`あなたは出せるカードがありません。`, 'info');
                setTimeout(() => {
                    if (this.gameActive) {
                        this.handleSkip(isPlayer);
                    }
                }, 1000);
                return;
            } 
            // If no playable cards but has unused gimmicks, prompt player to use them
            else if (!hasPlayableCards && hasUnusedGimmicks) {
                this.ui.showMessage(`出せるカードがありません。ギミックコインを使うか、パスしてください。`, 'info');
            }
        } 
        // For AI's turn
        else if (!isPlayer) {
            // AIが既に行動中の場合は重複実行を防ぐ
            if (this.aiTurnInProgress) {
                console.log('AI turn already in progress, ignoring duplicate call');
                return;
            }
            
            this.aiTurnInProgress = true;
            
            // プレイヤーにAIの「考え中」を視覚的に伝える
            this.ui.showMessage('相手が考え中...', 'info');
            
            // AI will make its decision within the AI class
            console.log('CPU turn: Starting AI decision process');
            
            // AIの行動を段階的に実行
            const executeAITurn = async () => {
                if (!this.gameActive || !this.aiTurnInProgress) {
                    this.aiTurnInProgress = false;
                    return;
                }

                try {
                    // 考え中の表示
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    if (!this.gameActive || !this.aiTurnInProgress) {
                        this.aiTurnInProgress = false;
                        return;
                    }

                    // AIの意思決定
                    const decision = await this.ai.takeTurn();
                    
                    if (!this.gameActive || !this.aiTurnInProgress) {
                        this.aiTurnInProgress = false;
                        return;
                    }
                    
                    // 決定内容を表示
                    if (decision.action === 'play') {
                        this.ui.showMessage(`相手が${decision.card.value}を出します...`, 'info');
                    } else if (decision.action === 'skip') {
                        this.ui.showMessage('相手がパスを選択します...', 'info');
                    }
                    
                    // 行動前の待機
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    if (!this.gameActive || !this.aiTurnInProgress) {
                        this.aiTurnInProgress = false;
                        return;
                    }
                    
                    // AIターンフラグをクリア
                    this.aiTurnInProgress = false;
                    
                    // 行動を実行
                    if (decision.action === 'play') {
                        this.playCard(decision.card, false);
                    } else if (decision.action === 'skip') {
                        this.handleSkip(false);
                    }
                    
                } catch (error) {
                    console.error('AI takeTurn error:', error);
                    this.aiTurnInProgress = false;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    if (this.gameActive) {
                        this.handleAITimeout();
                    }
                }
            };

            executeAITurn();
        }
    }

    // Handle AI timeout with smarter decision logic
    handleAITimeout() {
        // CPUが時間切れになった場合、より賢く判断する
        const hand = this.opponentHand.cards;
        
        // 1. プレイ可能なカードがあるかチェック
        let playableCards = [];
        
        if (this.field.cards.length === 0) {
            // フィールドが空ならすべてのカードがプレイ可能
            playableCards = [...hand];
        } else {
            // 場の最高カードより強いカードを探す
            const highestFieldCard = this.field.getHighestCard();
            const highestFieldValue = highestFieldCard.effectiveValue !== undefined ? 
                highestFieldCard.effectiveValue : highestFieldCard.value;
            const isReversed = this.field.reversed;
            
            for (const card of hand) {
                if ((isReversed && card.value < highestFieldValue) || 
                    (!isReversed && card.value > highestFieldValue)) {
                    playableCards.push(card);
                }
            }
        }
        
        // 2. 戦略的な判断
        const fieldTotal = this.field.total || 0;
        const isOver13 = fieldTotal > 13;
        const shouldForcePlay = isOver13 && this.field.cards.length % 2 === 0;
        const shouldSkip = fieldTotal >= 16 && !shouldForcePlay && playableCards.length < hand.length;
        
        // 3. 最適な行動を選択
        if (playableCards.length > 0 && (!shouldSkip || shouldForcePlay)) {
            // プレイ可能なカードがあり、スキップすべきでない場合
            // 最適なカードを選択
            let bestCard;
            
            if (this.field.reversed) {
                // 逆転モードでは低い値が強い
                bestCard = playableCards.reduce((lowest, card) => 
                    card.value < lowest.value ? card : lowest, playableCards[0]);
            } else {
                // 通常モードでは高い値が強い
                bestCard = playableCards.reduce((highest, card) => 
                    card.value > highest.value ? card : highest, playableCards[0]);
            }
            
            this.playCard(bestCard, false);
        } else {
            // スキップが有利な状況またはプレイ可能なカードがない場合
            this.handleSkip(false);
        }
    }

    // End current turn and start next one
    endTurn() {
        // Clear timer
        clearInterval(this.timerInterval);
        
        // Switch turns
        this.isPlayerTurn = !this.isPlayerTurn;
        
        // Clean up any one-turn effects
        if (this.playerBlockedCardId && this.isPlayerTurn) {
            this.playerBlockedCardId = null; // Clear blocked card for player's new turn
        }
        if (this.opponentBlockedCardId && !this.isPlayerTurn) {
            this.opponentBlockedCardId = null; // Clear blocked card for opponent's new turn
        }
        
        // Start next turn
        if (this.gameActive) {
            this.startTurn();
        }
    }

    // Player/AI plays a card
    playCard(card, isPlayer) {
        console.log((isPlayer ? 'Player' : 'CPU') + ' is playing card:', card.value);
        
        // Remove card from hand
        const hand = isPlayer ? this.playerHand : this.opponentHand;
        hand.removeCard(card.id);
        
        // Create a copy with the original value for playing
        const originalValue = card.value;
        let effectiveValue = originalValue;
        
        // Apply power-up effect if active
        if ((isPlayer && this.playerPowerupCount > 0) || 
            (!isPlayer && this.opponentPowerupCount > 0)) {
            // Apply +1 boost
            effectiveValue = originalValue + 1;
            
            // Decrease counter
            if (isPlayer) {
                this.playerPowerupCount--;
                // Hide active gimmick display if powerup is finished
                if (this.playerPowerupCount === 0) {
                    this.gimmickManager.hideActiveGimmick();
                }
            } else {
                this.opponentPowerupCount--;
                // Hide active gimmick display if powerup is finished
                if (this.opponentPowerupCount === 0) {
                    this.gimmickManager.hideActiveGimmick();
                }
            }
            
            // Show message about power-up
            this.ui.showMessage(`増強コイン効果: ${originalValue} → ${effectiveValue}`, 'info');
        }
        
        // Store effective value to be used for field assessment
        card.effectiveValue = effectiveValue;
        
        // Add to field
        this.field.addCard(card);
        
        // Animate card being played
        this.ui.animateCardPlay(card, isPlayer);
        
        // Update game state
        this.updateGameState();
        
        // Check for win by empty hand or revival condition
        if (hand.count === 0) {
            // 報復コイン効果をチェック
            if (this.gimmickManager.checkRevivalCondition()) {
                // Revival gimmick activated, continue game
                this.ui.showMessage(`報復コイン効果が発動し、ゲームが続行します！`, 'info');
            } else {
                // Normal empty hand win
                this.endGame(isPlayer, '手札を使い切りました！');
                return;
            }
        }
        
        // End turn - if this is the CPU, add a small delay so the player can see what happened
        if (!isPlayer) {
            setTimeout(() => {
                this.endTurn();
            }, 1000); // CPUがカードを出した後に1秒待機
        } else {
            this.endTurn();
        }
    }

    // Handle player/AI skipping their turn
    handleSkip(isPlayer) {
        // ゲームがすでに終了している場合は何もしない
        if (!this.gameActive) {
            console.log('Game is already over, skipping score update');
            return;
        }
        
        // 重複処理防止チェック
        if (this.isProcessingTurnEnd) {
            console.log('Turn end already processing, ignoring duplicate call');
            return;
        }
        
        // ターン終了処理を開始
        this.isProcessingTurnEnd = true;
        
        console.log((isPlayer ? 'Player' : 'CPU') + ' is skipping');
        
        // 数字逆転用のスキップカウントを追跡
        this.gimmickManager.trackSkip();
        
        // Get the last card played
        const lastCard = this.field.cards.length > 0 ? this.field.cards[this.field.cards.length - 1] : null;
        
        // 修正された得点システム：パスした人の相手に点数が入る（切断コインが使われていない場合のみ）
        if (lastCard && this.gameActive && !this.isResetCoinActive) {
            let scoreAdded = false;
            
            if (isPlayer) {
                // プレイヤーがパスした場合、AIに点数
                const newScore = Math.min(this.opponentScore + lastCard.value, 35); // 上限を35点に制限
                scoreAdded = newScore > this.opponentScore;
                this.opponentScore = newScore;
                
                if (scoreAdded) {
                    this.ui.showMessage(`相手が${lastCard.value}点を獲得しました`, 'info');
                }
            } else {
                // AIがパスした場合、プレイヤーに点数
                const newScore = Math.min(this.playerScore + lastCard.value, 35); // 上限を35点に制限
                scoreAdded = newScore > this.playerScore;
                this.playerScore = newScore;
                
                if (scoreAdded) {
                    this.ui.showMessage(`あなたが${lastCard.value}点を獲得しました`, 'info');
                }
            }
            
            // 得点表示を更新
            this.ui.updateScores();
        }
        
        // Check if either player has reached 35 points
        if (this.playerScore >= 35 || this.opponentScore >= 35) {
            const playerWon = this.playerScore >= 35;
            if (playerWon) {
                this.endGame(true, 'あなたの得点が35点に達しました！');
            } else {
                this.endGame(false, '相手の得点が35点に達しました！');
            }
            return;
        }
        
        // Clear field and move cards to discard pile
        const clearedCards = this.field.clear();
        this.discardPile = this.discardPile.concat(clearedCards);
        
        // Draw a random card from the discard pile for the player who skipped
        this.drawRandomCardFromDiscardPile(isPlayer);
        
        // Update game state
        this.updateGameState();
        
        // Show pass message - for the opponent, don't show reason for passing
        if (isPlayer) {
            this.ui.showMessage(`あなたがパスしました。新しい場が始まります。`, 'info');
        } else {
            this.ui.showMessage(`相手がパスしました。新しい場が始まります。`, 'info');
        }
        
        // パスした場合、次のターンはパスしていない側の番になる
        // 今回のパスした人のフラグを保存
        const currentPlayer = this.isPlayerTurn;
        
        // パスした人とは逆の人のターンに設定
        this.isPlayerTurn = !isPlayer;
        
        // Clean up any one-turn effects
        if (this.playerBlockedCardId && this.isPlayerTurn) {
            this.playerBlockedCardId = null; // Clear blocked card for player's new turn
        }
        if (this.opponentBlockedCardId && !this.isPlayerTurn) {
            this.opponentBlockedCardId = null; // Clear blocked card for opponent's new turn
        }
        
        // End turn - if this is the CPU, add a small delay so the player can see what happened
        if (!isPlayer) {
            setTimeout(() => {
                // 処理フラグをリセット
                this.isProcessingTurnEnd = false;
                if (this.gameActive) {
                    this.startTurn(); // 直接次のターンを開始
                }
            }, 1000); // CPUがスキップした後に1秒待機
        } else {
            // 処理フラグをリセット
            this.isProcessingTurnEnd = false;
            if (this.gameActive) {
                this.startTurn(); // 直接次のターンを開始
            }
        }
    }
    
    // Draw a random card from the discard pile
    async drawRandomCardFromDiscardPile(isPlayer) {
        // Check if there are cards in the discard pile
        if (this.discardPile.length === 0) {
            this.ui.showMessage('捨て札がないため、カードを引けませんでした。', 'info');
            return;
        }
        
        // Get a random index from the discard pile
        const randomIndex = Math.floor(Math.random() * this.discardPile.length);
        
        // Get the card at that index
        const drawnCard = this.discardPile.splice(randomIndex, 1)[0];
        
        // Add the card to the appropriate hand
        if (isPlayer) {
            // Animate card being drawn
            await this.ui.animateCardDraw(drawnCard, false);
            
            this.playerHand.addCard(drawnCard);
            this.ui.showMessage(`あなたは捨て札から「${drawnCard.value}」を引きました！`, 'info');
        } else {
            // Animate card being drawn
            await this.ui.animateCardDraw(drawnCard, true);
            
            this.opponentHand.addCard(drawnCard);
            this.ui.showMessage(`相手は捨て札からカードを1枚引きました！`, 'info');
        }
    }
    
    // Check if player has any playable cards
    hasPlayableCards(isPlayer) {
        const hand = isPlayer ? this.playerHand.cards : this.opponentHand.cards;
        
        // If field is empty, all cards are playable
        if (this.field.cards.length === 0) return true;
        
        // Get highest card on the field
        const highestCard = this.field.getHighestCard();
        const highestFieldValue = highestCard.effectiveValue !== undefined ? 
            highestCard.effectiveValue : highestCard.value;
        
        // Check if any card in hand can beat the highest card
        for (const card of hand) {
            // Check if card is blocked by reset gimmick
            if ((isPlayer && this.playerBlockedCardId === card.id) ||
                (!isPlayer && this.opponentBlockedCardId === card.id)) {
                continue; // Skip blocked card
            }
            
            // Apply power-up effect if active
            let effectiveValue = card.value;
            if ((isPlayer && this.playerPowerupCount > 0) || 
                (!isPlayer && this.opponentPowerupCount > 0)) {
                effectiveValue += 1;
            }
            
            if (this.field.reversed) {
                // In reversed mode, lower is stronger
                if (effectiveValue < highestFieldValue) return true;
            } else {
                // In normal mode, higher is stronger
                if (effectiveValue > highestFieldValue) return true;
            }
        }
        
        return false;
    }

    // End the game with a winner
    endGame(playerWon, reason) {
        // すでにゲームが終了している場合は何もしない
        if (!this.gameActive) {
            console.log('Game is already over, ignoring duplicate endGame call');
            return;
        }
        
        console.log('Game ending, final scores:', this.playerScore, this.opponentScore);
        
        // 得点が35点を超えないようにする
        this.playerScore = Math.min(this.playerScore, 35);
        this.opponentScore = Math.min(this.opponentScore, 35);
        
        // Stop game activity
        this.gameActive = false;
        clearInterval(this.timerInterval);
        
        // Update player stats in profile if available
        if (typeof window.updatePlayerStats === 'function') {
            const updatedProfile = window.updatePlayerStats(playerWon);
            console.log('Updated player profile:', updatedProfile);
        }
        
        // Update UI
        this.ui.updateScores();
        
        // すべての進行中の処理を確実に停止させるため少し遅延してから結果画面を表示する
        setTimeout(() => {
            // Show game over screen
            this.ui.showGameOver(playerWon, reason);
        }, 100);
    }

    // Update the game state and UI
    updateGameState() {
        // Render hands
        this.ui.renderPlayerHand();
        this.ui.renderOpponentHand();
        
        // Render field
        this.ui.renderField();
        
        // Render discard pile
        this.ui.renderDiscardPile();
        
        // Update turn indicator
        this.ui.updateTurnIndicator();
        
        // Update scores
        this.ui.updateScores();
    }

    // Reset the game state for a new game
    resetGameState() {
        // Reset deck and hands
        this.deck = new Deck();
        this.playerHand = new Hand();
        this.opponentHand = new Hand();
        this.field = new Field();
        this.discardPile = [];
        
        // Reset game state
        this.isPlayerTurn = true;
        this.gameActive = false;
        this.turnNumber = 0;
        this.timeoutMode = 0;
        this.aiTurnInProgress = false;
        
        // Reset scores - 重要：スコアを必ずリセット
        this.playerScore = 0;
        this.opponentScore = 0;
        
        // Reset gimmick effects
        this.isGimmickActive = false;
        this.playerPowerupCount = 0;
        this.opponentPowerupCount = 0;
        this.playerHasRevivalGimmick = false;
        this.opponentHasRevivalGimmick = false;
        this.playerBlockedCardId = null;
        this.opponentBlockedCardId = null;
        this.monitorPlayerEmptyHand = false;
        this.monitorOpponentEmptyHand = false;
        
        // Reset gimmick manager state
        if (this.gimmickManager) {
            this.gimmickManager.reversalActive = false;
            this.gimmickManager.reversalSkipCount = 0;
        }
        
        // Clear timer
        clearInterval(this.timerInterval);
        this.currentTime = this.turnTimeLimit;
    }

    // Reset everything for a new game
    resetGame() {
        this.resetGameState();
        this.startGame();
    }

    // Check if a card is playable
    isCardPlayable(card) {
        // Can't play if it's not player's turn
        if (!this.isPlayerTurn) return false;
        
        // Can't play if card is blocked by reset gimmick
        if (this.playerBlockedCardId === card.id) return false;
        
        // If field is empty, any card is playable
        if (this.field.cards.length === 0) return true;
        
        // Check if card is higher/lower than highest field card depending on reversal
        const highestFieldCard = this.field.getHighestCard();
        const highestFieldValue = highestFieldCard.effectiveValue !== undefined ? 
            highestFieldCard.effectiveValue : highestFieldCard.value;
        
        // Apply power-up effect if active
        let effectiveValue = card.value;
        if (this.playerPowerupCount > 0) {
            effectiveValue += 1;
        }
        
        if (this.field.reversed) {
            // In reversed mode, lower values are stronger
            return effectiveValue < highestFieldValue;
        } else {
            // In normal mode, higher values are stronger
            return effectiveValue > highestFieldValue;
        }
    }

    // Show a game message
    showMessage(message, type = 'default') {
        this.ui.showMessage(message, type);
    }
}

// Initialize the game when the window loads
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
