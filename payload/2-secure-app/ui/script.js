"use strict";

function fillLogin(mode) {
    let loginInput = document.getElementById("loginInput");
    let passwordInput = document.getElementById("passwordInput");

    if (mode === "normal") {
        loginInput.value = "student";
        passwordInput.value = "12345";
    } else if (mode === "bypass") {
        loginInput.value = "admin' --";
        passwordInput.value = "будь-що";
    } else if (mode === "tautology") {
        loginInput.value = "' OR '1'='1' --";
        passwordInput.value = "x";
    } else if (mode === "error") {
        loginInput.value = "'";
        passwordInput.value = "x";
    }
}

function fillSearch(mode) {
    let searchInput = document.getElementById("searchInput");

    if (mode === "normal") {
        searchInput.value = "миша";
    } else if (mode === "users") {
        searchInput.value = "' UNION SELECT id, login, password FROM users --";
    } else if (mode === "secret") {
        searchInput.value = "' UNION SELECT id, secret_note, 0 FROM users WHERE role='admin' --";
    } else if (mode === "tables") {
        searchInput.value = "' UNION SELECT 1, name, 0 FROM sqlite_master WHERE type='table' --";
    }
}

let loginForm = document.getElementById("loginForm");
loginForm.addEventListener("submit", e => sendLogin(e));

async function sendLogin(e) {
    e.preventDefault();

    let loginValue = document.getElementById("loginInput").value;
    let passwordValue = document.getElementById("passwordInput").value;

    let user = {
        login: loginValue,
        password: passwordValue
    };

    let response = await fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json;charset=utf-8"
        },
        body: JSON.stringify(user)
    });

    let data = await response.json();
    treatLoginData(data);
}

function treatLoginData(data) {
    let block = document.getElementById("loginResult");
    block.innerHTML = "";

    if (data.executed_query) {
        let paramsText = "";
        if (data.params) {
            paramsText = "<br/><strong>Параметри:</strong> <code>" + JSON.stringify(data.params) + "</code>";
        }
        block.innerHTML += "<div class='alert alert-secondary'><strong>Підготовлений SQL-запит:</strong><br/><code>"
            + data.executed_query + "</code>" + paramsText + "</div>";
    }

    if (data.error) {
        block.innerHTML += "<div class='alert alert-warning'><strong>Помилка БД:</strong> "
            + data.error + "</div>";
    } else if (data.user) {
        block.innerHTML += "<div class='alert alert-success'><strong>" + data.message + "</strong></div>";
        block.innerHTML += "<ul class='list-group'>"
            + "<li class='list-group-item'><strong>ID:</strong> " + data.user.id + "</li>"
            + "<li class='list-group-item'><strong>Логін:</strong> " + data.user.login + "</li>"
            + "<li class='list-group-item'><strong>Роль:</strong> " + data.user.role + "</li>"
            + "<li class='list-group-item'><strong>Секретна нотатка:</strong> " + data.user.secret_note + "</li>"
            + "</ul>";
    } else {
        block.innerHTML += "<div class='alert alert-danger'><strong>" + data.message + "</strong></div>";
    }
}

let searchForm = document.getElementById("searchForm");
searchForm.addEventListener("submit", e => getSearchData(e));

function getSearchData(e) {
    e.preventDefault();

    let searchValue = document.getElementById("searchInput").value;
    let url = "/search?q=" + searchValue;

    fetch(url)
        .then(response => response.json())
        .then(res => treatSearchData(res));
}

function treatSearchData(data) {
    let block = document.getElementById("searchResult");
    block.innerHTML = "";

    if (data.executed_query) {
        let paramText = "";
        if (data.param) {
            paramText = "<br/><strong>Параметр:</strong> <code>" + data.param + "</code>";
        }
        block.innerHTML += "<div class='alert alert-secondary'><strong>Підготовлений SQL-запит:</strong><br/><code>"
            + data.executed_query + "</code>" + paramText + "</div>";
    }

    if (data.error) {
        block.innerHTML += "<div class='alert alert-warning'><strong>Помилка БД:</strong> "
            + data.error + "</div>";
    } else if (data.results && data.results.length > 0) {
        let tableHtml = "<table class='table table-bordered table-striped'>"
            + "<thead><tr><th>ID</th><th>Назва (title)</th><th>Ціна (price)</th></tr></thead><tbody>";

        for (let item of data.results) {
            tableHtml += "<tr>"
                + "<td>" + item.id + "</td>"
                + "<td>" + item.title + "</td>"
                + "<td>" + item.price + "</td>"
                + "</tr>";
        }

        tableHtml += "</tbody></table>";
        block.innerHTML += tableHtml;
    } else {
        block.innerHTML += "<div class='alert alert-info'>Нічого не знайдено.</div>";
    }
}
