package workspace

import (
	"context"
	goio "io"
	"io/fs"
	"slices"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
	"dappco.re/go/process"
)

const maxScanDepth = 16
const maxPreviewBytes = 4096

func scanProjects(
	ctx context.Context,
	input ScanInput,
	medium coreio.Medium,
	processService *process.Service,
	fallbackRoot string,
	ignores ...string,
) ([]Project, error) {
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

func readCoreFiles(
	medium coreio.Medium,
	root string,
	ignores ...string,
) ([]File, FileCount, []string, error) {
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
	if medium == nil {
		return
	}
	info, err := medium.Stat(path)
	if err != nil {
		if rejectsWorkspacePathWithWarning(root, path) {
			return
		}
		return
	}
	if rejectsWorkspacePathWithWarning(root, path) {
		return
	}
	if shouldIgnorePath(root, path, ignores) {
		return
	}
	if info.IsDir() {
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
	if medium == nil {
		return
	}
	info, err := medium.Stat(path)
	if err != nil {
		if rejectsWorkspacePathWithWarning(root, path) {
			return
		}
		return
	}
	if rejectsWorkspacePathWithWarning(root, path) {
		return
	}
	if shouldIgnorePath(root, path, ignores) {
		return
	}
	if info.IsDir() {
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

func readLimitedContent(
	medium coreio.Medium,
	path string,
	maxBytes int64,
) (string, error) {
	if medium == nil {
		return "", core.E("ide.workspace.readLimitedContent", "medium is nil", nil)
	}
	file, err := medium.Open(path)
	if err != nil {
		return "", err
	}
	defer func() {
		if cerr := file.Close(); cerr != nil { _ = cerr }
	}()
	raw, err := goio.ReadAll(goio.LimitReader(file, maxBytes+1))
	if err != nil {
		return "", err
	}
	if int64(len(raw)) > maxBytes {
		raw = raw[:maxBytes]
	}
	return string(raw), nil
}

// rejectsWorkspacePath reports whether path must be excluded from a workspace
// scan because its canonical (symlink-resolved) location escapes the workspace
// root, or because an existing host path cannot be canonicalised.
func rejectsWorkspacePath(root, path string) bool {
	rejection := workspacePathRejectionFor(root, path)
	return rejection.reject
}

func rejectsWorkspacePathWithWarning(root, path string) bool {
	rejection := workspacePathRejectionFor(root, path)
	if !rejection.reject {
		return false
	}
	logWorkspacePathRejection(rejection)
	return true
}

type workspacePathRejection struct {
	reject bool
	err    error
}

func workspacePathRejectionFor(root, path string) workspacePathRejection {
	if core.Trim(root) == "" || core.Trim(path) == "" {
		return workspacePathRejection{}
	}
	resolvedRoot, err := canonicalExistingPath(root)
	if err != nil {
		if !resolvedRoot.exists {
			return workspacePathRejection{}
		}
		return workspacePathRejection{
			reject: true,
			err:    core.E("ide.workspace.scan.canonicalRoot", core.Concat("resolve workspace root ", root), err),
		}
	}
	resolvedPath, err := canonicalExistingPath(path)
	if err != nil {
		if !resolvedPath.exists {
			return workspacePathRejection{}
		}
		return workspacePathRejection{
			reject: true,
			err:    core.E("ide.workspace.scan.canonicalPath", core.Concat("resolve workspace path ", path), err),
		}
	}
	if !canonicalPathHasRoot(resolvedRoot.path, resolvedPath.path) {
		return workspacePathRejection{
			reject: true,
			err:    core.E("ide.workspace.scan.symlinkEscape", core.Concat("workspace path ", resolvedPath.path, " escapes root ", resolvedRoot.path), nil),
		}
	}
	return workspacePathRejection{}
}

type canonicalPath struct {
	path   string
	exists bool
}

// canonicalExistingPath returns the absolute, symlink-resolved, cleaned path for
// an existing host filesystem entry. Virtual io.Medium entries may not exist on
// the host; callers should not reject those solely because host Lstat reports
// fs.ErrNotExist.
func canonicalExistingPath(
	path string,
) (canonicalPath, error) {
	cleanPath := core.CleanPath(core.Trim(path), string(core.PathSeparator))
	absoluteResult := core.PathAbs(cleanPath)
	if !absoluteResult.OK {
		err, _ := absoluteResult.Value.(error)
		return canonicalPath{exists: true}, err
	}
	absolute := absoluteResult.Value.(string)
	lstat := core.Lstat(absolute)
	if !lstat.OK {
		err, _ := lstat.Value.(error)
		if core.Is(err, fs.ErrNotExist) {
			return canonicalPath{}, err
		}
		return canonicalPath{exists: true}, err
	}
	resolvedResult := core.PathEvalSymlinks(absolute)
	if !resolvedResult.OK {
		err, _ := resolvedResult.Value.(error)
		return canonicalPath{exists: true}, err
	}
	return canonicalPath{path: core.CleanPath(resolvedResult.Value.(string), string(core.PathSeparator)), exists: true}, nil
}

func canonicalPathHasRoot(root, path string) bool {
	if path == root {
		return true
	}
	prefix := root
	separator := string(core.PathSeparator)
	if !core.HasSuffix(prefix, separator) {
		prefix += separator
	}
	return core.HasPrefix(path, prefix)
}

func logWorkspacePathRejection(rejection workspacePathRejection) {
	if rejection.err == nil {
		return
	}
	c := core.New()
	if r := c.Log().Warn(rejection.err, "ide.workspace.scan", "workspace scan skipped path outside workspace root"); !r.OK { _ = r }
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

var _ = appendWorkspaceTree
var _ = appendWorkspaceFile
var _ = rejectsWorkspacePath
var _ = isDir
