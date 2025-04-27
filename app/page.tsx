import { getCurrentSession } from "@/lib/server/session";
import { redirect } from "next/navigation";
import { LogoutButton } from "./components";
import { globalGETRateLimit } from "@/lib/server/request";
import Image from "next/image";

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
			<Image src={image} height="100" width="100" alt="profile" />
			<p>Email: {user.email}</p>
			<p className="font-mono"> ID: {user.id}</p>
			<LogoutButton />
		</>
	);
}
