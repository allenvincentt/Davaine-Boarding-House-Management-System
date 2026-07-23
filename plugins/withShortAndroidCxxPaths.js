const {
  createRunOncePlugin,
  withProjectBuildGradle,
} = require("expo/config-plugins");

const BEGIN_MARKER =
  "// @generated begin davaine-short-android-cxx-paths - expo prebuild (DO NOT MODIFY)";
const END_MARKER =
  "// @generated end davaine-short-android-cxx-paths";

const GRADLE_CONFIGURATION = `${BEGIN_MARKER}
// Keep CMake/Ninja staging paths shallow. Native dependencies otherwise build
// below node_modules/<package>/android/.cxx, which can exceed Win32 path limits.
def davaineConfigureShortCxxPath = { nativeProject ->
  def androidExtension = nativeProject.extensions.findByName("android")
  if (androidExtension == null) {
    return
  }

  // The hash keeps every module unique without putting its potentially long
  // package name back into the filesystem path.
  def projectDirectoryName =
    "p" + Integer.toUnsignedString(rootProject.projectDir.absolutePath.hashCode(), 36)
  def moduleDirectoryName =
    "m" + Integer.toUnsignedString(nativeProject.path.hashCode(), 36)

  androidExtension.externalNativeBuild.cmake.buildStagingDirectory =
    new File(
      rootProject.gradle.gradleUserHomeDir,
      "cxx/\${projectDirectoryName}/\${moduleDirectoryName}"
    )
}

subprojects { nativeProject ->
  nativeProject.plugins.withId("com.android.application") {
    davaineConfigureShortCxxPath(nativeProject)
  }
  nativeProject.plugins.withId("com.android.library") {
    davaineConfigureShortCxxPath(nativeProject)
  }
}
${END_MARKER}`;

function addGradleConfiguration(contents) {
  const beginIndex = contents.indexOf(BEGIN_MARKER);
  const endIndex = contents.indexOf(END_MARKER);

  if ((beginIndex === -1) !== (endIndex === -1)) {
    throw new Error(
      "The generated Android C/C++ path configuration is incomplete. " +
        "Regenerate the android directory with `npx expo prebuild --clean`.",
    );
  }

  let contentsWithoutConfiguration = contents;
  if (beginIndex !== -1) {
    contentsWithoutConfiguration =
      contents.slice(0, beginIndex) +
      contents.slice(endIndex + END_MARKER.length);
  }

  // Expo's root plugin finalizes this setting, so the hook must be registered
  // before that plugin is applied.
  const rootPluginMatch =
    /^apply plugin:\s*["']expo-root-project["']\s*$/m.exec(
      contentsWithoutConfiguration,
    );

  if (!rootPluginMatch) {
    throw new Error(
      "Could not find the Expo root plugin in android/build.gradle.",
    );
  }

  const beforeRootPlugins = contentsWithoutConfiguration
    .slice(0, rootPluginMatch.index)
    .trimEnd();
  const rootPluginsAndAfter = contentsWithoutConfiguration
    .slice(rootPluginMatch.index)
    .trimStart();

  return `${beforeRootPlugins}\n\n${GRADLE_CONFIGURATION}\n\n${rootPluginsAndAfter}`;
}

function withShortAndroidCxxPaths(config) {
  return withProjectBuildGradle(config, (configWithBuildGradle) => {
    if (configWithBuildGradle.modResults.language !== "groovy") {
      throw new Error(
        "withShortAndroidCxxPaths requires a Groovy android/build.gradle file.",
      );
    }

    configWithBuildGradle.modResults.contents = addGradleConfiguration(
      configWithBuildGradle.modResults.contents,
    );

    return configWithBuildGradle;
  });
}

const plugin = createRunOncePlugin(
  withShortAndroidCxxPaths,
  "with-short-android-cxx-paths",
  "1.0.0",
);

plugin.addGradleConfiguration = addGradleConfiguration;
plugin.BEGIN_MARKER = BEGIN_MARKER;

module.exports = plugin;
