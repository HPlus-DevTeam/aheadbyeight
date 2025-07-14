/**
 * profile.js - Profile management for Ahead by Eight
 */

// Profile management functionality
document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const quitButton = document.getElementById('quit-button');
    const playerNameInput = document.getElementById('player-name');
    const avatarInitialEl = document.getElementById('avatar-initial');
    const countryFlagEl = document.getElementById('country-flag');
    const countryFlagMiniEl = document.getElementById('country-flag-mini');
    const countryNameEl = document.getElementById('country-name');
    const saveProfileButton = document.getElementById('save-profile');
    const resetStatsButton = document.getElementById('reset-stats');
    const gamesPlayedEl = document.getElementById('games-played');
    const winsEl = document.getElementById('wins');
    const winRateEl = document.getElementById('win-rate');

    // Profile data structure
    let profileData = {
        playerName: '',
        countryCode: '',
        countryName: '',
        stats: {
            gamesPlayed: 0,
            wins: 0
        }
    };

    // Initialize
    init();

    // Functions
    function init() {
        // Load profile data from localStorage
        loadProfileData();
        
        // Update UI with loaded data
        updateUI();
        
        // Detect country (if not already set)
        if (!profileData.countryCode) {
            detectCountry();
        }
        
        // Set up event listeners
        setupEventListeners();
    }

    function loadProfileData() {
        const savedProfile = localStorage.getItem('aheadByEightProfile');
        
        if (savedProfile) {
            try {
                profileData = JSON.parse(savedProfile);
            } catch (e) {
                console.error('Failed to parse profile data:', e);
                // Use default profile
            }
        }
    }

    function saveProfileData() {
        localStorage.setItem('aheadByEightProfile', JSON.stringify(profileData));
    }

    function updateUI() {
        // Update player name
        playerNameInput.value = profileData.playerName || '';
        
        // Update avatar initial
        const initial = (profileData.playerName && profileData.playerName.charAt(0)) || 'P';
        avatarInitialEl.textContent = initial.toUpperCase();
        
        // Update country
        if (profileData.countryCode) {
            countryFlagEl.innerHTML = `<img src="https://flagcdn.com/48x36/${profileData.countryCode.toLowerCase()}.png" alt="${profileData.countryName}">`;
            countryFlagMiniEl.innerHTML = `<img src="https://flagcdn.com/48x36/${profileData.countryCode.toLowerCase()}.png" alt="${profileData.countryName}">`;
            countryNameEl.textContent = profileData.countryName;
        }
        
        // Update stats
        gamesPlayedEl.textContent = profileData.stats.gamesPlayed;
        winsEl.textContent = profileData.stats.wins;
        
        // Calculate win rate
        const winRate = profileData.stats.gamesPlayed > 0 
            ? Math.round((profileData.stats.wins / profileData.stats.gamesPlayed) * 100) 
            : 0;
        winRateEl.textContent = `${winRate}%`;
    }

    function setupEventListeners() {
        // Quit button
        if (quitButton) {
            quitButton.addEventListener('click', () => {
                if (confirm('変更を保存せずにトップページに戻りますか？')) {
                    window.location.href = 'index.html';
                }
            });
        }
        
        // Player name input
        if (playerNameInput) {
            playerNameInput.addEventListener('input', () => {
                // Update avatar initial in real-time
                const initial = playerNameInput.value.charAt(0) || 'P';
                avatarInitialEl.textContent = initial.toUpperCase();
            });
        }
        
        // Save profile button
        if (saveProfileButton) {
            saveProfileButton.addEventListener('click', () => {
                // Get player name from input
                const newName = playerNameInput.value.trim();
                
                // Validate
                if (!newName) {
                    showMessage('プレイヤー名を入力してください', 'warning');
                    return;
                }
                
                // Update profile data
                profileData.playerName = newName;
                
                // Save to localStorage
                saveProfileData();
                
                // Show success message
                showMessage('プロフィールを保存しました', 'info');
                
                // Pulse animation on flag
                countryFlagEl.classList.add('country-flag-pulse');
                setTimeout(() => {
                    countryFlagEl.classList.remove('country-flag-pulse');
                }, 500);
            });
        }
        
        // Reset stats button
        if (resetStatsButton) {
            resetStatsButton.addEventListener('click', () => {
                if (confirm('ゲーム統計をリセットしますか？この操作は取り消せません。')) {
                    // Reset stats
                    profileData.stats = {
                        gamesPlayed: 0,
                        wins: 0
                    };
                    
                    // Save to localStorage
                    saveProfileData();
                    
                    // Update UI
                    updateUI();
                    
                    // Show message
                    showMessage('ゲーム統計をリセットしました', 'info');
                }
            });
        }
    }

    async function detectCountry() {
        try {
            // Use free IP geolocation API
            const response = await fetch('https://ipapi.co/json/');
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            
            // Update profile with country data
            profileData.countryCode = data.country.toLowerCase();
            profileData.countryName = data.country_name;
            
            // Save updated profile
            saveProfileData();
            
            // Update UI
            countryFlagEl.innerHTML = `<img src="https://flagcdn.com/48x36/${profileData.countryCode.toLowerCase()}.png" alt="${profileData.countryName}">`;
            countryFlagMiniEl.innerHTML = `<img src="https://flagcdn.com/48x36/${profileData.countryCode.toLowerCase()}.png" alt="${profileData.countryName}">`;
            countryNameEl.textContent = profileData.countryName;
            
            // Pulse animation on flag
            countryFlagEl.classList.add('country-flag-pulse');
            setTimeout(() => {
                countryFlagEl.classList.remove('country-flag-pulse');
            }, 500);
        } catch (error) {
            console.error('Failed to detect country:', error);
            countryNameEl.textContent = '検出できませんでした';
        }
    }

    function showMessage(message, type = 'default') {
        const messageEl = document.getElementById('game-message');
        if (!messageEl) return;
        
        // Set message
        messageEl.textContent = message;
        messageEl.className = `game-message ${type} show`;
        
        // Auto-hide after delay
        setTimeout(() => {
            messageEl.classList.remove('show');
        }, 3000);
    }

    // Utility function to generate a random color
    function getRandomColor() {
        const colors = [
            '#3498db', // Blue
            '#e74c3c', // Red
            '#2ecc71', // Green
            '#f1c40f', // Yellow
            '#9b59b6', // Purple
            '#e67e22', // Orange
        ];
        
        return colors[Math.floor(Math.random() * colors.length)];
    }
});

// Export for use in other files
window.updatePlayerStats = function(won) {
    // Load profile
    const savedProfile = localStorage.getItem('aheadByEightProfile');
    let profileData = savedProfile ? JSON.parse(savedProfile) : {
        playerName: '',
        countryCode: '',
        countryName: '',
        stats: {
            gamesPlayed: 0,
            wins: 0
        }
    };
    
    // Update stats
    profileData.stats.gamesPlayed++;
    if (won) {
        profileData.stats.wins++;
    }
    
    // Save updated profile
    localStorage.setItem('aheadByEightProfile', JSON.stringify(profileData));
    
    return profileData;
};

window.getPlayerProfile = function() {
    const savedProfile = localStorage.getItem('aheadByEightProfile');
    return savedProfile ? JSON.parse(savedProfile) : null;
};
