/** @type {import('next').NextConfig} */
const nextConfig = {
	serverExternalPackages: ["@node-rs/argon2"],
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "avatars.githubusercontent.com"
			}
		]
	}
};

export default nextConfig;
