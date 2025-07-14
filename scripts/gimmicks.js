/**
 * gimmicks.js - Gimmick cards/abilities implementation for Ahead by Eight game
 */

// GimmickCoin class for creating special ability coins
class GimmickCoin {
    constructor(type, name, description) {
        this.type = type;
        this.name = name;
        this.description = description;
        this.used = false;
        this.id = `gimmick-${Math.random().toString(36).substr(2, 9)}`;
        this.element = null;
    }

    // Create the gimmick coin's DOM element
    createElement() {
        const coinElement = document.createElement('div');
        coinElement.id = this.id;
        coinElement.className = 'gimmick-coin';
        coinElement.dataset.type = this.type;
        coinElement.textContent = this.name.charAt(0); // First letter as icon
        
        // Add tooltip for description
        coinElement.title = `${this.name}: ${this.description}`;
        
        this.element = coinElement;
        return coinElement;
    }

    // Mark gimmick as used
    use() {
        this.used = true;
        if (this.element) {
            this.element.classList.add('used');
        }
    }

    // Reset gimmick (for new game)
    reset() {
        this.used = false;
        if (this.element) {
            this.element.classList.remove('used');
        }
    }
}

// GimmickManager class for handling gimmick coins
class GimmickManager {
    constructor(game) {
        this.game = game;
        this.availableGimmicks = this.initializeGimmicks();
        this.playerGimmicks = [];
        this.opponentGimmicks = [];
        this.reversalSkipCount = 0; // 数字逆転が発動してからのスキップ回数
        this.reversalActive = false; // 数字逆転の効果が有効かどうか
    }

    // Initialize all available gimmicks
    initializeGimmicks() {
        return [
            new GimmickCoin('reversal', '革命コイン', '数字の強さを逆転させる（1が一番強い）'),
            new GimmickCoin('revival', '報復コイン', '自分の手札が2枚以上残って負けた時に相手に数字の4の手札を与える'),
            new GimmickCoin('powerup', '増強コイン', '次に出す2枚の手札の強さを1大きくする'),
            new GimmickCoin('recovery', '再生コイン', '使い終わった場にあるカードを一枚手札に加える'),
            new GimmickCoin('reset', '切断コイン', '強制的に場を終わらせ、自分が次の先手を得られるが自分の手札上で一番強いカードを出すことはできない')
        ];
    }

