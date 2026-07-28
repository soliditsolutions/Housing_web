/**
 * Evaluador de fuerza de contraseña basado en entropía — sin dependencias externas.
 * Guía al usuario hacia frases largas (passphrases) en lugar de reglas arbitrarias.
 * Compatible con Node.js y Edge runtime (pura lógica JS, sin APIs del navegador).
 *
 * Política NIST SP800-63B sin 2FA → mínimo 15 caracteres (score ≥ 3).
 */

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  score:      StrengthScore;
  label:      string;
  color:      string;
  suggestion: string;
  /** true cuando la contraseña cumple el mínimo para registrarse sin 2FA (≥ 15 chars) */
  passes:     boolean;
}

function charPoolSize(pwd: string): number {
  let pool = 0;
  if (/[a-z]/.test(pwd))      pool += 26;
  if (/[A-Z]/.test(pwd))      pool += 26;
  if (/[0-9]/.test(pwd))      pool += 10;
  if (/[^a-zA-Z0-9]/.test(pwd)) pool += 32;
  return pool;
}

export function evaluatePassword(pwd: string): PasswordStrength {
  const len = pwd.length;

  if (len === 0) {
    return { score: 0, label: "", color: "transparent", suggestion: "", passes: false };
  }

  const isObvious =
    /(.)\1{4,}/.test(pwd) ||                              // 5+ caracteres repetidos
    /^(qwerty|asdf|1234|0000|abcde|password|contraseña)/i.test(pwd);

  const entropy   = Math.log2(Math.max(charPoolSize(pwd), 1)) * len;
  const hasSpaces = pwd.includes(" ");                     // indicador de passphrase

  let score: StrengthScore;
  if (isObvious || len < 8) {
    score = 0;
  } else if (len < 12) {
    score = 1;
  } else if (len < 15) {
    score = 2;
  } else if (entropy >= 60 || hasSpaces) {
    score = 4;
  } else {
    score = 3;
  }

  const LABELS: Record<StrengthScore, string> = {
    0: "Muy débil",
    1: "Débil",
    2: "Casi lista",
    3: "Aceptable",
    4: "Excelente",
  };
  const COLORS: Record<StrengthScore, string> = {
    0: "#EF4444",
    1: "#F97316",
    2: "#EAB308",
    3: "#22C55E",
    4: "#10B981",
  };
  const TIPS: Record<StrengthScore, string> = {
    0: "Evita caracteres repetidos o secuencias predecibles.",
    1: 'Prueba una frase: "mesa azul 2026 gato".',
    2: "Solo falta llegar a 15 caracteres. ¡Casi!",
    3: "¡Buen trabajo! Una frase larga la haría aún más robusta.",
    4: "Contraseña muy sólida. ¡Listo!",
  };

  return {
    score,
    label:      LABELS[score],
    color:      COLORS[score],
    suggestion: TIPS[score],
    passes:     score >= 3,
  };
}
