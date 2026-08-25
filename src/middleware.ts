export { auth as middleware } from "@/lib/auth";

export const config = {
  // Protege todas as rotas exceto login, cadastro, arquivos estáticos e a API de auth
  matcher: ["/((?!api/auth|login|cadastro|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)"],
};