    // Let a player select their gimmicks at game start
    selectPlayerGimmicks(count = 2) {
        return new Promise(resolve => {
            const overlay = document.getElementById('game-overlay');
            const content = document.getElementById('overlay-content');
            
            // Selection time limit: 20 seconds
            const timeLimit = 20;
            let timeRemaining = timeLimit;
            
            content.innerHTML = `
                <h2>ギミックコインを選択</h2>
                <p>使用したい${count}枚のギミックコインを選んでください</p>
                <div class="selection-timer">${timeRemaining}</div>
                <div class="gimmick-selection"></div>
                <div class="selected-count">0/${count}枚選択中</div>
                <button id="confirm-gimmicks" class="game-button" disabled>確定</button>
            `;
            
            const selectionContainer = content.querySelector('.gimmick-selection');
            const selectedCountEl = content.querySelector('.selected-count');
            const confirmButton = content.querySelector('#confirm-gimmicks');
            const timerEl = content.querySelector('.selection-timer');
            
            const selected = [];
            
            // Start selection timer
            const timer = setInterval(() => {
                timeRemaining--;
                timerEl.textContent = timeRemaining;
                
                // Give visual warning when time is low
                if (timeRemaining <= 5) {
                    timerEl.classList.add('warning');
                }
                
                // Time's up - select random gimmicks
                if (timeRemaining <= 0) {
                    clearInterval(timer);
                    
                    // Clear current selection
                    selected.length = 0;
                    
                    // Randomly select 'count' gimmicks
                    const availableGimmicks = [...this.availableGimmicks];
                    
                    // Shuffle gimmicks
                    for (let i = availableGimmicks.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [availableGimmicks[i], availableGimmicks[j]] = [availableGimmicks[j], availableGimmicks[i]];
                    }
                    
                    // Take the first 'count' gimmicks
                    const randomSelected = availableGimmicks.slice(0, count);
                    this.playerGimmicks = randomSelected;
                    
                    // Show message that time expired and random gimmicks were selected
                    this.game.showMessage('時間切れ！ランダムにギミックを選択しました。', 'warning');
                    
                    overlay.classList.remove('show');
                    resolve(randomSelected);
                }
            }, 1000);
            
            // Display all available gimmicks
            this.availableGimmicks.forEach(gimmick => {
                const gimmickEl = document.createElement('div');
                gimmickEl.className = 'selectable-gimmick';
                
                gimmickEl.innerHTML = `
                    <div class="gimmick-coin">${gimmick.name.charAt(0)}</div>
                    <div class="gimmick-info">
                        <h4>${gimmick.name}</h4>
                        <p>${gimmick.description}</p>
                    </div>
                `;
                
                gimmickEl.addEventListener('click', () => {
                    const isSelected = gimmickEl.classList.toggle('selected');
                    
                    if (isSelected && selected.length < count) {
                        selected.push(gimmick);
                    } else if (isSelected && selected.length >= count) {
                        // Already selected maximum
                        gimmickEl.classList.remove('selected');
                        return;
                    } else {
                        // Remove from selected
                        const index = selected.indexOf(gimmick);
                        if (index !== -1) {
                            selected.splice(index, 1);
                        }
                    }
                    
                    selectedCountEl.textContent = `${selected.length}/${count}枚選択中`;
                    confirmButton.disabled = selected.length !== count;
                });
                
                selectionContainer.appendChild(gimmickEl);
            });
            
            confirmButton.addEventListener('click', () => {
                // Clear the timer when user confirms selection
                clearInterval(timer);
                
                this.playerGimmicks = [...selected];
                overlay.classList.remove('show');
                resolve(selected);
            });
            
            overlay.classList.add('show');
        });
    }

    // Select AI gimmicks (random for now, can be improved in AI implementation)
    selectAIGimmicks(count = 2) {
        const available = this.availableGimmicks.filter(
            gimmick => !this.playerGimmicks.includes(gimmick)
        );
        
        // Shuffle and pick first 'count' gimmicks
        for (let i = available.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [available[i], available[j]] = [available[j], available[i]];
        }
        
        this.opponentGimmicks = available.slice(0, count);
        return this.opponentGimmicks;
    }

    // Render player's gimmick coins to the UI
    renderPlayerGimmicks() {
        const container = document.getElementById('gimmick-coins');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.playerGimmicks.forEach(gimmick => {
            const coinElement = gimmick.createElement();
            
            // Add click handler for using the gimmick
            coinElement.addEventListener('click', () => {
                if (!gimmick.used && this.game.isPlayerTurn && !this.game.isGimmickActive) {
                    this.useGimmick(gimmick, true);
                }
            });
            
            container.appendChild(coinElement);
        });
    }

    // Use a gimmick
    useGimmick(gimmick, isPlayer) {
        if (gimmick.used) return false;
        
        // Mark as used
        gimmick.use();
        
        // Show active gimmick display
        this.showActiveGimmick(gimmick, isPlayer);
        
        // Apply effect based on type
        switch (gimmick.type) {
            case 'reversal':
                this.applyReversalEffect(isPlayer);
                break;
            case 'revival':
                this.applyRevivalEffect(isPlayer);
                break;
            case 'powerup':
                this.applyPowerupEffect(isPlayer);
                break;
            case 'recovery':
                this.applyRecoveryEffect(isPlayer);
                break;
            case 'reset':
                this.applyResetEffect(isPlayer);
                break;
        }
        
        // Show effect message
        this.game.showMessage(`${isPlayer ? 'あなた' : '相手'}が「${gimmick.name}」を使用しました！`, 'info');
        
        // Unlike before, we don't end the turn after using a gimmick
        // The player can still play a card or skip after using a gimmick
        
        // Make sure isGimmickActive is false so player can use cards after using a gimmick
        this.game.isGimmickActive = false;
        
        // Update the game state to reflect any changes
        this.game.updateGameState();
        
        return true;
    }
    
