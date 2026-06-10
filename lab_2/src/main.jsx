import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const defaultArticleForm = {
  title: "",
  category: "Node.js",
  newCategory: "",
  content: ""
};

const API_URL = import.meta.env.DEV ? "http://127.0.0.1:3001" : "";

function apiPath(path) {
  return API_URL + path;
}

function formatDate(value) {
  return new Date(value).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function App() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Усі");
  const [token, setToken] = useState(localStorage.getItem("blogToken") || "");
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", username: "student", password: "1234" });
  const [articleForm, setArticleForm] = useState(defaultArticleForm);
  const [comments, setComments] = useState({});
  const [message, setMessage] = useState("");

  async function request(url, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(apiPath(url), {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Помилка запиту.");
    }

    return data;
  }

  async function loadCategories() {
    const response = await fetch(apiPath("/api/categories"));
    const data = await response.json();
    setCategories(data);

    if (data.length > 0 && !data.includes(articleForm.category)) {
      setArticleForm((current) => ({
        ...current,
        category: data[0]
      }));
    }
  }

  async function loadArticles() {
    const params = new URLSearchParams();

    if (search.trim() !== "") {
      params.set("search", search.trim());
    }

    if (selectedCategory !== "Усі") {
      params.set("category", selectedCategory);
    }

    const response = await fetch(apiPath(`/api/articles?${params.toString()}`));
    const data = await response.json();
    setArticles(data);
  }

  async function loadCurrentUser() {
    if (!token) {
      return;
    }

    try {
      const data = await request("/api/me");
      setUser(data);
    } catch (error) {
      localStorage.removeItem("blogToken");
      setToken("");
      setUser(null);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadArticles();
  }, [search, selectedCategory]);

  useEffect(() => {
    loadCurrentUser();
  }, [token]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setMessage("");

    const url = authMode === "login" ? "/api/login" : "/api/register";

    try {
      const data = await request(url, {
        method: "POST",
        body: JSON.stringify(authForm)
      });

      localStorage.setItem("blogToken", data.token);
      setToken(data.token);
      setUser(data.user);
      setMessage(authMode === "login" ? "Вхід виконано." : "Реєстрація виконана.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleLogout() {
    try {
      await request("/api/logout", { method: "POST" });
    } catch (error) {
      console.log(error.message);
    }

    localStorage.removeItem("blogToken");
    setToken("");
    setUser(null);
    setMessage("Ви вийшли з облікового запису.");
  }

  async function handleArticleSubmit(event) {
    event.preventDefault();
    setMessage("");

    const category = articleForm.newCategory.trim() || articleForm.category;

    try {
      await request("/api/articles", {
        method: "POST",
        body: JSON.stringify({
          title: articleForm.title,
          category,
          content: articleForm.content
        })
      });

      setArticleForm({
        ...defaultArticleForm,
        category
      });
      setSelectedCategory("Усі");
      setMessage("Статтю додано.");
      await loadCategories();
      await loadArticles();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleCommentSubmit(articleId) {
    const text = (comments[articleId] || "").trim();

    if (text === "") {
      setMessage("Коментар не може бути порожнім.");
      return;
    }

    try {
      await request(`/api/articles/${articleId}/comments`, {
        method: "POST",
        body: JSON.stringify({ text })
      });

      setComments({
        ...comments,
        [articleId]: ""
      });
      setMessage("Коментар додано.");
      await loadArticles();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Node.js + Express + React</p>
          <h1>Навчальний блог</h1>
          <p className="hero-text">
            Статті, категорії, коментарі, авторизація, пошук і фільтрація в одному простому застосунку.
          </p>
        </div>

        <div className="user-box">
          {user ? (
            <>
              <span>Користувач: {user.name}</span>
              <button type="button" onClick={handleLogout}>Вийти</button>
            </>
          ) : (
            <span>Увійдіть, щоб додавати статті й коментарі.</span>
          )}
        </div>
      </header>

      <main className="layout">
        <section className="panel">
          <div className="section-title">
            <h2>Пошук і фільтр</h2>
          </div>

          <div className="filter-grid">
            <label>
              Пошук
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Назва, текст або автор"
              />
            </label>

            <label>
              Категорія
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                <option>Усі</option>
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {!user && (
          <section className="panel">
            <div className="section-title">
              <h2>Авторизація</h2>
              <div className="tabs">
                <button
                  type="button"
                  className={authMode === "login" ? "tab active" : "tab"}
                  onClick={() => setAuthMode("login")}
                >
                  Вхід
                </button>
                <button
                  type="button"
                  className={authMode === "register" ? "tab active" : "tab"}
                  onClick={() => setAuthMode("register")}
                >
                  Реєстрація
                </button>
              </div>
            </div>

            <form className="form" onSubmit={handleAuthSubmit}>
              {authMode === "register" && (
                <label>
                  Ім'я
                  <input
                    value={authForm.name}
                    onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                    placeholder="Ваше ім'я"
                  />
                </label>
              )}

              <label>
                Логін
                <input
                  value={authForm.username}
                  onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })}
                  placeholder="student"
                />
              </label>

              <label>
                Пароль
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                  placeholder="1234"
                />
              </label>

              <button type="submit">{authMode === "login" ? "Увійти" : "Зареєструватися"}</button>
            </form>
          </section>
        )}

        {user && (
          <section className="panel">
            <div className="section-title">
              <h2>Нова стаття</h2>
            </div>

            <form className="form" onSubmit={handleArticleSubmit}>
              <label>
                Назва
                <input
                  value={articleForm.title}
                  onChange={(event) => setArticleForm({ ...articleForm, title: event.target.value })}
                  placeholder="Введіть назву статті"
                />
              </label>

              <div className="filter-grid">
                <label>
                  Категорія
                  <select
                    value={articleForm.category}
                    onChange={(event) => setArticleForm({ ...articleForm, category: event.target.value })}
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Нова категорія
                  <input
                    value={articleForm.newCategory}
                    onChange={(event) => setArticleForm({ ...articleForm, newCategory: event.target.value })}
                    placeholder="Заповніть, якщо потрібна нова"
                  />
                </label>
              </div>

              <label>
                Текст статті
                <textarea
                  value={articleForm.content}
                  onChange={(event) => setArticleForm({ ...articleForm, content: event.target.value })}
                  placeholder="Напишіть текст статті"
                />
              </label>

              <button type="submit">Додати статтю</button>
            </form>
          </section>
        )}

        {message && <p className="message">{message}</p>}

        <section className="articles">
          {articles.map((article) => (
            <article className="article-card" key={article.id}>
              <div className="article-top">
                <span className="category">{article.category}</span>
                <span className="date">{formatDate(article.createdAt)}</span>
              </div>

              <h2>{article.title}</h2>
              <p className="content">{article.content}</p>
              <p className="meta">Автор: {article.authorName}</p>

              <div className="comments">
                <h3>Коментарі: {article.comments.length}</h3>

                {article.comments.map((comment) => (
                  <div className="comment" key={comment.id}>
                    <p>{comment.text}</p>
                    <span>{comment.authorName}, {formatDate(comment.createdAt)}</span>
                  </div>
                ))}

                {user && (
                  <div className="comment-form">
                    <input
                      value={comments[article.id] || ""}
                      onChange={(event) => setComments({
                        ...comments,
                        [article.id]: event.target.value
                      })}
                      placeholder="Ваш коментар"
                    />
                    <button type="button" onClick={() => handleCommentSubmit(article.id)}>
                      Додати
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}

          {articles.length === 0 && (
            <div className="empty">Статей за цими умовами не знайдено.</div>
          )}
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
