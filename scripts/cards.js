/**
 * cards.js - Card definitions and behaviors for Ahead by Eight game
 */

// Card class for creating number cards
class Card {
    constructor(value) {
        this.value = value;
        this.id = `card-${Math.random().toString(36).substr(2, 9)}`;
        this.element = null; // DOM element reference
    }

    // Create the card's DOM element
    createElement(faceUp = true) {
        const cardElement = document.createElement('div');
        cardElement.id = this.id;
        cardElement.className = `card ${faceUp ? '' : 'card-back'}`;
        cardElement.dataset.value = this.value;
        
        if (faceUp) {
            // Use card image instead of text
            const cardImage = document.createElement('img');
            cardImage.src = `images/card1/Card_${this.value}_patter1.png`;
            cardImage.alt = `Card ${this.value}`;
            cardImage.className = 'card-image';
            cardElement.appendChild(cardImage);
            
            // Fallback to text if image fails to load
            cardImage.onerror = () => {
                cardElement.removeChild(cardImage);
                cardElement.textContent = this.value;
            };
        }
        
        this.element = cardElement;
        return cardElement;
    }

    // Flip the card (show or hide value)
    flip() {
        if (!this.element) return;
        
        this.element.classList.toggle('card-back');
        if (this.element.classList.contains('card-back')) {
            this.element.innerHTML = '';
        } else {
            // Recreate the image when flipping face up
            const cardImage = document.createElement('img');
            cardImage.src = `images/card1/Card_${this.value}_patter1.png`;
            cardImage.alt = `Card ${this.value}`;
            cardImage.className = 'card-image';
            this.element.appendChild(cardImage);
            
            // Fallback to text if image fails to load
            cardImage.onerror = () => {
                this.element.removeChild(cardImage);
                this.element.textContent = this.value;
            };
        }
    }
}

// Deck class for managing the collection of cards
class Deck {
    constructor() {
        this.cards = [];
        this.initialize();
    }

    // Initialize a new deck with cards 1-8 (one of each)
    initialize() {
        this.cards = [];
        
        // Create one set of cards 1-8 for each player
        for (let i = 1; i <= 8; i++) {
            this.cards.push(new Card(i));
            this.cards.push(new Card(i));
        }
    }

    // Shuffle the deck
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
        return this.cards;
    }

    // Deal n cards from the deck
    deal(n) {
        if (n > this.cards.length) {
            n = this.cards.length;
        }
        
        return this.cards.splice(0, n);
    }
    
    // Return a card to the deck
    returnCard(card) {
        this.cards.push(card);
    }
    
    // Get the remaining number of cards
    get count() {
        return this.cards.length;
    }
}

// Hand class for managing a player's cards
class Hand {
    constructor() {
        this.cards = [];
    }
    
    // Add a card to hand
    addCard(card) {
        this.cards.push(card);
    }
    
    // Add multiple cards to hand
    addCards(cards) {
        this.cards = this.cards.concat(cards);
    }
    
    // Remove a specific card from hand
    removeCard(cardId) {
        const index = this.cards.findIndex(card => card.id === cardId);
        if (index !== -1) {
            return this.cards.splice(index, 1)[0];
        }
        return null;
    }
    
    // Check if hand has a card with value greater than target
    hasGreaterThan(targetValue) {
        return this.cards.some(card => card.value > targetValue);
    }
    
    // Get all cards with value greater than target
    getGreaterThan(targetValue) {
        return this.cards.filter(card => card.value > targetValue);
    }
    
    // Get the highest value card in hand
    getHighestCard() {
        if (this.cards.length === 0) return null;
        
        let highest = this.cards[0];
        for (let i = 1; i < this.cards.length; i++) {
            if (this.cards[i].value > highest.value) {
                highest = this.cards[i];
            }
        }
        
        return highest;
    }
    
    // Get the lowest value card in hand
    getLowestCard() {
        if (this.cards.length === 0) return null;
        
        let lowest = this.cards[0];
        for (let i = 1; i < this.cards.length; i++) {
            if (this.cards[i].value < lowest.value) {
                lowest = this.cards[i];
            }
        }
        
        return lowest;
    }
    
    // Get count of cards
    get count() {
        return this.cards.length;
    }
    
    // Sort cards by value
    sort() {
        this.cards.sort((a, b) => a.value - b.value);
    }
}

// Field class for managing cards in play
class Field {
    constructor() {
        this.cards = [];
        this.total = 0;
        this.reversed = false; // Flag for number reversal gimmick
    }
    
    // Add a card to the field
    addCard(card) {
        this.cards.push(card);
        this.updateTotal();
    }
    
    // Clear all cards from the field
    clear() {
        const discardedCards = [...this.cards];
        this.cards = [];
        this.total = 0;
        return discardedCards;
    }
    
    // Update the total sum of cards
    updateTotal() {
        // Use effectiveValue if available, otherwise use value
        this.total = this.cards.reduce((sum, card) => {
            return sum + (card.effectiveValue !== undefined ? card.effectiveValue : card.value);
        }, 0);
    }
    
    // Toggle number reversal effect
    toggleReversal() {
        this.reversed = !this.reversed;
    }
    
    // Get current highest card (considering effectiveValue for power-ups)
    getHighestCard() {
        if (this.cards.length === 0) return null;
        
        if (this.reversed) {
            // In reversed mode, the "strongest" card is the one with the lowest effective value
            return this.cards.reduce((strongest, card) => {
                const currentValue = card.effectiveValue !== undefined ? card.effectiveValue : card.value;
                const strongestValue = strongest.effectiveValue !== undefined ? strongest.effectiveValue : strongest.value;
                return currentValue < strongestValue ? card : strongest;
            }, this.cards[0]);
        } else {
            // In normal mode, the strongest card is the one with the highest effective value
            return this.cards.reduce((strongest, card) => {
                const currentValue = card.effectiveValue !== undefined ? card.effectiveValue : card.value;
                const strongestValue = strongest.effectiveValue !== undefined ? strongest.effectiveValue : strongest.value;
                return currentValue > strongestValue ? card : strongest;
            }, this.cards[0]);
        }
    }
    
    // Check if a card is playable on the field (higher than the highest card)
    isPlayable(card) {
        if (this.cards.length === 0) return true;
        
        const highestCard = this.getHighestCard();
        const highestValue = highestCard.effectiveValue !== undefined ? highestCard.effectiveValue : highestCard.value;
        
        if (this.reversed) {
            // In reversed mode, lower cards are stronger
            return card.value < highestValue;
        } else {
            // In normal mode, higher cards are stronger
            return card.value > highestValue;
        }
    }
    
    // Get count of cards
    get count() {
        return this.cards.length;
    }
}

// Export classes
window.Card = Card;
window.Deck = Deck;
window.Hand = Hand;
window.Field = Field;
