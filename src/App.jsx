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
     RAPPEL DES TÂCHES
     TEST : 10 SECONDES
  ========================= */

  useEffect(() => {
    if (!user) return;

    if (!("Notification" in window)) {
      console.log(
        "Les notifications ne sont pas supportées par ce navigateur.",
      );
      return;
    }

    const unfinishedTasks = tasks.filter((task) => !task.done);

    if (unfinishedTasks.length === 0) return;

    let timer;

    const sendReminder = () => {
      const count = unfinishedTasks.length;

      const message =
        count === 1
          ? "Il vous reste 1 tâche à accomplir aujourd'hui."
          : `Il vous reste ${count} tâches à accomplir aujourd'hui.`;

      if (Notification.permission === "granted") {
        new Notification("Carnet", {
          body: message,
          icon: "/icon-192.png",
        });
      }
    };

    const requestPermissionAndSchedule = async () => {
      let permission = Notification.permission;

      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission !== "granted") {
        console.log("Permission de notification refusée.");
        return;
      }

      /*
        TEST :

        La notification apparaît 10 secondes
        après que les tâches ont été récupérées.
      */

      timer = setTimeout(() => {
        sendReminder();
      }, 10000);
    };

    requestPermissionAndSchedule();

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
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
      {/* HEADER */}

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

            {/* TÂCHES TERMINÉES */}

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

            {Object.keys(groupedHistory).length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <History size={24} />
                </div>

                <h3>Aucun historique</h3>

                <p>Les tâches terminées apparaîtront ici.</p>
              </div>
            ) : (
              <div className="history-list">
                {Object.entries(groupedHistory).map(([date, dateTasks]) => (
                  <div className="history-group" key={date}>
                    <div className="history-date">{date}</div>

                    {dateTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onToggle={toggleTask}
                        onDelete={deleteTask}
                        onEdit={editTask}
                      />
                    ))}
                  </div>
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

      {/* NAVIGATION */}

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
