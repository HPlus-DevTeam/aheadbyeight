/**
 * ui.js - UI interactions for Ahead by Eight game
 */

// Class to handle UI interactions
class GameUI {
    constructor(game) {
        this.game = game;
        this.isAnimating = false;
        this.playerProfile = null;
        this.loadPlayerProfile();
        this.initElements();
        this.initEventListeners();
    }
    
    // Load player profile from localStorage
    loadPlayerProfile() {
        if (typeof window.getPlayerProfile === 'function') {
            this.playerProfile = window.getPlayerProfile();
        }
    }
    
    // Initialize UI element references
    initElements() {
        // Main game areas
        this.playerHandEl = document.getElementById('player-hand');
        this.opponentHandEl = document.getElementById('opponent-hand');
        this.fieldCardsEl = document.getElementById('field-cards');
        this.discardPileEl = document.getElementById('discard-pile');
        this.gimmickCoinsEl = document.getElementById('gimmick-coins');
        
        // Info displays
        this.playerScoreEl = document.getElementById('player-score');
        this.opponentScoreEl = document.getElementById('opponent-score');
        this.fieldTotalEl = document.getElementById('field-total');
        this.turnPlayerEl = document.getElementById('turn-player');
        this.timerEl = document.getElementById('timer');
        this.messageEl = document.getElementById('game-message');
        this.playerFlagEl = document.getElementById('player-flag');
        this.playerNameDisplayEl = document.getElementById('player-name-display');
        this.gameStatusTextEl = document.querySelector('.game-status-text');
        
        // Action buttons
        this.skipButtonEl = document.getElementById('skip-button');
        this.surrenderButtonEl = document.getElementById('surrender-button');
        
        // Overlay elements
        this.overlayEl = document.getElementById('game-overlay');
        this.overlayContentEl = document.getElementById('overlay-content');
        
        // Update player info display if profile is available
        this.updatePlayerInfoDisplay();
    }
    
    // Update player profile display in the header
    updatePlayerInfoDisplay() {
        if (this.playerProfile && this.playerFlagEl && this.playerNameDisplayEl) {
            // Set player name
            const playerName = this.playerProfile.playerName || 'プレイヤー';
            this.playerNameDisplayEl.textContent = playerName;
            
            // Set country flag if available
            if (this.playerProfile.countryCode) {
                this.playerFlagEl.innerHTML = `<img src="https://flagcdn.com/48x36/${this.playerProfile.countryCode.toLowerCase()}.png" alt="${this.playerProfile.countryName}">`;
            }
        }
    }
    
    // Initialize event listeners
    initEventListeners() {
        // Skip button
        if (this.skipButtonEl) {
            this.skipButtonEl.addEventListener('click', () => {
                if (this.game.isPlayerTurn && !this.isAnimating) {
                    this.game.handleSkip(true);
                }
            });
        }
        
        // Surrender button
        if (this.surrenderButtonEl) {
            this.surrenderButtonEl.addEventListener('click', () => {
                // Confirm before surrendering
                if (confirm('降参して相手の勝利にしますか？')) {
                    // End the game with a loss for the player
                    this.game.endGame(false, 'プレイヤーが降参しました');
                }
            });
        }
    }

    // Render player's hand
    renderPlayerHand() {
        if (!this.playerHandEl) return;
        
        this.playerHandEl.innerHTML = '';
        const playerHand = this.game.playerHand.cards;
        
        playerHand.forEach(card => {
            const cardElement = card.createElement(true);
            
            // Add highlight if playable
            if (this.game.isPlayerTurn && this.game.isCardPlayable(card)) {
                cardElement.classList.add('playable');
            }
            
            // Block highest card if affected by reset gimmick
            if (this.game.playerBlockedCardId === card.id) {
                cardElement.classList.add('blocked');
                cardElement.title = 'このカードは切断コイン効果により使用できません';
            }
            
            // Add power-up visual if active
            if (this.game.playerPowerupCount > 0) {
                cardElement.classList.add('powered-up');
                const originalValue = card.value;
                const boostedValue = originalValue + 1;
                
                cardElement.innerHTML = `
                    <div class="power-up-indicator">
                        <span class="original-value">${originalValue}</span>
                        <span class="boost-arrow">→</span>
                        <span class="boosted-value">${boostedValue}</span>
                    </div>
                `;
            }
            
            // Add click handler with sound effect
            cardElement.addEventListener('click', () => {
                if (this.game.isPlayerTurn && 
                    this.game.isCardPlayable(card) && 
                    !this.isAnimating && 
                    this.game.playerBlockedCardId !== card.id) {
                    
                    // Play card flip sound
                    if (window.audioManager) {
                        window.audioManager.playCardFlip();
                    }
                    
                    this.game.playCard(card, true);
                }
            });
            
            this.playerHandEl.appendChild(cardElement);
        });
    }

