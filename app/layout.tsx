import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
export const metadata: Metadata = {
	title: "GitHub OAuth example in Next.js"
};
const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"]
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"]
});

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${geistSans.className} ${geistMono.variable} antialiased`}>{children}</body>
		</html>
	);
}
