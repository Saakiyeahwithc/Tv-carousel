export const PASSWORD_HASH =
  "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"; //password

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function checkPassword(password: string): Promise<boolean> {
  const hash = await sha256(password);
  return hash === PASSWORD_HASH;
}

const AUTH_KEY = "tv_carousel_auth";

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === "true";
}

export function login(): void {
  sessionStorage.setItem(AUTH_KEY, "true");
}

export function logout(): void {
  sessionStorage.removeItem(AUTH_KEY);
}
