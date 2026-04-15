package workspace

import (
	"io/fs"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"
)

func readCoreFiles(medium coreio.Medium, root string) ([]File, FileCount, []string, error) {
	paths := []string{
		core.JoinPath(root, "CLAUDE.md"),
		core.JoinPath(root, "README.md"),
		core.JoinPath(root, "docs", "development.md"),
		core.JoinPath(root, ".core", "build.yaml"),
		core.JoinPath(root, ".core", "manifest.yaml"),
	}
	files := make([]File, 0, len(paths))
	sources := make([]string, 0, len(paths))
	counts := FileCount{}
	for _, path := range paths {
		if !medium.Exists(path) {
			continue
		}
		info, err := medium.Stat(path)
		if err != nil {
			return nil, FileCount{}, nil, err
		}
		content, err := medium.Read(path)
		if err != nil {
			return nil, FileCount{}, nil, err
		}
		counts.Total++
		counts.Text++
		files = append(files, File{
			Path:     path,
			Size:     info.Size(),
			Modified: info.ModTime().UTC().Format("2006-01-02T15:04:05Z"),
			Preview:  preview(content),
			IsText:   true,
		})
		sources = append(sources, path)
	}
	return files, counts, sources, nil
}

func detectLanguages(medium coreio.Medium, root string) []string {
	candidates := []struct {
		Path     string
		Language string
	}{
		{Path: core.JoinPath(root, "go.mod"), Language: "go"},
		{Path: core.JoinPath(root, "composer.json"), Language: "php"},
		{Path: core.JoinPath(root, "package.json"), Language: "typescript"},
		{Path: core.JoinPath(root, "requirements.txt"), Language: "python"},
		{Path: core.JoinPath(root, "pyproject.toml"), Language: "python"},
	}
	values := make([]string, 0, len(candidates))
	for _, candidate := range candidates {
		if medium.Exists(candidate.Path) {
			values = append(values, candidate.Language)
		}
	}
	return unique(values)
}

func preview(content string) string {
	if len(content) <= 160 {
		return content
	}
	return content[:160]
}

func parentDir(path string) string {
	if path == "" || path == "/" {
		return path
	}
	parts := core.Split(path, "/")
	if len(parts) <= 1 {
		return path
	}
	if parts[0] == "" && len(parts) == 2 {
		return "/"
	}
	return core.Join("/", parts[:len(parts)-1]...)
}

func pickPath(ok bool, path string) string {
	if ok {
		return path
	}
	return ""
}

func isDir(entry fs.DirEntry) bool {
	return entry != nil && entry.IsDir()
}
