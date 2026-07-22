import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const [webCommand, artifactName] = process.argv.slice(2);
const supportedCommands = new Set(["build", "dev", "test:e2e"]);
const supportedArtifacts = new Set(["spike", "official-local"]);

if (!webCommand || !supportedCommands.has(webCommand)) {
  throw new Error(
    `Expected a web command: ${[...supportedCommands].join(", ")}.`,
  );
}
if (!artifactName || !supportedArtifacts.has(artifactName)) {
  throw new Error(
    `Expected a generated artifact name: ${[...supportedArtifacts].join(", ")}.`,
  );
}

const artifactDirectory = path.resolve(
  repositoryRoot,
  "data",
  "generated",
  artifactName,
);
const requiredFiles = ["artifact.json", "diagnostics.json", "search.json"];
const missingFiles = requiredFiles.filter(
  (file) => !existsSync(path.join(artifactDirectory, file)),
);
if (missingFiles.length > 0) {
  throw new Error(
    `Generated artifact ${artifactName} is incomplete (${missingFiles.join(", ")}). Run its generate command first.`,
  );
}

const inheritedPnpmCli = process.env.npm_execpath;
const command = inheritedPnpmCli
  ? process.execPath
  : process.platform === "win32"
    ? "pnpm.cmd"
    : "pnpm";
const args = [
  ...(inheritedPnpmCli ? [inheritedPnpmCli] : []),
  "--filter",
  "@dredmorpedia/web",
  webCommand,
];
const child = spawn(command, args, {
  cwd: repositoryRoot,
  env: {
    ...process.env,
    DREDMORPEDIA_ARTIFACT_DIRECTORY: artifactDirectory,
  },
  stdio: "inherit",
});

child.once("error", (error) => {
  process.stderr.write(`Unable to start the web command: ${error.message}\n`);
  process.exitCode = 1;
});
child.once("exit", (code) => {
  process.exitCode = code ?? 1;
});
