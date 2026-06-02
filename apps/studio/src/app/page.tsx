/**
 * Root page — never actually rendered. Middleware redirects to either
 * /login (if not authenticated) or /dashboard (if authenticated).
 */
export default function HomePage() {
  return null;
}
