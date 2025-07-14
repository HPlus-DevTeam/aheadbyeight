/**
 * account.js - アカウント管理システム
 */

class AccountManager {
    constructor() {
        // アカウントデータの保存先
        this.STORAGE_KEY = 'ahead_by_eight_account';
        this.accountData = this.loadAccountData();
    }

    // アカウントデータの読み込み
    loadAccountData() {
        const savedData = localStorage.getItem(this.STORAGE_KEY);
        return savedData ? JSON.parse(savedData) : null;
    }

    // アカウントデータの保存
    saveAccountData() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.accountData));
    }

    // 20桁の16進数アカウント番号を生成
    generateAccountNumber() {
        const chars = '0123456789abcdef';
        let accountNumber = '';
        for (let i = 0; i < 20; i++) {
            accountNumber += chars[Math.floor(Math.random() * chars.length)];
        }
        return accountNumber;
    }

    // メールアドレスの検証
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // アカウント登録
    async registerAccount(email) {
        if (!this.validateEmail(email)) {
            throw new Error('無効なメールアドレスです');
        }

        // メールアドレスが既に登録されているかチェック
        if (this.accountData && this.accountData.email === email) {
            throw new Error('このメールアドレスは既に登録されています');
        }

        // アカウント番号の生成（既存の番号と重複しないようにする）
        let accountNumber;
        do {
            accountNumber = this.generateAccountNumber();
        } while (this.isAccountNumberExists(accountNumber));

        // アカウントデータの作成
        this.accountData = {
            email: email,
            accountNumber: accountNumber,
            registeredAt: new Date().toISOString(),
            rankingPoints: 0,
            matchHistory: []
        };

        // データを保存
        this.saveAccountData();

        // 登録確認メールの送信（実際のメール送信は実装が必要）
        await this.sendConfirmationEmail(email, accountNumber);

        return this.accountData;
    }

    // アカウント番号の重複チェック
    isAccountNumberExists(accountNumber) {
        // 実際のアプリケーションではサーバーサイドでチェックする必要があります
        return false;
    }

    // 登録確認メールの送信（実装が必要）
    async sendConfirmationEmail(email, accountNumber) {
        console.log(`確認メールを送信: ${email}, アカウント番号: ${accountNumber}`);
        // 実際のメール送信処理を実装する必要があります
    }

    // アカウント情報の取得
    getAccountInfo() {
        return this.accountData;
    }

    // ログイン状態のチェック
    isLoggedIn() {
        return this.accountData !== null;
    }

    // ランキングポイントの更新
    updateRankingPoints(points) {
        if (!this.accountData) return;

        this.accountData.rankingPoints = points;
        this.saveAccountData();
    }

    // 対戦履歴の追加
    addMatchHistory(matchData) {
        if (!this.accountData) return;

        this.accountData.matchHistory.push({
            ...matchData,
            timestamp: new Date().toISOString()
        });
        this.saveAccountData();
    }
}

// アカウント登録フォームの表示
function showRegistrationForm() {
    const overlay = document.createElement('div');
    overlay.className = 'account-overlay';
    overlay.innerHTML = `
        <div class="account-form">
            <h2>ランキング戦アカウント登録</h2>
            <p>ランキング戦に参加するにはメールアドレスの登録が必要です。</p>
            <form id="registration-form">
                <div class="form-group">
                    <label for="email">メールアドレス</label>
                    <input type="email" id="email" required>
                </div>
                <div class="form-buttons">
                    <button type="submit" class="primary-button">登録</button>
                    <button type="button" class="secondary-button" onclick="closeRegistrationForm()">キャンセル</button>
                </div>
            </form>
            <div id="registration-message" class="message"></div>
        </div>
    `;

    document.body.appendChild(overlay);

    // フォームのスタイルを追加
    const style = document.createElement('style');
    style.textContent = `
        .account-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .account-form {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 400px;
            width: 90%;
        }

        .account-form h2 {
            margin-bottom: 15px;
            color: #2c3e50;
        }

        .account-form p {
            margin-bottom: 20px;
            color: #666;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 5px;
            color: #2c3e50;
        }

        .form-group input {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
        }

        .form-buttons {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }

        .primary-button {
            background: #3498db;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
        }

        .secondary-button {
            background: #95a5a6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
        }

        .message {
            margin-top: 15px;
            padding: 10px;
            border-radius: 4px;
            display: none;
        }

        .message.success {
            background: #2ecc71;
            color: white;
            display: block;
        }

        .message.error {
            background: #e74c3c;
            color: white;
            display: block;
        }
    `;
    document.head.appendChild(style);

    // フォームの送信処理
    const form = document.getElementById('registration-form');
    const messageDiv = document.getElementById('registration-message');
    const accountManager = new AccountManager();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;

        try {
            const account = await accountManager.registerAccount(email);
            messageDiv.textContent = `登録が完了しました。アカウント番号: ${account.accountNumber}`;
            messageDiv.className = 'message success';

            // 3秒後にフォームを閉じる
            setTimeout(() => {
                closeRegistrationForm();
            }, 3000);
        } catch (error) {
            messageDiv.textContent = error.message;
            messageDiv.className = 'message error';
        }
    });
}

// 登録フォームを閉じる
function closeRegistrationForm() {
    const overlay = document.querySelector('.account-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// グローバルに公開
window.AccountManager = AccountManager;
window.showRegistrationForm = showRegistrationForm;
window.closeRegistrationForm = closeRegistrationForm;
