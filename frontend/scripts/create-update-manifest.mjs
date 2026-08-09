import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));
const installerName = `Cabinet-Dentaire-Setup-${packageJson.version}-RESEAU.exe`;
const installerPath = path.resolve("release", installerName);
const downloadUrl = process.argv[2];

if (!downloadUrl || !downloadUrl.startsWith("https://")) {
  console.error("Usage: npm run update:manifest -- https://adresse-publique/Cabinet-Dentaire-Setup.exe");
  process.exit(1);
}

const installer = await fs.readFile(installerPath);
const manifest = {
  version: packageJson.version,
  url: downloadUrl,
  sha256: createHash("sha256").update(installer).digest("hex").toUpperCase(),
  notes: "Mise à jour Cabinet Dentaire",
  publishedAt: new Date().toISOString()
};

const outputDirectory = path.resolve("release", "update");
await fs.mkdir(outputDirectory, { recursive: true });
await fs.writeFile(path.join(outputDirectory, "latest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(path.join(outputDirectory, "latest.json"));
