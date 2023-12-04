const fs = require("fs");
const path = require("path");

require("child_process").execSync("vite build", { stdio: "inherit", cwd: path.resolve(__dirname, "..") });

const assets = fs.readdirSync(path.resolve(__dirname, "../dist/assets"));
const css = assets.find(asset => asset.endsWith(".css"));
const js = assets.find(asset => asset.endsWith(".js"));
let html = fs.readFileSync(path.resolve(__dirname, "../dist/index.html"), "utf-8");

html = html.replace("http://localhost:3000/src/frontend/index.tsx", `assets/${js}`);
html = html.replace("</head>", `  <link rel="stylesheet" href="assets/${css}">\n</head>`);

fs.writeFileSync(path.resolve(__dirname, "../dist/index.html"), html);
console.log("Build complete!");
