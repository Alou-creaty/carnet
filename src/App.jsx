import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  Home,
  History,
  CircleUserRound,
  Sun,
  Moon,
  LogOut,
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";

import TaskItem from "./components/TaskItem";
import Auth from "./Auth";

import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const loadingStart = useRef(Date.now());

  const [tasks, setTasks] = useState([]);

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("carnet-theme") === "dark";
  });

  const [activePage, setActivePage] = useState("home");
  const [search, setSearch] = useState("");

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");

  const [historyWeekStart, setHistoryWeekStart] = useState(() => {
    const date = new Date();
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + diff);

    return date;
  });

  const [selectedHistoryDate, setSelectedHistoryDate] = useState(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  });

  /* =========================
     AUTHENTIFICATION
  ========================= */

  useEffect(() => {
    let timeoutId;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      const elapsed = Date.now() - loadingStart.current;
      const remaining = Math.max(1200 - elapsed, 0);

      timeoutId = setTimeout(() => {
        setUser(currentUser);
        setLoadingAuth(false);
      }, remaining);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  /* =========================
     RÉCUPÉRATION DES TÂCHES
  ========================= */

  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    const tasksRef = collection(db, "users", user.uid, "tasks");

    const tasksQuery = query(tasksRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const firestoreTasks = snapshot.docs.map((taskDoc) => ({
          id: taskDoc.id,
          ...taskDoc.data(),
        }));

        setTasks(firestoreTasks);
      },
      (error) => {
        console.error("Erreur lors de la récupération des tâches :", error);
      },
    );

    return () => unsubscribe();
  }, [user]);

  /* =========================
     THÈME
  ========================= */

  useEffect(() => {
    document.body.className = darkMode ? "dark" : "light";

    localStorage.setItem("carnet-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  /* =========================
     NOTIFICATION DE RAPPEL
  ========================= */

  useEffect(() => {
    if (!user) return;

    if (!("Notification" in window)) return;

    const unfinishedTasks = tasks.filter((task) => !task.done);

    if (unfinishedTasks.length === 0) return;

    let timeoutId;

    const sendNotification = () => {
      const count = unfinishedTasks.length;

      new Notification("Carnet", {
        body:
          count === 1
            ? "Il vous reste 1 tâche à accomplir aujourd'hui."
            : `Il vous reste ${count} tâches à accomplir aujourd'hui.`,
        icon: "/icon-192.png",
      });
    };

    const scheduleNotification = () => {
      timeoutId = setTimeout(sendNotification, 10000);
    };

    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          scheduleNotification();
        }
      });
    } else if (Notification.permission === "granted") {
      scheduleNotification();
    }

    return () => clearTimeout(timeoutId);
  }, [user, tasks]);

  /* =========================
     VÉRIFIER SI UNE DATE EST AUJOURD'HUI
  ========================= */

  const isToday = (date) => {
    if (!date) return false;

    const taskDate = new Date(date);
    const today = new Date();

    return (
      taskDate.getFullYear() === today.getFullYear() &&
      taskDate.getMonth() === today.getMonth() &&
      taskDate.getDate() === today.getDate()
    );
  };

  /* =========================
     AJOUTER UNE TÂCHE
  ========================= */

  const addTask = async () => {
    const cleanText = newTaskText.trim();

    if (!cleanText || !user) return;

    try {
      const tasksRef = collection(db, "users", user.uid, "tasks");

      await addDoc(tasksRef, {
        text: cleanText,
        done: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        completedAt: null,
      });

      setNewTaskText("");
      setShowAddTask(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout de la tâche :", error);
    }
  };

  /* =========================
     COCHER / DÉCOCHER UNE TÂCHE
  ========================= */

  const toggleTask = async (id) => {
    if (!user) return;

    const task = tasks.find((task) => task.id === id);

    if (!task) return;

    const taskRef = doc(db, "users", user.uid, "tasks", id);

    try {
      await updateDoc(taskRef, {
        done: !task.done,

        completedAt: !task.done ? new Date().toISOString() : null,

        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Erreur lors de la modification de la tâche :", error);
    }
  };

  /* =========================
     SUPPRIMER UNE TÂCHE
  ========================= */

  const deleteTask = async (id) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "tasks", id));
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
    }
  };

  /* =========================
     MODIFIER UNE TÂCHE
  ========================= */

  const editTask = async (id, newText) => {
    const cleanText = newText.trim();

    if (!cleanText || !user) return;

    try {
      await updateDoc(doc(db, "users", user.uid, "tasks", id), {
        text: cleanText,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Erreur lors de la modification :", error);
    }
  };

  /* =========================
     DÉCONNEXION
  ========================= */

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActivePage("home");
    } catch (error) {
      console.error("Erreur de déconnexion :", error);
    }
  };

  /* =========================
     TÂCHES DE LA JOURNÉE
  ========================= */

  // Sur l'accueil :
  //
  // - Toutes les tâches non terminées restent visibles.
  // - Les tâches terminées aujourd'hui restent visibles.
  // - Les tâches terminées les jours précédents
  //   sont déplacées vers l'historique.

  const homeTasks = tasks.filter(
    (task) => !task.done || isToday(task.completedAt),
  );

  /* =========================
     PROGRESSION DU JOUR
  ========================= */

  const completedTasks = homeTasks.filter((task) => task.done).length;

  const progress =
    homeTasks.length === 0
      ? 0
      : Math.round((completedTasks / homeTasks.length) * 100);

  /* =========================
     RECHERCHE
  ========================= */

  const filteredTasks = homeTasks.filter((task) =>
    task.text.toLowerCase().includes(search.toLowerCase()),
  );

  const activeTasks = filteredTasks.filter((task) => !task.done);

  const completedFilteredTasks = filteredTasks.filter((task) => task.done);

  /* =========================
     FORMATAGE DES DATES
  ========================= */

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  /* =========================
     HISTORIQUE
  ========================= */

  // Une tâche terminée aujourd'hui
  // reste sur l'accueil.
  //
  // Une tâche terminée avant aujourd'hui
  // apparaît dans l'historique.

  const historyTasks = tasks.filter(
    (task) => task.done && task.completedAt && !isToday(task.completedAt),
  );

  const groupedHistory = historyTasks.reduce((groups, task) => {
    const date = formatDate(task.completedAt);

    if (!groups[date]) {
      groups[date] = [];
    }

    groups[date].push(task);

    return groups;
  }, {});

  /* =========================
     CALENDRIER DE L'HISTORIQUE
  ========================= */

  const getDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const getWeekDays = (weekStart) => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });
  };

  const historyWeekDays = getWeekDays(historyWeekStart);

  const getDayCompletedTasks = (date) => {
    const dateKey = getDateKey(date);

    return tasks.filter(
      (task) =>
        task.done &&
        task.completedAt &&
        getDateKey(new Date(task.completedAt)) === dateKey,
    );
  };

  const getDayProgress = (date) => {
    const dateKey = getDateKey(date);

    const completed = getDayCompletedTasks(date).length;

    const unfinishedCreatedThatDay = tasks.filter((task) => {
      if (task.done || !task.createdAt) return false;

      const createdDate =
        task.createdAt?.toDate?.() || new Date(task.createdAt);

      return getDateKey(createdDate) === dateKey;
    }).length;

    const total = completed + unfinishedCreatedThatDay;

    return total === 0 ? 0 : Math.round((completed / total) * 100);
  };

  const selectedHistoryTasks = tasks.filter(
    (task) =>
      task.done &&
      task.completedAt &&
      getDateKey(new Date(task.completedAt)) === selectedHistoryDate,
  );

  const selectedHistoryDateObject = new Date(`${selectedHistoryDate}T12:00:00`);

  const selectedHistoryDateLabel = selectedHistoryDateObject.toLocaleDateString(
    "fr-FR",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  const historyWeekLabel = (() => {
    const first = historyWeekDays[0];
    const last = historyWeekDays[6];

    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()} – ${last.getDate()} ${last.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
    }

    return `${first.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${last.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;
  })();

  const changeHistoryWeek = (amount) => {
    const newStart = new Date(historyWeekStart);
    newStart.setDate(newStart.getDate() + amount * 7);

    const newSelectedDate = new Date(selectedHistoryDateObject);
    newSelectedDate.setDate(newSelectedDate.getDate() + amount * 7);

    setHistoryWeekStart(newStart);
    setSelectedHistoryDate(getDateKey(newSelectedDate));
  };

  /* =========================
     CHARGEMENT
  ========================= */

  if (loadingAuth) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-shape auth-loading-shape-one"></div>

        <div className="auth-loading-shape auth-loading-shape-two"></div>

        <div className="auth-loading-content">
          <div className="auth-loading-logo">C</div>

          <h1>Carnet</h1>

          <p>Chargement...</p>

          <div className="auth-loading-spinner"></div>
        </div>
      </div>
    );
  }

  /* =========================
     UTILISATEUR NON CONNECTÉ
  ========================= */

  if (!user) {
    return <Auth />;
  }

  /* =========================
     APPLICATION
  ========================= */

  return (
    <div className="app">
      {/* =========================
          HEADER
      ========================= */}

      <header className="app-header">
        <div className="brand">
          <div className="brand-logo">C</div>

          <div>
            <h1>Carnet</h1>

            <span>
              {activePage === "home"
                ? "Vos tâches"
                : activePage === "history"
                  ? "Votre historique"
                  : "Votre compte"}
            </span>
          </div>
        </div>

        <button
          className="theme-button"
          onClick={() => setDarkMode((prev) => !prev)}
          aria-label="Changer le thème"
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* =========================
          CONTENU PRINCIPAL
      ========================= */}

      <main className="main-content">
        {/* =========================
            ACCUEIL
        ========================= */}

        {activePage === "home" && (
          <>
            <section className="welcome-section">
              <p className="small-label">Aujourd'hui</p>

              <h2>
                Bonjour
                {user.email ? `, ${user.email.split("@")[0]}` : ""}
              </h2>

              <p className="welcome-description">
                Organisez vos tâches simplement.
              </p>
            </section>

            {/* PROGRESSION */}

            <section className="progress-card">
              <div className="progress-top">
                <div>
                  <span>Progression</span>

                  <strong>{progress}%</strong>
                </div>

                <span>
                  {completedTasks}/{homeTasks.length} terminées
                </span>
              </div>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                ></div>
              </div>
            </section>

            {/* RECHERCHE */}

            <div className="search-box">
              <Search size={19} />

              <input
                type="text"
                placeholder="Rechercher une tâche..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {search && (
                <button className="clear-search" onClick={() => setSearch("")}>
                  ×
                </button>
              )}
            </div>

            {/* TÂCHES À FAIRE */}

            <section className="tasks-section">
              <div className="section-heading">
                <div>
                  <p className="small-label">À faire</p>

                  <h3>{activeTasks.length} tâche(s)</h3>
                </div>
              </div>

              {activeTasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <Check size={24} />
                  </div>

                  <h3>
                    {search ? "Aucune tâche trouvée" : "Tout est terminé"}
                  </h3>

                  <p>
                    {search
                      ? "Essayez avec un autre mot."
                      : "Vous n'avez plus de tâche en attente."}
                  </p>
                </div>
              ) : (
                <div className="task-list">
                  {activeTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={toggleTask}
                      onDelete={deleteTask}
                      onEdit={editTask}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* TÂCHES TERMINÉES AUJOURD'HUI */}

            {completedFilteredTasks.length > 0 && (
              <section className="tasks-section">
                <div className="section-heading">
                  <div>
                    <p className="small-label">Terminées aujourd'hui</p>

                    <h3>{completedFilteredTasks.length} tâche(s)</h3>
                  </div>
                </div>

                <div className="task-list">
                  {completedFilteredTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={toggleTask}
                      onDelete={deleteTask}
                      onEdit={editTask}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* AJOUTER UNE TÂCHE */}

            {showAddTask ? (
              <div className="edit-container">
                <input
                  autoFocus
                  type="text"
                  placeholder="Nouvelle tâche..."
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addTask();
                    }

                    if (e.key === "Escape") {
                      setShowAddTask(false);
                      setNewTaskText("");
                    }
                  }}
                />

                <button
                  className="add-confirm-button"
                  onClick={addTask}
                  aria-label="Enregistrer"
                >
                  <Check size={20} />
                </button>

                <button
                  className="add-cancel-button"
                  onClick={() => {
                    setShowAddTask(false);
                    setNewTaskText("");
                  }}
                  aria-label="Annuler"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                className="add-task-button"
                onClick={() => setShowAddTask(true)}
              >
                <Plus size={20} />

                <span>Ajouter une tâche</span>
              </button>
            )}
          </>
        )}

        {/* =========================
            HISTORIQUE
        ========================= */}

        {activePage === "history" && (
          <section className="history-page">
            <div className="page-intro">
              <p className="small-label">Historique</p>

              <h2>Tâches terminées</h2>

              <p>Retrouvez ici les tâches que vous avez complétées.</p>
            </div>

            {/* CALENDRIER */}

            <section className="history-calendar">
              <div className="history-calendar-header">
                <button
                  className="history-calendar-arrow"
                  onClick={() => changeHistoryWeek(-1)}
                  aria-label="Semaine précédente"
                >
                  <ChevronLeft size={19} />
                </button>

                <div className="history-calendar-title">
                  <CalendarDays size={17} />
                  <span>{historyWeekLabel}</span>
                </div>

                <button
                  className="history-calendar-arrow"
                  onClick={() => changeHistoryWeek(1)}
                  aria-label="Semaine suivante"
                >
                  <ChevronRight size={19} />
                </button>
              </div>

              <div className="history-calendar-days">
                {historyWeekDays.map((date) => {
                  const dateKey = getDateKey(date);
                  const progress = getDayProgress(date);
                  const completedCount = getDayCompletedTasks(date).length;
                  const isSelected = dateKey === selectedHistoryDate;
                  const isCurrentDay = dateKey === getDateKey(new Date());

                  const circumference = 2 * Math.PI * 22;
                  const offset =
                    circumference - (progress / 100) * circumference;

                  return (
                    <button
                      className={`history-calendar-day ${
                        isSelected ? "selected" : ""
                      } ${isCurrentDay ? "today" : ""}`}
                      key={dateKey}
                      onClick={() => setSelectedHistoryDate(dateKey)}
                      aria-label={`Voir le ${date.toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}`}
                    >
                      <span className="history-calendar-weekday">
                        {date
                          .toLocaleDateString("fr-FR", {
                            weekday: "short",
                          })
                          .replace(".", "")
                          .charAt(0)
                          .toUpperCase()}
                      </span>

                      <span className="history-calendar-circle">
                        <svg viewBox="0 0 52 52" aria-hidden="true">
                          <circle
                            className="history-calendar-circle-bg"
                            cx="26"
                            cy="26"
                            r="22"
                          />

                          <circle
                            className="history-calendar-circle-progress"
                            cx="26"
                            cy="26"
                            r="22"
                            style={{
                              strokeDasharray: circumference,
                              strokeDashoffset: offset,
                            }}
                          />
                        </svg>

                        <strong>{date.getDate()}</strong>
                      </span>

                      <span className="history-calendar-count">
                        {completedCount > 0 ? completedCount : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* JOUR SÉLECTIONNÉ */}

            <div className="history-selected-heading">
              <div>
                <p className="small-label">Jour sélectionné</p>
                <h3>
                  {selectedHistoryDateLabel.charAt(0).toUpperCase()}
                  {selectedHistoryDateLabel.slice(1)}
                </h3>
              </div>

              <span>{selectedHistoryTasks.length} terminée(s)</span>
            </div>

            {selectedHistoryTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <History size={24} />
                </div>

                <h3>Aucune tâche ce jour-là</h3>

                <p>Les tâches terminées ce jour apparaîtront ici.</p>
              </div>
            ) : (
              <div className="history-list">
                {selectedHistoryTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                    onEdit={editTask}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* =========================
            COMPTE
        ========================= */}

        {activePage === "account" && (
          <section className="account-page">
            <div className="page-intro">
              <p className="small-label">Compte</p>

              <h2>Votre compte</h2>

              <p>Gérez votre session et vos informations.</p>
            </div>

            <div className="account-card">
              <div className="account-avatar">
                <CircleUserRound size={28} />
              </div>

              <div className="account-info">
                <span>Connecté avec</span>

                <strong>{user.email}</strong>
              </div>
            </div>

            <button className="logout-button" onClick={handleLogout}>
              <LogOut size={19} />

              <span>Se déconnecter</span>
            </button>
          </section>
        )}
      </main>

      {/* =========================
          NAVIGATION
      ========================= */}

      <nav className="bottom-nav">
        <button
          className={activePage === "home" ? "active" : ""}
          onClick={() => setActivePage("home")}
        >
          <Home size={21} />

          <span>Accueil</span>
        </button>

        <button
          className={activePage === "history" ? "active" : ""}
          onClick={() => setActivePage("history")}
        >
          <History size={21} />

          <span>Historique</span>
        </button>

        <button
          className={activePage === "account" ? "active" : ""}
          onClick={() => setActivePage("account")}
        >
          <CircleUserRound size={21} />

          <span>Compte</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
