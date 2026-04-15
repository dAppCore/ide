package workspace

import (
	"io/fs"
	"slices"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"
)

func readCoreFiles(medium coreio.Medium, root string) ([]File, FileCount, []string, error) {
	paths := []string{
		core.JoinPath(root, "CLAUDE.md"),
		core.JoinPath(root, "README.md"),
		core.JoinPath(root, "docs", "development.md"),
	}
	files := make([]File, 0, len(paths)+4)
	sources := make([]string, 0, len(paths)+4)
	counts := FileCount{}
	for _, path := range paths {
		appendWorkspaceFile(medium, path, &files, &counts, &sources)
	}
	coreDir := core.JoinPath(root, ".core")
	coreEntries, err := medium.List(coreDir)
	if err != nil {
		return files, counts, sources, nil
	}
	for _, entry := range sortedEntries(coreEntries) {
		appendWorkspaceTree(medium, core.JoinPath(coreDir, entry.Name()), &files, &counts, &sources)
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

func appendWorkspaceTree(medium coreio.Medium, path string, files *[]File, counts *FileCount, sources *[]string) {
	if medium == nil || !medium.Exists(path) {
		return
	}
	if medium.IsDir(path) {
		entries, err := medium.List(path)
		if err != nil {
			return
		}
		for _, entry := range sortedEntries(entries) {
			appendWorkspaceTree(medium, core.JoinPath(path, entry.Name()), files, counts, sources)
		}
		return
	}
	appendWorkspaceFile(medium, path, files, counts, sources)
}

func appendWorkspaceFile(medium coreio.Medium, path string, files *[]File, counts *FileCount, sources *[]string) {
	if medium == nil || !medium.Exists(path) {
		return
	}
	info, err := medium.Stat(path)
	if err != nil {
		return
	}
	content, err := medium.Read(path)
	if err != nil {
		return
	}
	counts.Total++
	counts.Text++
	*files = append(*files, File{
		Path:     path,
		Size:     info.Size(),
		Modified: info.ModTime().UTC().Format("2006-01-02T15:04:05Z"),
		Preview:  preview(content),
		IsText:   true,
	})
	*sources = append(*sources, path)
}

func sortedEntries(entries []fs.DirEntry) []fs.DirEntry {
	if len(entries) == 0 {
		return nil
	}
	out := slices.Clone(entries)
	slices.SortFunc(out, func(left, right fs.DirEntry) int {
		switch {
		case left.Name() < right.Name():
			return -1
		case left.Name() > right.Name():
			return 1
		default:
			return 0
		}
	})
	return out
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