    // Show active gimmick display
    showActiveGimmick(gimmick, isPlayer) {
        const display = document.getElementById('active-gimmick-display');
        const userEl = document.getElementById('active-gimmick-user');
        const iconEl = document.getElementById('active-gimmick-icon');
        const textEl = document.getElementById('active-gimmick-text');
        
        if (!display || !userEl || !iconEl || !textEl) return;
        
        // Set user text
        userEl.textContent = isPlayer ? 'あなたが使用' : '相手が使用';
        
        // Set icon (first letter of gimmick name)
        iconEl.textContent = gimmick.name.charAt(0);
        
        // Set gimmick name
        textEl.textContent = gimmick.name;
        
        // Show display
        display.classList.add('show');
        
        // Hide after some time based on gimmick type
        if (gimmick.type === 'reversal') {
            // Reversal stays until effect ends
            this.activeGimmickDisplay = display;
        } else if (gimmick.type === 'powerup') {
            // Powerup stays for 2 card plays
            this.activeGimmickDisplay = display;
        } else {
            // Other gimmicks hide after 3 seconds
            setTimeout(() => {
                display.classList.remove('show');
            }, 3000);
        }
    }
    
    // Hide active gimmick display
    hideActiveGimmick() {
        if (this.activeGimmickDisplay) {
            this.activeGimmickDisplay.classList.remove('show');
            this.activeGimmickDisplay = null;
        }
    }

    // Apply number reversal effect - updated to last for 3 skips
    applyReversalEffect(isPlayer) {
        this.game.field.toggleReversal();
        this.reversalActive = true;
        this.reversalSkipCount = 0;
        
        // Update visual indication
        document.querySelectorAll('.card:not(.card-back)').forEach(card => {
            card.classList.add('reversed');
        });
        
        // Show message indicating duration
        this.game.showMessage(`数字の強さが逆転しました。3回のスキップまで継続します。`, 'info');
        
        // Update game state to reflect reversal
        this.game.updateGameState();
        
        // Make sure isGimmickActive is not set for reversal to allow playing cards afterward
        this.game.isGimmickActive = false;
        
        // After using reversal, re-validate what cards are playable
        setTimeout(() => {
            if (this.game.isPlayerTurn) {
                this.game.ui.renderPlayerHand();
            }
        }, 100);
    }

    // Apply "Revival of 4" effect - updated to trigger when opponent's hand is empty
    applyRevivalEffect(isPlayer) {
        if (isPlayer) {
            this.game.playerHasRevivalGimmick = true;
            // モニター相手の手札が空になったかどうか
            this.game.monitorOpponentEmptyHand = true;
        } else {
            this.game.opponentHasRevivalGimmick = true;
            // モニタープレイヤーの手札が空になったかどうか
            this.game.monitorPlayerEmptyHand = true;
        }
    }
    
    // Track skip count for reversal effect
    trackSkip() {
        if (this.reversalActive) {
            this.reversalSkipCount++;
            
            // Check if we've reached 3 skips
            if (this.reversalSkipCount >= 3) {
                // Remove reversal effect
                this.game.field.toggleReversal(); // Toggle back to normal
                this.reversalActive = false;
                
                // Update visual indication
                document.querySelectorAll('.card:not(.card-back)').forEach(card => {
                    card.classList.remove('reversed');
                });
                
                this.game.showMessage('革命コインの効果が終了しました。', 'info');
                this.game.updateGameState();
                
                // Hide active gimmick display
                this.hideActiveGimmick();
            }
        }
    }
    
    // Check for revival of 4 condition
    checkRevivalCondition() {
        // Player has revival gimmick and opponent hand is empty
        if (this.game.playerHasRevivalGimmick && this.game.opponentHand.count === 0 && this.game.monitorOpponentEmptyHand) {
            this.game.monitorOpponentEmptyHand = false; // 一度だけ発動させる
            this.game.showMessage('報復コイン効果発動! 相手に4のカードを与えました。', 'info');
            this.game.opponentHand.addCard(new Card(4));
            this.game.updateGameState();
            return true;
        }
        
        // Opponent has revival gimmick and player hand is empty
        if (this.game.opponentHasRevivalGimmick && this.game.playerHand.count === 0 && this.game.monitorPlayerEmptyHand) {
            this.game.monitorPlayerEmptyHand = false; // 一度だけ発動させる
            this.game.showMessage('相手の報復コイン効果発動! あなたに4のカードを与えました。', 'info');
            this.game.playerHand.addCard(new Card(4));
            this.game.updateGameState();
            return true;
        }
        
        return false;
    }

