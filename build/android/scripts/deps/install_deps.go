package main

import (
	"context"
	"runtime"

	core "dappco.re/go"
	command "dappco.re/go/process/exec"
)

func main() {
	core.Println("Checking Android development dependencies...")
	core.Println()

	failures := []string{}
	if !checkCommand("go", "version") {
		failures = append(failures, "Go is not installed. Install from https://go.dev/dl/")
	} else {
		core.Println("Go is installed")
	}

	androidHome := core.Getenv("ANDROID_HOME")
	if androidHome == "" {
		androidHome = core.Getenv("ANDROID_SDK_ROOT")
	}
	if androidHome == "" {
		androidHome = firstExistingPath(defaultAndroidSDKPaths()...)
	}
	if androidHome == "" {
		failures = append(failures, "ANDROID_HOME is not set. Install Android Studio and set ANDROID_HOME.")
	} else {
		core.Println(core.Sprintf("ANDROID_HOME: %s", androidHome))
	}

	if !checkCommand("adb", "version") {
		failures = append(failures, core.Sprintf("adb not found. Add %s to PATH", core.JoinPath(androidHome, "platform-tools")))
	}
	if !checkCommand("emulator", "-list-avds") {
		failures = append(failures, core.Sprintf("emulator not found. Add %s to PATH", core.JoinPath(androidHome, "emulator")))
	}
	if !checkCommand("java", "-version") {
		failures = append(failures, "Java not found. Install JDK 11+.")
	}

	ndkHome := core.Getenv("ANDROID_NDK_HOME")
	if ndkHome == "" && androidHome != "" {
		ndkHome = firstNDK(core.JoinPath(androidHome, "ndk"))
	}
	if ndkHome == "" {
		failures = append(failures, "Android NDK not found. Install NDK through Android Studio SDK Manager.")
	} else {
		core.Println(core.Sprintf("Android NDK: %s", ndkHome))
	}

	if len(failures) > 0 {
		core.Println("Missing dependencies:")
		for _, failure := range failures {
			core.Println(core.Concat(" - ", failure))
		}
		core.Println()
		core.Println("Setup:")
		core.Println("1. Install Android Studio: https://developer.android.com/studio")
		core.Println("2. Install Android SDK Platform, Build-Tools, Platform-Tools, Emulator, and NDK.")
		if runtime.GOOS == "darwin" {
			core.Println("3. export ANDROID_HOME=$HOME/Library/Android/sdk")
		} else {
			core.Println("3. export ANDROID_HOME=$HOME/Android/Sdk")
		}
		core.Exit(1)
	}

	core.Println("All Android development dependencies are installed.")
}

func checkCommand(name string, args ...string) bool {
	return command.Command(context.Background(), name, args...).Run() == nil
}

func defaultAndroidSDKPaths() []string {
	home := ""
	if result := core.UserHomeDir(); result.OK {
		home = result.Value.(string)
	}
	return []string{
		core.JoinPath(home, "Android", "Sdk"),
		core.JoinPath(home, "Library", "Android", "sdk"),
		"/usr/local/share/android-sdk",
	}
}

func firstExistingPath(paths ...string) string {
	for _, candidate := range paths {
		if candidate != "" && core.Stat(candidate).OK {
			return candidate
		}
	}
	return ""
}

func firstNDK(root string) string {
	entriesResult := core.ReadDir(core.DirFS(root), ".")
	if !entriesResult.OK {
		return ""
	}
	for _, entry := range entriesResult.Value.([]core.FsDirEntry) {
		if entry.IsDir() {
			return core.JoinPath(root, entry.Name())
		}
	}
	return ""
}
