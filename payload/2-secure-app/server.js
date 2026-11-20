const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

// Налаштування EJS (на виріст для Учасника 2)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Ініціалізація ідентичної бази даних у пам'яті
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
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

// =========================================================================
// ЗАХИЩЕНИЙ МАРШРУТ 1: Авторизація через Prepared Statement
// =========================================================================
app.post('/login', (req, res) => {
    const { login, password } = req.body;

    // БЕЗПЕЧНО: використовуємо плейсхолдери '?' замість конкатенації рядків
    const query = "SELECT id, login, role, secret_note FROM users WHERE login = ? AND password = ?";
    
    console.log('[SECURE SQL LOGIN]:', query, '| Params:', [login, password]);

    // Драйвер sqlite3 передає параметри окремо від SQL-команди
    db.get(query, [login, password], (err, user) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Помилка сервера бази даних',
                executed_query: query,
                user: null,
                error: err.message
            });
        }

        if (user) {
            // Учасник 2 може замінити цей рядок на: res.render('result', { ... })
            res.json({
                success: true,
                message: 'Успішний вхід у систему!',
                executed_query: query,
                params: [login, '***'],
                user: user,
                error: null
            });
        } else {
            // При спробі ввести "admin' --" база шукатиме користувача з буквальним логіном "admin' --"
            res.status(401).json({
                success: false,
                message: 'Невірний логін або пароль (атаку заблоковано)',
                executed_query: query,
                params: [login, '***'],
                user: null,
                error: null
            });
        }
    });
});

// =========================================================================
// ЗАХИЩЕНИЙ МАРШРУТ 2: Пошук товарів через Prepared Statement
// =========================================================================
app.get('/search', (req, res) => {
    const searchQuery = req.query.q || '';

    // БЕЗПЕЧНО: символи % додаються до значення параметра в JS, а не в SQL-рядок
    const query = "SELECT id, title, price FROM products WHERE title LIKE ?";
    const safeParam = `%${searchQuery}%`;

    console.log('[SECURE SQL SEARCH]:', query, '| Param:', safeParam);

    db.all(query, [safeParam], (err, rows) => {
        if (err) {
            return res.status(500).json({
                executed_query: query,
                results: [],
                error: err.message
            });
        }

        // Учасник 2 може замінити цей рядок на: res.render('search', { ... })
        res.json({
            executed_query: query,
            param: safeParam,
            results: rows,
            error: null
        });
    });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Захищений сервер запущено на http://localhost:${PORT}`);
});
