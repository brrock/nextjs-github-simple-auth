import { globalGETRateLimit } from "@/lib/server/request";
import { getCurrentSession } from "@/lib/server/session";
import { redirect } from "next/navigation";

export default async function Page() {
    if (!globalGETRateLimit()) {
		return "Too many requests"
	}
    const { user } = await getCurrentSession();
	if (user !== null) {
		return redirect("/");
	}
	return (
		<>
			<h1>Sign in</h1>
			<a href="/login/github">Sign in with GitHub</a>
		</>
	);
}
