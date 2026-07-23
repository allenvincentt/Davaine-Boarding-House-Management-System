const fs = require("node:fs");
const path = require("node:path");

const {
  addGradleConfiguration,
  BEGIN_MARKER,
} = require("../plugins/withShortAndroidCxxPaths");

const projectRoot = path.resolve(__dirname, "..");
const projectBuildGradle = path.join(projectRoot, "android", "build.gradle");

// A fresh clone has no generated Android project. Expo will run prebuild and
// apply the config plugin before the first native build.
if (!fs.existsSync(projectBuildGradle)) {
  process.exit(0);
}

const originalContents = fs.readFileSync(projectBuildGradle, "utf8");
const updatedContents = addGradleConfiguration(originalContents);

if (!updatedContents.includes(BEGIN_MARKER)) {
  throw new Error("Failed to configure the short Android C/C++ staging paths.");
}

if (updatedContents !== originalContents) {
  fs.writeFileSync(projectBuildGradle, updatedContents, "utf8");
  console.log("Applied short Android C/C++ staging paths.");
}
