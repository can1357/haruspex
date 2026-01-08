import { resolve } from "node:path";
import { defineConfig, type PluginOption } from "vite";

function haruspexRouter(): PluginOption {
   return {
      name: "haruspex-router",
      configureServer(server) {
         // Run before Vite's default middleware
         return () => {
            server.middlewares.use((req, res, next) => {
               const url = req.url?.split("?")[0] || "/";

               // /chip/:chip → redirect to /chip/:chip/grid/
               const chipMatch = url.match(/^\/chip\/([^/]+)$/);
               if (chipMatch) {
                  res.writeHead(302, { Location: `/chip/${chipMatch[1]}/grid/` });
                  res.end();
                  return;
               }

               // /chip/:chip/list → list.html
               if (/^\/chip\/[^/]+\/list$/.test(url)) {
                  req.url = "/list.html";
               }

               // /chip/:chip/grid/* → grid.html
               if (/^\/chip\/[^/]+\/grid(\/.*)?$/.test(url)) {
                  req.url = "/grid.html";
               }

               next();
            });
         };
      },
   };
}

export default defineConfig({
   root: "public",
   server: {
      port: 9133,
      open: true,
   },
   build: {
      outDir: "../dist",
      emptyOutDir: true,
   },
   resolve: {
      alias: {
         "/static": resolve(__dirname, "public"),
      },
   },
   plugins: [haruspexRouter()],
});
