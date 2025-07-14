/**
 * friend-match.js - Friend match system for Ahead by Eight
 */

class FriendMatchSystem {
    constructor() {
        this.recentOpponents = this.loadRecentOpponents();
        this.currentRoom = null;
        this.isHost = false;
        this.updateRecentOpponentsList();
    }
    
    // Load recent opponents from localStorage
    loadRecentOpponents() {
        const saved = localStorage.getItem('recentOpponents');
        if (saved) {
            return JSON.parse(saved);
        }
        return [];
    }
    
    // Save recent opponents
    saveRecentOpponents() {
        localStorage.setItem('recentOpponents', JSON.stringify(this.recentOpponents));
    }
    
    // Add opponent to recent list
    addRecentOpponent(name, roomCode) {
        // Check if opponent already exists
        const existingIndex = this.recentOpponents.findIndex(o => o.name === name);
        
        if (existingIndex !== -1) {
            // Move to top
            const opponent = this.recentOpponents.splice(existingIndex, 1)[0];
            opponent.lastPlayed = Date.now();
            this.recentOpponents.unshift(opponent);
        } else {
            // Add new opponent
            this.recentOpponents.unshift({
                name: name,
                lastPlayed: Date.now(),
                roomCode: roomCode
            });
        }
        
        // Keep only last 10 opponents
        this.recentOpponents = this.recentOpponents.slice(0, 10);
        
        this.saveRecentOpponents();
        this.updateRecentOpponentsList();
    }
    
    // Update recent opponents display
    updateRecentOpponentsList() {
        const container = document.getElementById('recent-opponents');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.recentOpponents.length === 0) {
            const noFriendsMsg = document.createElement('div');
            noFriendsMsg.className = 'no-friends-message';
            noFriendsMsg.innerHTML = '<p>まだ対戦履歴がありません</p>';
            container.appendChild(noFriendsMsg);
            return;
        }
        
