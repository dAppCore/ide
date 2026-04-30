package workspace

import (
	core "dappco.re/go"
	coreconfig "dappco.re/go/config"
	coreio "dappco.re/go/io"
)

type reposFile struct {
	Repos []struct {
		Name    string   `yaml:"name"`
		Path    string   `yaml:"path,omitempty"`
		Depends []string `yaml:"depends"`
	} `yaml:"repos"`
}

func classifyImpact(medium coreio.Medium, root string, changes []GitChange, ignores ...string) ([]string, []string, []string) {
	areas := make([]string, 0, len(changes))
	checks := []string{"go build ./...", "go test ./... -count=1"}
	notes := []string{"Impact categories are inferred from changed paths and .core configuration files."}
	for _, change := range changes {
		if shouldIgnorePath(root, change.Path, ignores) {
			continue
		}
		switch {
		case core.HasPrefix(change.Path, "frontend/"):
			areas = append(areas, "frontend")
			checks = append(checks, "cd frontend && npm test")
		case core.HasPrefix(change.Path, ".core/"):
			areas = append(areas, "core config")
			checks = append(checks, "core build")
		default:
			if ext := core.PathExt(change.Path); ext == ".go" {
				areas = append(areas, "go")
			}
		}
	}
	if hasDependencyManifestChange(changes) {
		dependents := downstreamDependents(medium, root)
		if len(dependents) > 0 {
			areas = append(areas, "downstream dependents")
			notes = append(notes, core.Concat("Repos listed in repos.yaml depend on the current workspace: ", core.Join(", ", dependents...), "."))
		}
	}
	return unique(areas), unique(checks), unique(notes)
}

func hasDependencyManifestChange(changes []GitChange) bool {
	for _, change := range changes {
		if change.Path == ".core/manifest.yaml" || change.Path == "manifest.yaml" {
			return true
		}
		if change.Path == ".core/manifest.yaml.depends" || change.Path == "manifest.yaml.depends" {
			return true
		}
	}
	return false
}

func downstreamDependents(medium coreio.Medium, root string) []string {
	reposPath := core.JoinPath(root, "repos.yaml")
	if !medium.Exists(reposPath) {
		return nil
	}
	result := coreconfig.New(
		coreconfig.WithMedium(workspaceConfigMedium(medium)),
		coreconfig.WithPath(reposPath),
	)
	if !result.OK {
		return nil
	}
	var data map[string]any
	configValue := result.Value.(*coreconfig.Config)
	if configValue == nil || !configValue.Get("", &data).OK {
		return nil
	}
	var repos reposFile
	if result := core.JSONUnmarshalString(core.JSONMarshalString(data), &repos); !result.OK {
		return nil
	}
	current := core.PathBase(root)
	dependents := make([]string, 0, len(repos.Repos))
	for _, repo := range repos.Repos {
		for _, dep := range repo.Depends {
			if dep == current {
				dependents = append(dependents, repo.Name)
			}
		}
	}
	return unique(dependents)
}