    // Render opponent's hand (face down)
    renderOpponentHand() {
        if (!this.opponentHandEl) return;
        
        this.opponentHandEl.innerHTML = '';
        const opponentHand = this.game.opponentHand.cards;
        
        opponentHand.forEach(card => {
            const cardElement = card.createElement(false); // Face down
            this.opponentHandEl.appendChild(cardElement);
        });
    }

    // Render field cards - MODIFIED to stack cards and show reversal indicator
    renderField() {
        if (!this.fieldCardsEl) return;
        
        // Clear field display
        this.fieldCardsEl.innerHTML = '';
        
        // Create a stacked card container
        const stackContainer = document.createElement('div');
        stackContainer.className = 'stacked-cards';
        this.fieldCardsEl.appendChild(stackContainer);
        
        // Add reversal indicator if active
        if (this.game.field.reversed) {
            const reversalIndicator = document.createElement('div');
            reversalIndicator.className = 'reversal-indicator';
            reversalIndicator.innerHTML = `
                <div class="reversal-icon">↑↓</div>
                <div class="reversal-text">数字逆転中</div>
            `;
            this.fieldCardsEl.appendChild(reversalIndicator);
        }
        
        // If no cards, display empty state
        if (this.game.field.cards.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-field';
            emptyState.textContent = '場にカードがありません';
            stackContainer.appendChild(emptyState);
            return;
        }
        
        // Render each card in field - now stacked with the last card on top
        this.game.field.cards.forEach((card, index) => {
            const cardElement = card.createElement(true);
            
            // Position cards in a stack
            const isLastCard = index === this.game.field.cards.length - 1;
            
            // Calculate stacking position and z-index
            cardElement.style.position = 'absolute';
            cardElement.style.left = `${index * 5}px`;
            cardElement.style.top = `${index * 5}px`;
            cardElement.style.zIndex = index + 1;
            
            // Add highlight for the most recent card
            if (isLastCard) {
                cardElement.classList.add('top-card');
                // Add a highlight/pulse effect to make the newest card more visible
                cardElement.classList.add('highlight');
            }
            
            // Display effective value if power-up was applied
            if (card.effectiveValue !== undefined && card.effectiveValue !== card.value) {
                cardElement.classList.add('powered-up');
                cardElement.innerHTML = `
                    <div class="power-up-indicator">
                        <span class="original-value">${card.value}</span>
                        <span class="boost-arrow">→</span>
                        <span class="boosted-value">${card.effectiveValue}</span>
                    </div>
                `;
            }
            
            // Add reversal visual if active
            if (this.game.field.reversed) {
                cardElement.classList.add('reversed');
            }
            
            stackContainer.appendChild(cardElement);
        });
        
        // Field total indicator removed as requested
    }

    // Render discard pile (show count or top card)
    renderDiscardPile() {
        if (!this.discardPileEl) return;
        
        const discardCount = this.game.discardPile.length;
        
        if (discardCount === 0) {
            this.discardPileEl.innerHTML = '<span class="discard-text">捨て札なし</span>';
        } else {
            this.discardPileEl.innerHTML = `<span class="discard-text">捨て札: ${discardCount}枚</span>`;
            
            // Optionally show top card
            if (discardCount > 0 && this.game.discardPile[discardCount - 1]) {
                const topCard = this.game.discardPile[discardCount - 1];
                const cardElement = topCard.createElement(true);
                cardElement.classList.add('discard-top');
                this.discardPileEl.appendChild(cardElement);
            }
        }
    }