        this.recentOpponents.forEach(opponent => {
            const item = document.createElement('div');
            item.className = 'friend-item';
            
            const name = document.createElement('span');
            name.className = 'friend-name';
            name.textContent = opponent.name;
            
            const inviteBtn = document.createElement('button');
            inviteBtn.className = 'game-button small-button';
            inviteBtn.textContent = '招待';
            inviteBtn.addEventListener('click', () => {
                this.inviteOpponent(opponent);
            });
            
            item.appendChild(name);
            item.appendChild(inviteBtn);
            container.appendChild(item);
        });
    }
    
    // Invite opponent to play
    inviteOpponent(opponent) {
        // Generate new room code
        const roomCode = this.generateRoomCode();
        
        // Show invitation sent message
        this.showMessage(`${opponent.name}に招待を送信しました。ルームコード: ${roomCode}`, 'info');
        
        // Simulate creating room
        setTimeout(() => {
            this.createRoom(roomCode);
        }, 500);
    }
    
    // Generate room code
    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    
    // Create room
    createRoom(roomCode) {
        this.currentRoom = {
            code: roomCode,
            host: 'player',
            players: ['player'],
            status: 'waiting'
        };
        
        this.isHost = true;
        
        // Show room creation panel
        document.getElementById('room-code').textContent = roomCode;
        document.getElementById('room-creation-panel').style.display = 'block';
        document.querySelector('.match-type').style.display = 'none';
        
        // Simulate opponent joining after random time
        const joinTime = 3000 + Math.random() * 5000;
        setTimeout(() => {
            if (this.currentRoom && this.currentRoom.status === 'waiting') {
                this.opponentJoined();
            }
        }, joinTime);
    }
    
    // Join room
    joinRoom(roomCode) {
        // Validate room code
        if (!this.validateRoomCode(roomCode)) {
            this.showMessage('無効なルームコードです', 'warning');
            return false;
        }
        
        this.currentRoom = {
            code: roomCode,
            host: 'opponent',
            players: ['opponent', 'player'],
            status: 'ready'
        };
        
        this.isHost = false;
        
        // Show joining message
        this.showMessage('ルームに接続中...', 'info');
        
        // Simulate successful join
        setTimeout(() => {
            this.showMessage('ルームに参加しました！ゲームを開始します...', 'info');
            setTimeout(() => {
                this.startFriendMatch();
            }, 1500);
        }, 1000);
        
        return true;
    }
    
    // Validate room code
    validateRoomCode(code) {
        return code.length === 4 && /^[A-Z0-9]{4}$/.test(code);
    }
    
    // Opponent joined the room
    opponentJoined() {
        if (!this.currentRoom) return;
        
        this.currentRoom.players.push('opponent');
        this.currentRoom.status = 'ready';
        
        this.showMessage('対戦相手が見つかりました！ゲームを開始します...', 'info');
        
        setTimeout(() => {
            this.startFriendMatch();
        }, 1500);
    }
    
    // Start friend match
    startFriendMatch() {
        if (!this.currentRoom) return;
        
        // Store match data in sessionStorage
        sessionStorage.setItem('friendMatch', JSON.stringify({
            roomCode: this.currentRoom.code,
            isHost: this.isHost,
            opponent: this.isHost ? 'フレンド' : 'ホスト'
        }));
        
        // Add to recent opponents
        const opponentName = this.isHost ? 'フレンド' : 'ホスト';
        this.addRecentOpponent(opponentName, this.currentRoom.code);
        
        // Navigate to game page
        window.location.href = `GamePage.html?mode=friend&room=${this.currentRoom.code}`;
    }
    
    // Cancel room
    cancelRoom() {
        this.currentRoom = null;
        this.isHost = false;
        
        document.getElementById('room-creation-panel').style.display = 'none';
        document.getElementById('room-joining-panel').style.display = 'none';
        document.querySelector('.match-type').style.display = 'block';
    }
    
    // Show message
    showMessage(message, type = 'default') {
        const messageEl = document.getElementById('game-message');
        if (!messageEl) return;
        
        messageEl.textContent = message;
        messageEl.className = `game-message ${type} show`;
        
        setTimeout(() => {
            messageEl.classList.remove('show');
        }, 3000);
    }
}

// Initialize friend match system
let friendMatchSystem;

document.addEventListener('DOMContentLoaded', () => {
    friendMatchSystem = new FriendMatchSystem();
    
    // Create room button
    const createRoomBtn = document.getElementById('create-room');
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', () => {
            const roomCode = friendMatchSystem.generateRoomCode();
            friendMatchSystem.createRoom(roomCode);
        });
    }
    
    // Cancel room button
    const cancelRoomBtn = document.getElementById('cancel-room');
    if (cancelRoomBtn) {
        cancelRoomBtn.addEventListener('click', () => {
            friendMatchSystem.cancelRoom();
        });
    }
    
    // Join room button
    const joinRoomBtn = document.getElementById('join-room');
    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', () => {
            document.getElementById('room-joining-panel').style.display = 'block';
            document.querySelector('.match-type').style.display = 'none';
        });
    }
    
    // Submit room code
    const submitCodeBtn = document.getElementById('submit-code');
    const roomCodeInput = document.getElementById('enter-room-code');
    const codeError = document.getElementById('code-error');
    
    if (submitCodeBtn) {
        submitCodeBtn.addEventListener('click', () => {
            const code = roomCodeInput.value.toUpperCase();
            codeError.style.display = 'none';
            
            if (friendMatchSystem.joinRoom(code)) {
                // Success - will redirect automatically
            } else {
                codeError.style.display = 'block';
            }
        });
    }
    
    // Cancel join
    const cancelJoinBtn = document.getElementById('cancel-join');
    if (cancelJoinBtn) {
        cancelJoinBtn.addEventListener('click', () => {
            friendMatchSystem.cancelRoom();
            codeError.style.display = 'none';
            roomCodeInput.value = '';
        });
    }
    
    // Enter key on room code input
    if (roomCodeInput) {
        roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitCodeBtn.click();
            }
        });
    }
});
