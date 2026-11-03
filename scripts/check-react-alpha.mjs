import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {basename, dirname, resolve} from "node:path";
import {spawnSync} from "node:child_process";

const EXPECTED = {
  filename: "portable-doc-react-0.1.0-alpha.1.tgz",
  sha256: "5aa1eed120d95ecc5f09fed68c366a85ca61f3c6f66df10d835b1575c4f855a4",
  version: "0.1.0-alpha.1",
  releaseCommit: "976855af9085c6c3840359f79016822adf5c300d",
  rendererCommit: "cbd5282b4dce9c4c2ee7a567d24b23b4a8bae1d3",
};

const artifact = resolve(process.argv[2] || process.env.PORTABLE_DOC_REACT_TARBALL || "");
if (!process.argv[2] && !process.env.PORTABLE_DOC_REACT_TARBALL) {
  console.error("usage: npm run check:react-alpha -- /absolute/path/portable-doc-react-0.1.0-alpha.1.tgz");
  process.exit(2);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {stdio: "inherit", ...options});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function tarJson(entry) {
  const result = spawnSync("tar", ["-xOf", artifact, entry], {encoding: "utf8"});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`cannot read ${entry} from ${artifact}`);
  return JSON.parse(result.stdout);
}

const bytes = readFileSync(artifact);
const digest = createHash("sha256").update(bytes).digest("hex");
if (basename(artifact) !== EXPECTED.filename)
  throw new Error(`artifact filename ${basename(artifact)} != ${EXPECTED.filename}`);
if (digest !== EXPECTED.sha256)
  throw new Error(`artifact sha256 ${digest} != ${EXPECTED.sha256}`);

const pkg = tarJson("package/package.json");
const source = tarJson("package/SOURCE.json");
if (pkg.name !== "@portable-doc/react" || pkg.version !== EXPECTED.version)
  throw new Error(`unexpected package ${pkg.name}@${pkg.version}`);
if (source.commit !== EXPECTED.rendererCommit)
  throw new Error(`renderer source ${source.commit} != ${EXPECTED.rendererCommit}`);

try {
  const provenance = JSON.parse(readFileSync(resolve(dirname(artifact), "provenance.json"), "utf8"));
  if (provenance.source?.commit !== EXPECTED.releaseCommit || provenance.artifact?.sha256 !== EXPECTED.sha256)
    throw new Error("hosted provenance does not identify the exact release source and artifact");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const packageBefore = readFileSync("package.json");
const lockBefore = readFileSync("package-lock.json");
run("npm", ["install", "--no-save", "--package-lock=false", "--ignore-scripts", "--no-audit", "--no-fund", artifact]);
if (!packageBefore.equals(readFileSync("package.json")) || !lockBefore.equals(readFileSync("package-lock.json")))
  throw new Error("alpha injection changed a package manifest or lockfile");

const installed = JSON.parse(readFileSync("node_modules/@portable-doc/react/package.json", "utf8"));
if (installed.version !== EXPECTED.version) throw new Error(`installed ${installed.version} != ${EXPECTED.version}`);

for (const script of ["lint", "conformance", "build"]) run("npm", ["run", script]);
console.log(`react alpha verified: ${EXPECTED.version} ${digest}`);
