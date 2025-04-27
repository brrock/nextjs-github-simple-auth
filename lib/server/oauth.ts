import { GitHub } from "arctic";


export const github = new GitHub(
	process.env.GITHUB_CLIENT_ID ?? "",
	process.env.GITHUB_CLIENT_SECRET ?? "",
	process.env.NODE_ENV === "production"
		? `${process.env.NEXT_PUBLIC_BASE_URL}/login/github/callback`
		: "http://localhost:3000/login/github/callback"
);