    // Update turn indicator
    updateTurnIndicator() {
        if (!this.turnPlayerEl) return;
        
        this.turnPlayerEl.textContent = this.game.isPlayerTurn ? 'あなた' : '相手';
        
        // Add visual indication of whose turn it is
        this.playerHandEl.classList.toggle('active-turn', this.game.isPlayerTurn);
        this.opponentHandEl.classList.toggle('active-turn', !this.game.isPlayerTurn);
    }

    // Update scores
    updateScores() {
        if (this.playerScoreEl) {
            this.playerScoreEl.textContent = this.game.playerScore;
        }
        
        if (this.opponentScoreEl) {
            this.opponentScoreEl.textContent = this.game.opponentScore;
        }
    }

    // Update timer display
    updateTimer(seconds) {
        if (!this.timerEl) return;
        
        this.timerEl.textContent = seconds;
        
        // Add warning color when time is running low
        if (seconds <= 10) {
            this.timerEl.classList.add('warning');
        } else {
            this.timerEl.classList.remove('warning');
        }
    }

    // Display game message
    showMessage(message, type = 'default') {
        if (!this.messageEl) return;
        
        // Clear existing messages
        clearTimeout(this.messageTimeout);
        
        // Set message
        this.messageEl.textContent = message;
        this.messageEl.className = `game-message ${type} show`;
        
        // Update the game status text if it exists
        if (this.gameStatusTextEl) {
            this.gameStatusTextEl.textContent = message;
        }
        
        // Auto-hide after delay
        this.messageTimeout = setTimeout(() => {
            this.messageEl.classList.remove('show');
        }, 3000);
    }

