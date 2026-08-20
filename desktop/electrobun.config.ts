import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "my-guitar-studies",
		identifier: "dev.lorenzocorbella74.myguitarstudies",
		version: "0.0.1",
	},
	build: {
		// Requires `npm run build` at the repo root first (Angular CLI output).
		copy: {
			"../dist/my-guitar-studies/browser": "views/mainview",
			"../backend": "backend",
		},
		watchIgnore: ["dist/**"],
		mac: {
			bundleCEF: false,
		},
		linux: {
			bundleCEF: false,
		},
		win: {
			bundleCEF: false,
		},
	},
} satisfies ElectrobunConfig;
