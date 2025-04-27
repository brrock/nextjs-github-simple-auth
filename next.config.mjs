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
	},
	eslint: {
		ignoreDuringBuilds: true
	}
};

export default nextConfig;
