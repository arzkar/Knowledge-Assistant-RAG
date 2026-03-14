import { betterFetch } from "@better-auth/utils/fetch";
import { NextResponse, type NextRequest } from "next/server";

export default async function middleware(request: NextRequest) {
	const { data: session } = await betterFetch<any>(
		"/api/auth/get-session",
		{
			baseURL: request.nextUrl.origin,
			headers: {
				cookie: request.headers.get("cookie") || "",
			},
		},
	);

	if (!session) {
		return NextResponse.redirect(new URL("/auth/login", request.url));
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/documents", "/query"],
};
