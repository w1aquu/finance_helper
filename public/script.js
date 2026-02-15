let currentUser = null;
let expenseChart = null;

// Регистрация пользователя
async function register() {
    const userData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        income: parseFloat(document.getElementById('income').value) || 0,
        goal: document.getElementById('goal').value
    };
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        currentUser = { id: data.id, ...userData };
        
        // Показываем основной интерфейс
        document.getElementById('register-section').style.display = 'none';
        document.getElementById('main-section').style.display = 'block';
        
        // Обновляем отображение
        document.getElementById('display-income').textContent = userData.income;
        document.getElementById('display-goal').textContent = userData.goal;
        
        loadExpenses();
        calculateKFG();
    } catch (error) {
        alert('Ошибка регистрации: ' + error.message);
    }
}

// Добавление расхода
async function addExpense() {
    if (!currentUser) return;
    
    const expense = {
        user_id: currentUser.id,
        category: document.getElementById('category').value,
        amount: parseFloat(document.getElementById('amount').value)
    };
    
    try {
        await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expense)
        });
        
        document.getElementById('amount').value = '';
        loadExpenses();
        calculateKFG();
    } catch (error) {
        alert('Ошибка добавления расхода');
    }
}

// Загрузка расходов и обновление диаграммы
async function loadExpenses() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/expenses/${currentUser.id}`);
        const expenses = await response.json();
        
        // Подготовка данных для круговой диаграммы
        const categories = expenses.map(e => e.category);
        const amounts = expenses.map(e => e.total);
        
        // Создание/обновление диаграммы
        const ctx = document.getElementById('expenseChart').getContext('2d');
        
        if (expenseChart) {
            expenseChart.destroy();
        }
        
        expenseChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: categories,
                datasets: [{
                    data: amounts,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#36A2EB'
                    ]
                }]
            }
        });
    } catch (error) {
        console.error('Ошибка загрузки расходов:', error);
    }
}

// Расчет КФГ
async function calculateKFG() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/kfg/${currentUser.id}`);
        const data = await response.json();
        
        document.getElementById('kfg-value').textContent = data.kfg + '%';
        document.getElementById('kfg-progress').style.width = data.kfg + '%';
    } catch (error) {
        console.error('Ошибка расчета КФГ:', error);
    }
}

// Отправка сообщения чат-боту
async function sendChat() {
    const input = document.getElementById('chat-input');
    const message = input.value;
    if (!message.trim() || !currentUser) return;
    
    // Добавляем сообщение пользователя в чат
    const chatBox = document.getElementById('chat-messages');
    chatBox.innerHTML += `<div class="user-message">👤 ${message}</div>`;
    input.value = '';
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                message: message
            })
        });
        
        const data = await response.json();
        chatBox.innerHTML += `<div class="bot-message">🤖 ${data.response}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (error) {
        chatBox.innerHTML += `<div class="error-message">❌ Ошибка связи с ботом</div>`;
    }
}