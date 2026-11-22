const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();

// Middleware для обробки даних з HTML-форм та JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(__dirname + '/ui'));

// Ініціалізація бази даних SQLite у пам'яті (створюється наново при кожному запуску)
const db = new sqlite3.Database(':memory:');

// Створення таблиць та заповнення тестовими даними
db.serialize(() => {
    // 1. Таблиця користувачів (містить секретні дані)
    db.run(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login TEXT,
        password TEXT,
        role TEXT,
        secret_note TEXT
    )`);

    const stmtUsers = db.prepare(`INSERT INTO users (login, password, role, secret_note) VALUES (?, ?, ?, ?)`);
    stmtUsers.run('admin', 'SuperSecretAdminPass2026!', 'admin', 'КЛЮЧ ДОСТУПУ ДО ПРОДАКШЕНУ: API_KEY_998877');
    stmtUsers.run('student', '12345', 'user', 'Нотатка студента: здати лабораторну до п’ятниці');
    stmtUsers.run('ivan', 'qwerty', 'user', 'Звичайний обліковий запис без секретів');
    stmtUsers.finalize();

    // 2. Таблиця товарів (для демонстрації витоку даних через UNION SELECT)
    db.run(`CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        price INTEGER
    )`);

    const stmtProducts = db.prepare(`INSERT INTO products (title, price) VALUES (?, ?)`);
    stmtProducts.run('Ноутбук ігровий', 35000);
    stmtProducts.run('Механічна клавіатура', 3200);
    stmtProducts.run('Бездротова миша', 1500);
    stmtProducts.finalize();
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/ui/index.html');
});

// =========================================================================
// ВРАЗЛИВИЙ МАРШРУТ 1: Обхід авторизації (Authentication Bypass)
// =========================================================================
app.post('/login', (req, res) => {
    const { login, password } = req.body;

    // НЕБЕЗПЕЧНО: пряма конкатенація рядків введених користувачем у SQL-запит
    const query = "SELECT * FROM users WHERE login = '" + login + "' AND password = '" + password + "'";
    
    // Виводимо сформований запит у консоль сервера для наочності під час доповіді
    console.log('[SQL LOGIN QUERY]:', query);

    db.get(query, (err, user) => {
        if (err) {
            // Вивід помилки БД (допомагає при Error-based SQLi)
            return res.status(500).json({ error: err.message, executed_query: query });
        }

        if (user) {
            res.json({
                status: 'Успішний вхід!',
                executed_query: query,
                user_data: user
            });
        } else {
            res.status(401).json({
                status: 'Помилка: невірний логін або пароль',
                executed_query: query
            });
        }
    });
});

// =========================================================================
// ВРАЗЛИВИЙ МАРШРУТ 2: Витік даних із сусідніх таблиць (UNION-based SQLi)
// =========================================================================
app.get('/search', (req, res) => {
    const searchQuery = req.query.q || '';

    // НЕБЕЗПЕЧНО: підстановка параметра пошуку напряму в оператор LIKE
    const query = "SELECT id, title, price FROM products WHERE title LIKE '%" + searchQuery + "%'";
    
    console.log('[SQL SEARCH QUERY]:', query);

    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message, executed_query: query });
        }

        res.json({
            executed_query: query,
            results: rows
        });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
});
