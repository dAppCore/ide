package main

import (
	"flag"
	goio "io"

	core "dappco.re/go"
)

func parseRuntimeFlags(args []string) (runtimeFlags, error) {
	flags := runtimeFlags{}
	set := flag.NewFlagSet("core-ide", flag.ContinueOnError)
	set.SetOutput(goio.Discard)
	set.BoolVar(&flags.MCPOnly, "mcp", false, "run the MCP server on stdio")
	set.BoolVar(&flags.NoGUI, "no-gui", false, "disable the GUI shell")
	set.StringVar(&flags.HTTPAddr, "http", "", "run the MCP server on the given HTTP address")
	set.StringVar(&flags.Token, "token", "", "bearer token for HTTP transport")
	set.StringVar(&flags.ConfigPath, "config", "", "path to ide config")
	if err := set.Parse(args); err != nil {
		return runtimeFlags{}, err
	}
	flags.HTTPAddr = core.Trim(flags.HTTPAddr)
	flags.Token = core.Trim(flags.Token)
	flags.ConfigPath = core.Trim(flags.ConfigPath)
	return flags, nil
}

func transportMode(flags runtimeFlags) string {
	if flags.HTTPAddr != "" {
		return "http"
	}
	if flags.MCPOnly {
		return "stdio"
	}
	return ""
}
