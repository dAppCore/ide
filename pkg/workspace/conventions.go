package workspace

import (
	"embed"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"
	"gopkg.in/yaml.v3"
)

//go:embed conventions/*.yaml
var conventionFS embed.FS

type conventionPack struct {
	Language    string   `yaml:"language"`
	Conventions []string `yaml:"conventions"`
	Notes       []string `yaml:"notes"`
}

func loadConventionPacks(detected []string, allowed []string) ([]string, []string) {
	filtered := detected
	if len(allowed) > 0 {
		filtered = make([]string, 0, len(detected))
		allow := make(map[string]struct{}, len(allowed))
		for _, item := range allowed {
			allow[core.Trim(item)] = struct{}{}
		}
		for _, language := range detected {
			if _, ok := allow[language]; ok {
				filtered = append(filtered, language)
			}
		}
	}
	conventions := make([]string, 0, len(filtered))
	notes := make([]string, 0, len(filtered))
	for _, language := range filtered {
		path := core.Concat("conventions/", language, ".yaml")
		raw, err := conventionFS.ReadFile(path)
		if err != nil {
			continue
		}
		var pack conventionPack
		if err := yaml.Unmarshal(raw, &pack); err != nil {
			continue
		}
		conventions = append(conventions, pack.Conventions...)
		notes = append(notes, pack.Notes...)
	}
	return dedupeLastWins(conventions), dedupeLastWins(notes)
}

func dedupeLastWins(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for index := len(values) - 1; index >= 0; index-- {
		value := core.Trim(values[index])
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	for left, right := 0, len(out)-1; left < right; left, right = left+1, right-1 {
		out[left], out[right] = out[right], out[left]
	}
	return out
}

func readBuildProjectName(medium coreio.Medium, root string) string {
	path := core.JoinPath(root, ".core", "build.yaml")
	if !medium.Exists(path) {
		return ""
	}
	content, err := readLimitedContent(medium, path, 64*1024)
	if err != nil {
		return ""
	}
	var data map[string]any
	if err := yaml.Unmarshal([]byte(content), &data); err != nil {
		return ""
	}
	if value, ok := data["projectName"].(string); ok {
		return value
	}
	if value, ok := data["name"].(string); ok {
		return value
	}
	return ""
}