    // Display game over screen
    showGameOver(playerWon, reason) {
        if (!this.overlayEl || !this.overlayContentEl) return;
        
        // 得点が24点を超えないように確実に制限する
        const finalPlayerScore = Math.min(this.game.playerScore, 24);
        const finalOpponentScore = Math.min(this.game.opponentScore, 24);
        
        // 得点に不一致がある場合はコンソールに警告を出す
        if (this.game.playerScore !== finalPlayerScore || this.game.opponentScore !== finalOpponentScore) {
            console.warn('Score discrepancy detected, capping to 24 points:', 
                         this.game.playerScore, '->', finalPlayerScore, 
                         this.game.opponentScore, '->', finalOpponentScore);
        }
        
        let message;
        if (playerWon) {
            message = '<div class="result-banner win">勝利!</div>';
        } else {
            message = '<div class="result-banner lose">敗北...</div>';
        }
        
        // Add reason for game end
        message += `<p class="result-reason">${reason}</p>`;
        
        // Add final scores - 制限した得点を表示
        message += `
            <div class="final-scores">
                <div>あなたの得点: ${finalPlayerScore} 点</div>
                <div>相手の得点: ${finalOpponentScore} 点</div>
            </div>
        `;
        
        // Add buttons - replay and back to top
        message += `
            <div class="result-buttons">
                <button id="replay-button" class="game-button battle-button">再戦</button>
                <button id="back-to-top" class="game-button">戻る</button>
            </div>
        `;
        
        this.overlayContentEl.innerHTML = message;
        
        // Add replay button listener
        const replayButton = document.getElementById('replay-button');
        if (replayButton) {
            replayButton.addEventListener('click', () => {
                this.game.resetGame();
                this.overlayEl.classList.remove('show');
            });
        }
        
        // Add back to top button listener
        const backButton = document.getElementById('back-to-top');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.showWelcomeScreen();
            });
        }
        
        this.overlayEl.classList.add('show');
    }

    // Show difficulty selection screen
    showDifficultySelection() {
        if (!this.overlayEl || !this.overlayContentEl) return;
        
        this.overlayContentEl.innerHTML = `
            <h2>難易度を選択</h2>
            <div class="difficulty-buttons">
                <button id="beginner-button" class="game-button">初級</button>
                <button id="advanced-button" class="game-button">上級</button>
                <button id="back-button" class="game-button">戻る</button>
            </div>
        `;
        
        // Add button listeners
        const beginnerButton = document.getElementById('beginner-button');
        const advancedButton = document.getElementById('advanced-button');
        const backButton = document.getElementById('back-button');
        
        if (beginnerButton) {
            beginnerButton.addEventListener('click', () => {
                this.game.setDifficulty(AI_DIFFICULTY.BEGINNER);
                this.overlayEl.classList.remove('show');
                this.game.startGame();
            });
        }
        
        if (advancedButton) {
            advancedButton.addEventListener('click', () => {
                this.game.setDifficulty(AI_DIFFICULTY.ADVANCED);
                this.overlayEl.classList.remove('show');
                this.game.startGame();
            });
        }
        
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.showWelcomeScreen();
            });
        }
        
        this.overlayEl.classList.add('show');
    }

    // Show game rules/help screen
    showHelp() {
        if (!this.overlayEl || !this.overlayContentEl) return;
        
        this.overlayContentEl.innerHTML = `
            <h2>ゲームルール</h2>
            <div class="rules-content">
                <h3>ゲームの目的</h3>
                <p>2つの勝利条件のどちらかを満たすことで勝利します：</p>
                <ol>
                    <li>手札の数字をすべて出し切る</li>
                    <li>相手がスキップを選んだときに、場の合計が13点を超えている</li>
                </ol>
                
                <h3>ターンの流れ</h3>
                <p>プレイヤーは交互にターンを行います。各ターンでは、次のどちらかを選びます：</p>
                <ul>
                    <li>場に出されている一番強いカードより強いカードを出す</li>
                    <li>スキップを選択（場の合計が13を超えた状態で相手がスキップすると勝利）</li>
                </ul>
                
                <h3>ギミックコイン</h3>
                <p>ゲーム開始時に2つのギミックコインを選び、ゲーム中に1回ずつ使用できます：</p>
                <ul>
                    <li><strong>革命コイン：</strong> 数字の強さを逆転させる（1が一番強い）</li>
                    <li><strong>報復コイン：</strong> 自分の手札が2枚以上残って負けた時に相手に数字の4の手札を与える</li>
                    <li><strong>増強コイン：</strong> 次に出す2枚の手札の強さを1大きくする</li>
                    <li><strong>再生コイン：</strong> 使い終わった場にあるカードを一枚手札に加える</li>
                    <li><strong>切断コイン：</strong> 強制的に場を終わらせ、自分が次の先手を得られるが自分の手札上で一番強いカードを出すことはできない</li>
                </ul>
                
                <h3>タイマー</h3>
                <p>各ターンには20秒の制限があり、この制限を超えると5秒に短縮されます。</p>
                
                <h3>得点システム</h3>
                <p>スキップ時に、最後にカードを出したプレイヤーがそのカードの点数を獲得します。</p>
                <p>先に20点を獲得したプレイヤーが勝利します。</p>
                
                <h3>スキップ時のカードドロー</h3>
                <p>スキップを選択したプレイヤーは、捨て札からランダムに1枚カードを引きます。</p>
                <p>捨て札がない場合は、カードを引くことができません。</p>
            </div>
            <button id="close-help" class="game-button">戻る</button>
        `;
        
        // Add close button listener
        const closeButton = document.getElementById('close-help');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.showWelcomeScreen(); // Return to welcome screen instead of closing
            });
        }
        
        this.overlayEl.classList.add('show');
    }

    // Show welcome/start screen
    showWelcomeScreen() {
        if (!this.overlayEl || !this.overlayContentEl) return;
        
        this.overlayContentEl.innerHTML = `
            <h1>Ahead by Eight</h1>
            <p>ターン制の心理戦カードゲームへようこそ！</p>
            <div class="welcome-buttons">
                <button id="start-game" class="game-button battle-button">戦う</button>
                <button id="show-help" class="game-button">ルール確認</button>
                <button id="back-to-menu" class="game-button">トップに戻る</button>
            </div>
        `;
        
        // Add button listeners
        const startButton = document.getElementById('start-game');
        const helpButton = document.getElementById('show-help');
        const backButton = document.getElementById('back-to-menu');
        
        if (startButton) {
            startButton.addEventListener('click', () => {
                this.overlayEl.classList.remove('show');
                this.showDifficultySelection();
            });
        }
        
        if (helpButton) {
            helpButton.addEventListener('click', () => {
                this.overlayEl.classList.remove('show');
                this.showHelp();
            });
        }
        
        if (backButton) {
            backButton.addEventListener('click', () => {
                // Return to main menu
                window.location.href = 'index.html';
            });
        }
        
        this.overlayEl.classList.add('show');
    }

    // Animate card being played
    async animateCardPlay(card, fromPlayer) {
        this.isAnimating = true;
        
        // Play sound effect for card being played
        if (window.audioManager) {
            window.audioManager.playCardFlip();
        }
        
        // Create temporary card for animation using card image
        const tempCard = document.createElement('div');
        tempCard.className = 'card card-animation';
        
        // Use card image just like in createElement
        const cardImage = document.createElement('img');
        cardImage.src = `images/card1/Card_${card.value}_patter1.png`;
        cardImage.alt = `Card ${card.value}`;
        cardImage.className = 'card-image';
        tempCard.appendChild(cardImage);
        
        // Fallback to text if image fails to load
        cardImage.onerror = () => {
            tempCard.removeChild(cardImage);
            tempCard.textContent = card.value;
        };
        
        // Position at source
        const sourceArea = fromPlayer ? this.playerHandEl : this.opponentHandEl;
        const sourceRect = sourceArea.getBoundingClientRect();
        const fieldRect = this.fieldCardsEl.getBoundingClientRect();
        
        document.body.appendChild(tempCard);
        
        // Starting position
        tempCard.style.position = 'absolute';
        tempCard.style.left = `${sourceRect.left + sourceRect.width / 2 - 40}px`;
        tempCard.style.top = `${sourceRect.top + sourceRect.height / 2 - 60}px`;
        
        // Animate to field
        await new Promise(resolve => {
            setTimeout(() => {
                tempCard.style.transition = 'all 0.5s ease-out';
                tempCard.style.left = `${fieldRect.left + fieldRect.width / 2 - 40}px`;
                tempCard.style.top = `${fieldRect.top + fieldRect.height / 2 - 60}px`;
                
                // Remove after animation
                setTimeout(() => {
                    document.body.removeChild(tempCard);
                    this.isAnimating = false;
                    resolve();
                }, 500);
            }, 10);
        });
    }
    
    // Animate card being drawn from discard pile
    async animateCardDraw(card, toOpponent) {
        this.isAnimating = true;
        
        // Play sound effect for card being drawn
        if (window.audioManager) {
            window.audioManager.playCardFlip();
        }
        
        // Create temporary card for animation
        const tempCard = document.createElement('div');
        tempCard.className = 'card card-animation';
        if (!toOpponent) { 
            // Only show value when drawing to player - use card image
            const cardImage = document.createElement('img');
            cardImage.src = `images/card1/Card_${card.value}_patter1.png`;
            cardImage.alt = `Card ${card.value}`;
            cardImage.className = 'card-image';
            tempCard.appendChild(cardImage);
            
            // Fallback to text if image fails to load
            cardImage.onerror = () => {
                tempCard.removeChild(cardImage);
                tempCard.textContent = card.value;
            };
        } else {
            tempCard.classList.add('card-back');
        }
        
        // Position at source (discard pile)
        const discardRect = this.discardPileEl.getBoundingClientRect();
        const targetArea = toOpponent ? this.opponentHandEl : this.playerHandEl;
        const targetRect = targetArea.getBoundingClientRect();
        
        document.body.appendChild(tempCard);
        
        // Starting position
        tempCard.style.position = 'absolute';
        tempCard.style.left = `${discardRect.left + discardRect.width / 2 - 40}px`;
        tempCard.style.top = `${discardRect.top + discardRect.height / 2 - 60}px`;
        
        // Animate to hand
        await new Promise(resolve => {
            setTimeout(() => {
                tempCard.style.transition = 'all 0.5s ease-out';
                tempCard.style.left = `${targetRect.left + targetRect.width / 2 - 40}px`;
                tempCard.style.top = `${targetRect.top + targetRect.height / 2 - 60}px`;
                
                // Remove after animation
                setTimeout(() => {
                    document.body.removeChild(tempCard);
                    this.isAnimating = false;
                    resolve();
                }, 500);
            }, 10);
        });
    }
}

// Export class
window.GameUI = GameUI;
