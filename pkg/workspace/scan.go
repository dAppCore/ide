package workspace

import (
	"context"
	goio "io"
	"io/fs"
	"slices"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"
	"dappco.re/go/core/process"
)

const maxScanDepth = 16
const maxPreviewBytes = 4096

func scanProjects(ctx context.Context, input ScanInput, medium coreio.Medium, processService *process.Service, fallbackRoot string, ignores ...string) ([]Project, error) {
	root := input.Root
	if core.Trim(root) == "" {
		root = fallbackRoot
	}
	if core.Trim(root) == "" {
		root = "."
	}
	depth := input.Depth
	if depth <= 0 {
		depth = 3
	}
	if depth > maxScanDepth {
		depth = maxScanDepth
	}
	projects := make([]Project, 0, depth+1)
	current := root
	for i := 0; i <= depth; i++ {
		if shouldIgnorePath(root, current, ignores) {
			current = parentDir(current)
			if current == "" {
				break
			}
			continue
		}
		manifestPath := core.JoinPath(current, ".core", "manifest.yaml")
		buildPath := core.JoinPath(current, ".core", "build.yaml")
		if medium.Exists(manifestPath) || medium.Exists(buildPath) {
			git, _ := gitStatus(ctx, processService, current)
			projects = append(projects, Project{
				Root:      current,
				Manifest:  pickPath(medium.Exists(manifestPath), manifestPath),
				BuildYaml: pickPath(medium.Exists(buildPath), buildPath),
				Languages: detectLanguages(medium, current, ignores...),
				GitBranch: git.Branch,
			})
		}
		parent := parentDir(current)
		if parent == current {
			break
		}
		current = parent
	}
	return projects, nil
}

func readCoreFiles(medium coreio.Medium, root string, ignores ...string) ([]File, FileCount, []string, error) {
	paths := []string{
		core.JoinPath(root, "CLAUDE.md"),
		core.JoinPath(root, "README.md"),
		core.JoinPath(root, "docs", "development.md"),
	}
	files := make([]File, 0, len(paths)+4)
	sources := make([]string, 0, len(paths)+4)
	counts := FileCount{}
	for _, path := range paths {
		appendWorkspaceFileWithIgnores(medium, root, path, ignores, &files, &counts, &sources)
	}
	coreDir := core.JoinPath(root, ".core")
	coreEntries, err := medium.List(coreDir)
	if err != nil {
		return files, counts, sources, nil
	}
	for _, entry := range sortedEntries(coreEntries) {
		appendWorkspaceTreeWithIgnores(medium, root, core.JoinPath(coreDir, entry.Name()), ignores, &files, &counts, &sources)
	}
	return files, counts, sources, nil
}

func detectLanguages(medium coreio.Medium, root string, ignores ...string) []string {
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
		if shouldIgnorePath(root, candidate.Path, ignores) {
			continue
		}
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
	appendWorkspaceTreeWithIgnores(medium, "", path, nil, files, counts, sources)
}

func appendWorkspaceTreeWithIgnores(medium coreio.Medium, root, path string, ignores []string, files *[]File, counts *FileCount, sources *[]string) {
	if medium == nil || !medium.Exists(path) {
		return
	}
	if shouldIgnorePath(root, path, ignores) {
		return
	}
	if medium.IsDir(path) {
		entries, err := medium.List(path)
		if err != nil {
			return
		}
		for _, entry := range sortedEntries(entries) {
			appendWorkspaceTreeWithIgnores(medium, root, core.JoinPath(path, entry.Name()), ignores, files, counts, sources)
		}
		return
	}
	appendWorkspaceFileWithIgnores(medium, root, path, ignores, files, counts, sources)
}

func appendWorkspaceFile(medium coreio.Medium, path string, files *[]File, counts *FileCount, sources *[]string) {
	appendWorkspaceFileWithIgnores(medium, "", path, nil, files, counts, sources)
}

func appendWorkspaceFileWithIgnores(medium coreio.Medium, root, path string, ignores []string, files *[]File, counts *FileCount, sources *[]string) {
	if medium == nil || !medium.Exists(path) {
		return
	}
	if shouldIgnorePath(root, path, ignores) {
		return
	}
	info, err := medium.Stat(path)
	if err != nil {
		return
	}
	content, err := readLimitedContent(medium, path, maxPreviewBytes)
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

func readLimitedContent(medium coreio.Medium, path string, maxBytes int64) (string, error) {
	if medium == nil {
		return "", core.E("ide.workspace.readLimitedContent", "medium is nil", nil)
	}
	file, err := medium.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()
	raw, err := goio.ReadAll(goio.LimitReader(file, maxBytes+1))
	if err != nil {
		return "", err
	}
	if int64(len(raw)) > maxBytes {
		raw = raw[:maxBytes]
	}
	return string(raw), nil
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
