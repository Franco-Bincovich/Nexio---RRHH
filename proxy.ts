import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: getUser() refresca el token y lo escribe en supabaseResponse.
  // Nunca retornar una respuesta distinta a supabaseResponse sin copiar sus cookies,
  // o la sesión se rompe en los Server Components que siguen.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Sin sesión intentando acceder a dashboard → redirigir a /login.
  // Es seguro retornar un redirect simple aquí: no hay sesión que propagar.
  if (pathname.startsWith("/dashboard") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Para todos los demás casos (incluido /login con sesión activa),
  // retornar siempre supabaseResponse para que las cookies refrescadas
  // lleguen al browser. El redirect al dashboard se maneja en
  // app/login/layout.tsx como Server Component.
  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
