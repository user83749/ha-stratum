const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["robots.txt"]),
	mimeTypes: {".txt":"text/plain"},
	_: {
		client: {start:"_app/immutable/entry/start.ClIEMkdR.js",app:"_app/immutable/entry/app.lNgtHHoK.js",imports:["_app/immutable/entry/start.ClIEMkdR.js","_app/immutable/chunks/Cy1WpX7j.js","_app/immutable/chunks/BFobMjM6.js","_app/immutable/entry/app.lNgtHHoK.js","_app/immutable/chunks/CFXai2jm.js","_app/immutable/chunks/BFobMjM6.js","_app/immutable/chunks/CRHenurS.js","_app/immutable/chunks/CbAumXQD.js","_app/immutable/chunks/CHLJW1vT.js","_app/immutable/chunks/DtaZhLEA.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-BXh7a7qQ.js')),
			__memo(() => import('./chunks/1-CJ5v70_7.js')),
			__memo(() => import('./chunks/2-WGMln313.js')),
			__memo(() => import('./chunks/3-v3SPdFvn.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/config",
				pattern: /^\/api\/config\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BCAKsdR0.js'))
			},
			{
				id: "/api/ha/test",
				pattern: /^\/api\/ha\/test\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-zbWtRizX.js'))
			},
			{
				id: "/connect",
				pattern: /^\/connect\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
