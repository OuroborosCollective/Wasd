# Arelorian Android Build Instructions

## Prerequisites (on your machine)
```bash
# Install Java 17
brew install openjdk@17

# Install Android SDK command line tools
mkdir -p ~/android-sdk/cmdline-tools
cd ~/android-sdk/cmdline-tools
curl -o tools.zip https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip
unzip tools.zip
mv cmdline-tools latest

# Accept licenses
yes | ~/android-sdk/cmdline-tools/latest/bin/sdkmanager --licenses

# Install required SDKs
~/android-sdk/cmdline-tools/latest/bin/sdkmanager "platforms;android-34" "build-tools;34.0.0" "platform-tools"
```

## Build Commands
```bash
export ANDROID_HOME=~/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

cd /opt/areloria/client

# Sync capacitor
npx cap sync android

# Build Debug APK
cd android
./gradlew assembleDebug

# Build Release APK
./gradlew assembleRelease
```

## Output
APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`
