// install_deps.go checks the local iOS development toolchain without relying on shell scripts.
package main

import (
	"bufio"
	"context"

	core "dappco.re/go"
	command "dappco.re/go/process/exec"
)

type Dependency struct {
	Name       string
	CheckFunc  func() (bool, string)
	Required   bool
	InstallCmd []string
	InstallMsg string
	SuccessMsg string
	FailureMsg string
}

func main() {
	core.Println("Checking iOS development dependencies...")
	core.Println(repeat("=", 51))
	core.Println()

	hasFailures := false
	for _, dep := range dependencies() {
		ok, details := dep.CheckFunc()
		if ok {
			message := dep.SuccessMsg
			if details != "" {
				message = core.Sprintf("%s (%s)", message, details)
			}
			core.Println(message)
			continue
		}
		core.Println(dep.FailureMsg)
		if details != "" {
			core.Println(core.Sprintf("   Details: %s", details))
		}
		if dep.Required {
			hasFailures = true
		}
		if dep.InstallMsg != "" {
			core.Println(core.Concat("   ", dep.InstallMsg))
		}
		if len(dep.InstallCmd) > 0 {
			core.Println(core.Sprintf("   Fix command: %s", core.Join(" ", dep.InstallCmd...)))
			if promptUser("Do you want to run this command?") {
				if !runCommand(dep.InstallCmd[0], dep.InstallCmd[1:]...) {
					core.Println("Command failed")
					core.Exit(1)
				}
			}
		}
	}

	core.Println()
	if !checkCommand("xcrun", "simctl", "list", "devices") {
		core.Println("Cannot check for iPhone simulators")
		hasFailures = true
	} else if output, ok := commandOutput("xcrun", "simctl", "list", "devices"); ok && !core.Contains(string(output), "iPhone") {
		core.Println("No iPhone simulator devices found")
	}

	core.Println()
	core.Println(repeat("=", 51))
	if hasFailures {
		core.Println("Some required dependencies are missing or misconfigured.")
		core.Println("Install Xcode, open it once, accept the license, configure xcode-select, and install iOS simulator runtimes.")
		core.Exit(1)
	}
	core.Println("All required dependencies are installed.")
}

func dependencies() []Dependency {
	return []Dependency{
		{
			Name: "Xcode",
			CheckFunc: func() (bool, string) {
				out, ok := commandOutput("xcodebuild", "-version")
				if !ok {
					return false, ""
				}
				lines := core.Split(string(out), "\n")
				if len(lines) == 0 {
					return true, ""
				}
				return true, core.Trim(lines[0])
			},
			Required:   true,
			InstallMsg: "Install Xcode from the Mac App Store.",
			SuccessMsg: "Xcode found",
			FailureMsg: "Xcode not found",
		},
		{
			Name: "Xcode Developer Path",
			CheckFunc: func() (bool, string) {
				out, ok := commandOutput("xcode-select", "-p")
				if !ok {
					return false, "xcode-select not configured"
				}
				path := core.Trim(string(out))
				if !core.Stat(path).OK {
					return false, "invalid Xcode developer path"
				}
				if !core.Contains(path, "Xcode.app") {
					return false, core.Sprintf("points to %s", path)
				}
				return true, path
			},
			Required:   true,
			InstallCmd: []string{"sudo", "xcode-select", "-s", "/Applications/Xcode.app/Contents/Developer"},
			InstallMsg: "Configure the active Xcode developer directory.",
			SuccessMsg: "Xcode developer path configured",
			FailureMsg: "Xcode developer path is not configured correctly",
		},
		{
			Name: "iOS SDK",
			CheckFunc: func() (bool, string) {
				out, ok := commandOutput("xcrun", "--sdk", "iphonesimulator", "--show-sdk-path")
				if !ok {
					return false, "cannot find iOS simulator SDK"
				}
				sdkPath := core.Trim(string(out))
				if !core.Stat(core.JoinPath(sdkPath, "System", "Library", "Frameworks", "UIKit.framework")).OK {
					return false, "UIKit.framework not found"
				}
				version, _ := commandOutput("xcrun", "--sdk", "iphonesimulator", "--show-sdk-version")
				return true, core.Sprintf("iOS %s SDK", core.Trim(string(version)))
			},
			Required:   true,
			InstallMsg: "Install iOS SDKs from Xcode Settings > Platforms.",
			SuccessMsg: "iOS SDK found",
			FailureMsg: "iOS SDK not found or incomplete",
		},
		{
			Name: "iOS Simulator Runtime",
			CheckFunc: func() (bool, string) {
				out, ok := commandOutput("xcrun", "simctl", "list", "runtimes")
				if !ok {
					return false, "cannot access simulator runtimes"
				}
				count := 0
				for _, line := range core.Split(string(out), "\n") {
					if core.Contains(line, "iOS") && !core.Contains(line, "unavailable") {
						count++
					}
				}
				if count == 0 {
					return false, "no iOS runtimes installed"
				}
				return true, core.Sprintf("%d runtime(s)", count)
			},
			Required:   true,
			InstallMsg: "Download iOS simulator runtimes from Xcode Settings > Platforms.",
			SuccessMsg: "iOS Simulator runtime available",
			FailureMsg: "iOS Simulator runtime not available",
		},
	}
}

func checkCommand(args ...string) bool {
	if len(args) == 0 {
		return false
	}
	return command.Command(context.Background(), args[0], args[1:]...).Run() == nil
}

func commandOutput(name string, args ...string) ([]byte, bool) {
	output, err := command.Command(context.Background(), name, args...).Output()
	if err != nil {
		return nil, false
	}
	return output, true
}

func runCommand(name string, args ...string) bool {
	return command.Command(context.Background(), name, args...).
		WithStdin(core.Stdin()).
		WithStdout(core.Stdout()).
		WithStderr(core.Stderr()).
		Run() == nil
}

func promptUser(question string) bool {
	if core.Getenv("CI") != "" || core.Getenv("TASK_FORCE_YES") == "true" {
		core.Println(core.Sprintf("%s [y/N]: y", question))
		return true
	}
	core.WriteString(core.Stdout(), core.Sprintf("%s [y/N]: ", question))
	reader := bufio.NewReader(core.Stdin())
	response, err := reader.ReadString('\n')
	if err != nil {
		return false
	}
	response = core.Lower(core.Trim(response))
	return response == "y" || response == "yes"
}

func repeat(value string, count int) string {
	out := core.NewBuilder()
	for i := 0; i < count; i++ {
		out.WriteString(value)
	}
	return out.String()
}
