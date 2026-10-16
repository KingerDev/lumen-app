const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

/**
 * Adopts the UIScene life cycle, which the iOS 27 SDK requires — an app built
 * with Xcode 27 without it aborts at launch ("UIScene life cycle is required
 * for apps built with this SDK").
 *
 * Expo ships the scene delegate (`ExpoAppSceneDelegate`, since expo 57.0.26)
 * but the prebuild template does not wire it up yet. This does:
 *  - Info.plist names the scene delegate,
 *  - the AppDelegate hands its React Native factory to it instead of creating
 *    the window itself.
 *
 * Drop this plugin once the Expo template adopts scenes on its own.
 */

const SCENE_DELEGATE = 'EXExpoAppSceneDelegate';

function withSceneManifest(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: SCENE_DELEGATE,
          },
        ],
      },
    };
    return config;
  });
}

function withFactoryProvider(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error('withSceneLifecycle expects a Swift AppDelegate.');
    }
    let src = config.modResults.contents;

    if (!src.includes('ExpoReactNativeFactoryProvider')) {
      src = src.replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {'
      );
    }

    // The scene delegate creates the window and starts React Native in it.
    src = src.replace(
      /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/,
      '\n'
    );

    if (!src.includes('ExpoReactNativeFactoryProvider') || src.includes('UIWindow(frame:')) {
      throw new Error('withSceneLifecycle could not patch AppDelegate.swift — the template changed.');
    }

    config.modResults.contents = src;
    return config;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withFactoryProvider(withSceneManifest(config));
};
