package workspace

import (
	"gopkg.in/yaml.v3"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"
)

type reposFile struct {
	Repos []struct {
		Name    string   `yaml:"name"`
		Path    string   `yaml:"path"`
		Depends []string `yaml:"depends"`
	} `yaml:"repos"`
}

func classifyImpact(root string, changes []GitChange) ([]string, []string, []string) {
	areas := make([]string, 0, len(changes))
	checks := []string{"go build ./...", "go test ./... -count=1"}
	notes := []string{"Impact categories are inferred from changed paths and .core configuration files."}
	for _, change := range changes {
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
	if hasManifestDependencyChange(changes) {
		dependents := downstreamDependents(coreio.Local, root)
		if len(dependents) > 0 {
			areas = append(areas, "downstream dependents")
			notes = append(notes, core.Concat("Repos listed in repos.yaml depend on the current workspace: ", core.Join(", ", dependents...), "."))
		}
	}
	return unique(areas), unique(checks), unique(notes)
}

func hasManifestDependencyChange(changes []GitChange) bool {
	for _, change := range changes {
		if change.Path == ".core/manifest.yaml" || change.Path == "manifest.yaml" {
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
	content, err := medium.Read(reposPath)
	if err != nil {
		return nil
	}
	var repos reposFile
	if err := yaml.Unmarshal([]byte(content), &repos); err != nil {
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
