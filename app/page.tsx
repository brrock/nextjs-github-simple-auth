import { getCurrentSession } from "@/lib/server/session";
import { redirect } from "next/navigation";
import { LogoutButton } from "./components";
import { globalGETRateLimit } from "@/lib/server/request";

export default async function Page() {
	if (!globalGETRateLimit()) {
		return "Too many requests"
	}
	const { user } = await getCurrentSession();
	if (user === null) {
		return redirect("/login");
	}
	const image = `https://avatars.githubusercontent.com/u/${user.githubId}`;
	return (
		<>
			<h1>Hi, {user.username}!</h1>
			<img src={image} height="100px" width="100px" alt="profile" />
			<p>Email: {user.email}</p>
			<p> ID: {user.id}</p>
			<LogoutButton />
		</>
	);
}
