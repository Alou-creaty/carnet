import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { auth } from "./firebase";

function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setError("Cette adresse email est déjà utilisée.");
      } else if (error.code === "auth/invalid-email") {
        setError("Cette adresse email n'est pas valide.");
      } else if (error.code === "auth/weak-password") {
        setError("Le mot de passe doit contenir au moins 6 caractères.");
      } else if (error.code === "auth/invalid-credential") {
        setError("Email ou mot de passe incorrect.");
      } else {
        setError("Une erreur est survenue. Réessaie.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-shape auth-shape-one"></div>
      <div className="auth-shape auth-shape-two"></div>
      <div className="auth-shape auth-shape-three"></div>

      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">C</div>

          <span>Carnet</span>
        </div>

        <div className="auth-heading">
          <span className="auth-small-title">
            {isRegister ? "BIENVENUE" : "BON RETOUR"}
          </span>

          <h1>{isRegister ? "Crée ton espace." : "Organise ta journée."}</h1>

          <p>
            {isRegister
              ? "Un espace simple pour garder toutes tes tâches au même endroit."
              : "Retrouve tes tâches et continue là où tu t'es arrêté."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="email">EMAIL</label>

            <input
              id="email"
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">MOT DE PASSE</label>

            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength="6"
                autoComplete={isRegister ? "new-password" : "current-password"}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            <span>
              {loading
                ? "Connexion..."
                : isRegister
                  ? "Créer mon compte"
                  : "Se connecter"}
            </span>

            {!loading && <ArrowRight size={19} />}
          </button>
        </form>

        <div className="auth-switch-container">
          <span>
            {isRegister ? "Tu as déjà un compte ?" : "Nouveau sur Carnet ?"}
          </span>

          <button
            type="button"
            className="auth-switch"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
          >
            {isRegister ? "Se connecter" : "Créer un compte"}
          </button>
        </div>

        <div className="auth-footer">
          Tes données sont personnelles et sécurisées.
        </div>
      </div>
    </main>
  );
}

export default Auth;
