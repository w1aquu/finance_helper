const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Подключаем БД
const db = new sqlite3.Database('./database.sqlite');

// Создаем таблицы
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    income REAL DEFAULT 0,
    goal TEXT,
    kfg REAL DEFAULT 0
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT DEFAULT CURRENT_DATE,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS friends (
    user_id INTEGER,
    friend_id INTEGER,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(friend_id) REFERENCES users(id)
  )`);
});

// API endpoints
app.post('/api/register', (req, res) => {
  const { name, email, income, goal } = req.body;
  db.run(
    'INSERT INTO users (name, email, income, goal) VALUES (?, ?, ?, ?)',
    [name, email, income, goal],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.post('/api/expenses', (req, res) => {
  const { user_id, category, amount } = req.body;
  db.run(
    'INSERT INTO expenses (user_id, category, amount) VALUES (?, ?, ?)',
    [user_id, category, amount],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.get('/api/expenses/:userId', (req, res) => {
  db.all(
    'SELECT category, SUM(amount) as total FROM expenses WHERE user_id = ? GROUP BY category',
    [req.params.userId],
    (err, rows) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Расчет КФГ (коэффициента финансовой грамотности)
app.get('/api/kfg/:userId', (req, res) => {
  db.get('SELECT income FROM users WHERE id = ?', [req.params.userId], (err, user) => {
    if (err) return res.status(400).json({ error: err.message });
    
    db.get('SELECT SUM(amount) as total FROM expenses WHERE user_id = ?', [req.params.userId], (err, expenses) => {
      if (err) return res.status(400).json({ error: err.message });
      
      const income = user.income || 1; // избегаем деления на ноль
      const totalExpenses = expenses.total || 0;
      const kfg = ((income - totalExpenses) / income) * 100;
      
      // Обновляем КФГ в профиле
      db.run('UPDATE users SET kfg = ? WHERE id = ?', [kfg, req.params.userId]);
      
      res.json({ kfg: Math.max(0, kfg).toFixed(2) });
    });
  });
});

// Чат-бот с DeepSeek
app.post('/api/chat', async (req, res) => {
  const { userId, message } = req.body;
  
  try {
    // Получаем данные пользователя для контекста
    db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err) return res.status(400).json({ error: err.message });
      
      db.all('SELECT category, SUM(amount) as total FROM expenses WHERE user_id = ? GROUP BY category', [userId], async (err, expenses) => {
        // Формируем контекст для LLM
        const context = `Пользователь: ${user.name}, доход: ${user.income} руб/мес, цель: ${user.goal}. Траты по категориям: ${JSON.stringify(expenses)}`;
        
        // Здесь интеграция с DeepSeek через llm-adapter или напрямую
        // Для простоты пока заглушка
        const botResponse = `Совет по экономии: анализируя ваши траты, рекомендую обратить внимание на категорию с наибольшими расходами.`;
        
        res.json({ response: botResponse });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${port}`);
});