    // Apply power-up effect
    applyPowerupEffect(isPlayer) {
        if (isPlayer) {
            this.game.playerPowerupCount = 2;
        } else {
            this.game.opponentPowerupCount = 2;
        }
    }

    // Apply card recovery effect
    applyRecoveryEffect(isPlayer) {
        // Only apply if there are cards in the discard pile
        const discardPile = this.game.discardPile;
        if (discardPile.length === 0) {
            this.game.showMessage('回収できるカードがありません', 'warning');
            return;
        }
        
        // For player, show selection UI
        if (isPlayer) {
            this.showCardRecoveryUI(discardPile);
        } else {
            // For AI, select the highest value card
            const highestCard = discardPile.reduce(
                (highest, card) => card.value > highest.value ? card : highest,
                discardPile[0]
            );
            
            // Remove from discard pile and add to AI hand
            const index = discardPile.indexOf(highestCard);
            if (index !== -1) {
                discardPile.splice(index, 1);
                this.game.opponentHand.addCard(highestCard);
                this.game.updateGameState();
            }
        }
    }

    // Show UI for player to select a card to recover
    showCardRecoveryUI(discardPile) {
        const overlay = document.getElementById('game-overlay');
        const content = document.getElementById('overlay-content');
        
        content.innerHTML = `
            <h2>カード回収</h2>
            <p>手札に戻すカードを選択してください</p>
            <div class="card-selection"></div>
            <button id="cancel-recovery" class="game-button">キャンセル</button>
        `;
        
        const selectionContainer = content.querySelector('.card-selection');
        const cancelButton = content.querySelector('#cancel-recovery');
        
        // Display all cards in discard pile
        discardPile.forEach(card => {
            const cardClone = card.createElement();
            
            cardClone.addEventListener('click', () => {
                // Remove from discard pile and add to player hand
                const index = discardPile.indexOf(card);
                if (index !== -1) {
                    discardPile.splice(index, 1);
                    this.game.playerHand.addCard(card);
                    this.game.updateGameState();
                    overlay.classList.remove('show');
                }
            });
            
            selectionContainer.appendChild(cardClone);
        });
        
        cancelButton.addEventListener('click', () => {
            overlay.classList.remove('show');
        });
        
        overlay.classList.add('show');
    }

    // Apply field reset effect
    applyResetEffect(isPlayer) {
        // Mark that we're using reset coin (to prevent scoring)
        this.game.isResetCoinActive = true;
        
        // Clear the field and move cards to discard
        const clearedCards = this.game.field.clear();
        this.game.discardPile = this.game.discardPile.concat(clearedCards);
        
        // Set next turn to be the player who used this gimmick
        this.game.isPlayerTurn = isPlayer;
        
        // Block highest card for next turn
        if (isPlayer) {
            const highestCard = this.game.playerHand.getHighestCard();
            if (highestCard) {
                this.game.playerBlockedCardId = highestCard.id;
            }
        } else {
            const highestCard = this.game.opponentHand.getHighestCard();
            if (highestCard) {
                this.game.opponentBlockedCardId = highestCard.id;
            }
        }
        
        // Show message that no points are awarded when using reset coin
        this.game.showMessage('切断コインにより場がリセットされました。得点は入りません。', 'info');
        
        // Update game state
        this.game.updateGameState();
        
        // Clear reset coin flag after a moment
        setTimeout(() => {
            this.game.isResetCoinActive = false;
        }, 100);
        
        // Start the new turn directly (no points awarded)
        setTimeout(() => {
            if (this.game.gameActive) {
                this.game.startTurn();
            }
        }, 1000);
    }
}

// Export classes
window.GimmickCoin = GimmickCoin;
window.GimmickManager = GimmickManager;
