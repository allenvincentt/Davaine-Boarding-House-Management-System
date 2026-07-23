const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  createRunOncePlugin,
  withDangerousMod,
} = require("expo/config-plugins");

function defaultSdkDir() {
  const home = os.homedir();

  if (process.platform === "win32") {
    return (
      process.env.LOCALAPPDATA &&
      path.join(process.env.LOCALAPPDATA, "Android", "Sdk")
    );
  }

  if (process.platform === "darwin") {
    return path.join(home, "Library", "Android", "sdk");
  }

  return path.join(home, "Android", "Sdk");
}

function findAndroidSdkDir() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    defaultSdkDir(),
  ];

  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

function toLocalPropertiesValue(sdkDir) {
  return sdkDir.replace(/\\/g, "/").replace(/:/g, "\\:");
}

function withAndroidLocalProperties(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const localPropertiesPath = path.join(
        config.modRequest.platformProjectRoot,
        "local.properties",
      );

      if (fs.existsSync(localPropertiesPath)) {
        return config;
      }

      const sdkDir = findAndroidSdkDir();
      if (!sdkDir) {
        return config;
      }

      fs.writeFileSync(
        localPropertiesPath,
        `sdk.dir=${toLocalPropertiesValue(sdkDir)}\n`,
      );

      return config;
    },
  ]);
}

module.exports = createRunOncePlugin(
  withAndroidLocalProperties,
  "with-android-local-properties",
  "1.0.0",
);
