// SPDX-Licence-Identifier: EUPL-1.2

package main

import (
	"bufio"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gopkg.in/yaml.v3"
)

// WorkspaceAPI exposes project context derived from .core/ and git status.
type WorkspaceAPI struct {
	root string
}

func NewWorkspaceAPI(root string) *WorkspaceAPI {
	return &WorkspaceAPI{root: root}
}

func (w *WorkspaceAPI) Name() string     { return "workspace-api" }
func (w *WorkspaceAPI) BasePath() string { return "/api/v1/workspace" }

func (w *WorkspaceAPI) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/status", w.status)
	rg.GET("/conventions", w.conventions)
	rg.GET("/impact", w.impact)
}

type workspaceStatusResponse struct {
	Root      string             `json:"root"`
	Git       gitStatusSummary   `json:"git"`
	CoreFiles []workspaceFile    `json:"coreFiles"`
	Counts    workspaceFileCount `json:"counts"`
	UpdatedAt string             `json:"updatedAt"`
}

type workspaceConventionsResponse struct {
	Root        string             `json:"root"`
	Sources     []string           `json:"sources"`
	Build       buildConfigSummary `json:"build"`
	Conventions []string           `json:"conventions"`
	Notes       []string           `json:"notes"`
}

type workspaceImpactResponse struct {
	Root            string           `json:"root"`
	Git             gitStatusSummary `json:"git"`
	ImpactedAreas   []string         `json:"impactedAreas"`
	SuggestedChecks []string         `json:"suggestedChecks"`
	Notes           []string         `json:"notes"`
}

type workspaceFileCount struct {
	Total int `json:"total"`
	Text  int `json:"text"`
}

type workspaceFile struct {
	Path     string `json:"path"`
	Size     int64  `json:"size"`
	Modified string `json:"modified"`
	Preview  string `json:"preview,omitempty"`
	Content  string `json:"content,omitempty"`
	IsText   bool   `json:"isText"`
}

type gitStatusSummary struct {
	Branch       string          `json:"branch,omitempty"`
	RawHeader    string          `json:"rawHeader,omitempty"`
	Clean        bool            `json:"clean"`
	Changes      []gitChange     `json:"changes,omitempty"`
	ChangeCounts gitChangeCounts `json:"changeCounts"`
}

type gitChangeCounts struct {
	Staged    int `json:"staged"`
	Unstaged  int `json:"unstaged"`
	Untracked int `json:"untracked"`
}

type gitChange struct {
	Code string `json:"code"`
	Path string `json:"path"`
}

type buildConfigSummary struct {
	Version            string        `json:"version,omitempty"`
	ProjectName        string        `json:"projectName,omitempty"`
	ProjectDescription string        `json:"projectDescription,omitempty"`
	Binary             string        `json:"binary,omitempty"`
	BuildType          string        `json:"buildType,omitempty"`
	CGO                bool          `json:"cgo"`
	Flags              []string      `json:"flags,omitempty"`
	Ldflags            []string      `json:"ldflags,omitempty"`
	Targets            []buildTarget `json:"targets,omitempty"`
	RawFiles           []string      `json:"rawFiles,omitempty"`
}

type buildTarget struct {
	OS   string `json:"os,omitempty"`
	Arch string `json:"arch,omitempty"`
}

func (w *WorkspaceAPI) status(c *gin.Context) {
	snapshot, err := collectWorkspaceSnapshot(w.root)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, workspaceStatusResponse{
		Root:      snapshot.Root,
		Git:       snapshot.Git,
		CoreFiles: snapshot.CoreFiles,
		Counts:    snapshot.Counts,
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
	})
}

func (w *WorkspaceAPI) conventions(c *gin.Context) {
	resp, err := workspaceConventionsForRoot(w.root)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, resp)
}

func (w *WorkspaceAPI) impact(c *gin.Context) {
	resp, err := workspaceImpactForRoot(w.root)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, resp)
}

type workspaceSnapshot struct {
	Root        string
	Git         gitStatusSummary
	CoreFiles   []workspaceFile
	Counts      workspaceFileCount
	Build       buildConfigSummary
	SourceFiles []string
}

func collectWorkspaceSnapshot(root string) (*workspaceSnapshot, error) {
	if root == "" {
		root = "."
	}

	absRoot, err := filepath.Abs(root)
	if err != nil {
		return nil, fmt.Errorf("resolve workspace root: %w", err)
	}

	coreFiles, counts, sourceFiles, err := readCoreFiles(absRoot)
	if err != nil {
		return nil, err
	}

	gitStatus, err := readGitStatus(absRoot)
	if err != nil {
		return nil, err
	}

	buildSummary := parseBuildConfig(coreFiles)

	return &workspaceSnapshot{
		Root:        absRoot,
		Git:         gitStatus,
		CoreFiles:   coreFiles,
		Counts:      counts,
		Build:       buildSummary,
		SourceFiles: sourceFiles,
	}, nil
}

func workspaceConventionsForRoot(root string, conventionPacks ...string) (workspaceConventionsResponse, error) {
	snapshot, err := collectWorkspaceSnapshot(root)
	if err != nil {
		return workspaceConventionsResponse{}, err
	}

	conventions := []string{
		"Use UK English in documentation and user-facing strings.",
		"Use conventional commits: type(scope): description.",
		"Go code lives in package main for this module.",
		"Prefer core build for production builds and core go test for Go tests.",
	}

	notes := []string{
		"Design input was derived from CLAUDE.md, docs/development.md, and .core/build.yaml.",
	}

	languages := detectWorkspaceLanguages(snapshot.Root)
	if len(conventionPacks) > 0 {
		languages = filterConventionLanguages(languages, conventionPacks)
	}
	for _, language := range languages {
		if pack, ok := conventionPackForLanguage(language); ok {
			conventions = append(conventions, pack.Conventions...)
			notes = append(notes, pack.Notes...)
		}
	}

	if snapshot.Build.ProjectName != "" {
		notes = append(notes, fmt.Sprintf("Build manifest detected for %s.", snapshot.Build.ProjectName))
	}
	if !snapshot.Git.Clean {
		notes = append(notes, "The worktree is dirty, so any new work should account for local changes.")
	}

	return workspaceConventionsResponse{
		Root:        snapshot.Root,
		Sources:     snapshot.SourceFiles,
		Build:       snapshot.Build,
		Conventions: conventions,
		Notes:       notes,
	}, nil
}

func filterConventionLanguages(detected []string, allowed []string) []string {
	if len(allowed) == 0 {
		return uniqueStrings(detected)
	}

	allowSet := make(map[string]struct{}, len(allowed))
	for _, name := range allowed {
		key := strings.ToLower(strings.TrimSpace(name))
		if key == "" {
			continue
		}
		allowSet[key] = struct{}{}
	}

	filtered := make([]string, 0, len(detected))
	for _, language := range detected {
		key := strings.ToLower(strings.TrimSpace(language))
		if _, ok := allowSet[key]; ok {
			filtered = append(filtered, key)
		}
	}
	return uniqueStrings(filtered)
}

func workspaceImpactForRoot(root string) (workspaceImpactResponse, error) {
	snapshot, err := collectWorkspaceSnapshot(root)
	if err != nil {
		return workspaceImpactResponse{}, err
	}

	impactedAreas := classifyImpact(snapshot.Git.Changes, snapshot.SourceFiles)
	suggestedChecks := []string{"go build ./...", "go vet ./...", "go test ./... -count=1 -timeout 120s", "go test -cover ./..."}
	notes := []string{
		"Impact categories are inferred from changed paths and .core configuration files.",
	}

	if hasPathPrefix(snapshot.SourceFiles, ".core/") {
		suggestedChecks = append([]string{"core build"}, suggestedChecks...)
	}
	if hasAnyImpact(snapshot.Git.Changes, "frontend/") {
		suggestedChecks = append(suggestedChecks, "cd frontend && npm test")
	}

	if hasManifestDependencyChange(snapshot.Git.Changes) {
		if dependents := downstreamDependents(snapshot.Root); len(dependents) > 0 {
			impactedAreas = append(impactedAreas, "downstream dependents")
			notes = append(notes, "Repos listed in repos.yaml depend on the current workspace: "+strings.Join(dependents, ", ")+".")
			suggestedChecks = append(suggestedChecks, "review downstream dependents: "+strings.Join(dependents, ", "))
		}
	}
	if snapshot.Git.Clean {
		notes = append(notes, "The worktree is clean, so there is no active change set to assess.")
	}

	return workspaceImpactResponse{
		Root:            snapshot.Root,
		Git:             snapshot.Git,
		ImpactedAreas:   impactedAreas,
		SuggestedChecks: uniqueStrings(suggestedChecks),
		Notes:           notes,
	}, nil
}

type conventionPack struct {
	Conventions []string
	Notes       []string
}

func conventionPackForLanguage(language string) (conventionPack, bool) {
	if pack, ok := loadConventionPack(language); ok {
		return pack, true
	}

	switch strings.ToLower(strings.TrimSpace(language)) {
	case "go":
		return conventionPack{
			Conventions: []string{
				"Use core primitives and explicit data shapes for public APIs.",
				"Tests named TestFilename_Function_{Good,Bad,Ugly}; all three mandatory.",
				"Comments should show usage examples, not restate the signature.",
			},
			Notes: []string{
				"Go pack loaded from pkg/workspace/conventions/go.yaml.",
			},
		}, true
	case "php":
		return conventionPack{
			Conventions: []string{
				"Prefer declarative configuration over imperative setup when the shape is recurring.",
				"Keep public methods small and explicit about side effects.",
			},
			Notes: []string{
				"PHP pack loaded from pkg/workspace/conventions/php.yaml.",
			},
		}, true
	case "typescript":
		return conventionPack{
			Conventions: []string{
				"Prefer deterministic component inputs and outputs over hidden ambient state.",
				"Keep UI state isolated from transport concerns.",
			},
			Notes: []string{
				"TypeScript pack loaded from pkg/workspace/conventions/typescript.yaml.",
			},
		}, true
	case "python":
		return conventionPack{
			Conventions: []string{
				"Use explicit function names and stable data contracts for agent-readable code.",
				"Keep module paths semantic rather than abbreviated.",
			},
			Notes: []string{
				"Python pack loaded from pkg/workspace/conventions/python.yaml.",
			},
		}, true
	default:
		return conventionPack{}, false
	}
}

func downstreamDependents(root string) []string {
	workspaceName := strings.ToLower(filepath.Base(root))
	if workspaceName == "" || workspaceName == "." || workspaceName == string(filepath.Separator) {
		return nil
	}

	registryPath, ok := findAncillaryFile(root, "repos.yaml")
	if !ok {
		return nil
	}

	data, err := os.ReadFile(registryPath)
	if err != nil {
		return nil
	}

	var raw struct {
		Repos map[string]struct {
			Depends []string `yaml:"depends"`
		} `yaml:"repos"`
	}
	if err := yaml.Unmarshal(data, &raw); err != nil {
		return nil
	}

	dependents := make([]string, 0)
	for name, repo := range raw.Repos {
		for _, dependency := range repo.Depends {
			if strings.EqualFold(strings.TrimSpace(dependency), workspaceName) {
				dependents = append(dependents, name)
				break
			}
		}
	}

	return uniqueStrings(dependents)
}

func hasManifestDependencyChange(changes []gitChange) bool {
	for _, change := range changes {
		switch filepath.ToSlash(change.Path) {
		case ".core/manifest.yaml", ".core/manifest.yaml.depends":
			return true
		}
	}
	return false
}

func findAncillaryFile(root, name string) (string, bool) {
	cur := root
	for {
		candidate := filepath.Join(cur, name)
		if fileExists(candidate) {
			return candidate, true
		}
		parent := filepath.Dir(cur)
		if parent == cur {
			return "", false
		}
		cur = parent
	}
}

func readCoreFiles(root string) ([]workspaceFile, workspaceFileCount, []string, error) {
	coreDir := filepath.Join(root, ".core")
	entries := []workspaceFile{}
	sourceFiles := []string{}
	counts := workspaceFileCount{}

	info, err := os.Stat(coreDir)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return entries, counts, sourceFiles, nil
		}
		return nil, counts, sourceFiles, fmt.Errorf("inspect .core directory: %w", err)
	}
	if !info.IsDir() {
		return nil, counts, sourceFiles, fmt.Errorf("%s is not a directory", coreDir)
	}

	err = filepath.WalkDir(coreDir, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			return nil
		}

		stat, err := d.Info()
		if err != nil {
			return err
		}

		rel, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}

		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}

		text := isLikelyText(data)
		if text {
			counts.Text++
		}
		counts.Total++

		entries = append(entries, workspaceFile{
			Path:     filepath.ToSlash(rel),
			Size:     stat.Size(),
			Modified: stat.ModTime().UTC().Format(time.RFC3339),
			Preview:  filePreview(data, 8, 480),
			Content:  fileContent(data, 64*1024),
			IsText:   text,
		})
		sourceFiles = append(sourceFiles, filepath.ToSlash(rel))
		return nil
	})
	if err != nil {
		return nil, counts, sourceFiles, fmt.Errorf("read .core files: %w", err)
	}

	return entries, counts, sourceFiles, nil
}

func filePreview(data []byte, maxLines int, maxBytes int) string {
	if len(data) == 0 {
		return ""
	}
	if len(data) > maxBytes {
		data = data[:maxBytes]
	}

	scanner := bufio.NewScanner(strings.NewReader(string(data)))
	lines := make([]string, 0, maxLines)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
		if len(lines) >= maxLines {
			break
		}
	}
	return strings.TrimSpace(strings.Join(lines, "\n"))
}

func fileContent(data []byte, maxBytes int) string {
	if len(data) == 0 {
		return ""
	}
	if len(data) > maxBytes {
		data = data[:maxBytes]
	}
	return strings.TrimSpace(string(data))
}

func isLikelyText(data []byte) bool {
	for _, b := range data {
		if b == 0 {
			return false
		}
	}
	return true
}

func readGitStatus(root string) (gitStatusSummary, error) {
	cmd := exec.Command("git", "-C", root, "status", "--short", "--branch", "--untracked-files=all")
	out, err := cmd.Output()
	if err != nil {
		return gitStatusSummary{}, fmt.Errorf("git status: %w", err)
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	summary := gitStatusSummary{Clean: true}
	if len(lines) == 1 && lines[0] == "" {
		return summary, nil
	}

	for i, line := range lines {
		if line == "" {
			continue
		}
		if i == 0 && strings.HasPrefix(line, "## ") {
			summary.RawHeader = strings.TrimSpace(strings.TrimPrefix(line, "## "))
			summary.Branch = parseGitBranch(summary.RawHeader)
			continue
		}
		if len(line) < 3 {
			continue
		}
		change := gitChange{Code: line[:2], Path: strings.TrimSpace(line[3:])}
		summary.Changes = append(summary.Changes, change)
		summary.Clean = false
		switch change.Code {
		case "??":
			summary.ChangeCounts.Untracked++
		default:
			if change.Code[0] != ' ' {
				summary.ChangeCounts.Staged++
			}
			if change.Code[1] != ' ' {
				summary.ChangeCounts.Unstaged++
			}
		}
	}

	return summary, nil
}

func parseGitBranch(header string) string {
	if header == "" {
		return ""
	}
	branch := header
	if idx := strings.Index(branch, "..."); idx >= 0 {
		branch = branch[:idx]
	}
	branch = strings.TrimSpace(branch)
	branch = strings.TrimPrefix(branch, "(detached from ")
	branch = strings.TrimSuffix(branch, ")")
	return branch
}

func parseBuildConfig(files []workspaceFile) buildConfigSummary {
	summary := buildConfigSummary{}
	for _, file := range files {
		if filepath.Base(file.Path) != "build.yaml" {
			continue
		}
		summary.RawFiles = append(summary.RawFiles, file.Path)
		content := file.Content
		if content == "" {
			content = file.Preview
		}
		var raw struct {
			Version any `yaml:"version"`
			Project struct {
				Name        string `yaml:"name"`
				Description string `yaml:"description"`
				Binary      string `yaml:"binary"`
			} `yaml:"project"`
			Build struct {
				Type    string   `yaml:"type"`
				CGO     bool     `yaml:"cgo"`
				Flags   []string `yaml:"flags"`
				Ldflags []string `yaml:"ldflags"`
			} `yaml:"build"`
			Targets []buildTarget `yaml:"targets"`
		}
		if err := yaml.Unmarshal([]byte(content), &raw); err != nil {
			continue
		}
		summary.Version = fmt.Sprint(raw.Version)
		summary.ProjectName = raw.Project.Name
		summary.ProjectDescription = raw.Project.Description
		summary.Binary = raw.Project.Binary
		summary.BuildType = raw.Build.Type
		summary.CGO = raw.Build.CGO
		summary.Flags = append(summary.Flags, raw.Build.Flags...)
		summary.Ldflags = append(summary.Ldflags, raw.Build.Ldflags...)
		summary.Targets = append(summary.Targets, raw.Targets...)
		break
	}
	return summary
}

func classifyImpact(changes []gitChange, sourceFiles []string) []string {
	areas := []string{}
	for _, change := range changes {
		path := change.Path
		switch {
		case strings.HasPrefix(path, ".core/"):
			areas = append(areas, "build configuration")
		case path == "go.mod" || path == "go.sum":
			areas = append(areas, "dependency graph")
		case strings.HasSuffix(path, ".go"):
			areas = append(areas, "Go backend")
		case strings.HasPrefix(path, "frontend/"):
			areas = append(areas, "Angular frontend")
		case strings.HasPrefix(path, "docs/") || strings.HasSuffix(path, ".md"):
			areas = append(areas, "documentation")
		case strings.HasPrefix(path, "build/"):
			areas = append(areas, "packaging and platform build files")
		default:
			areas = append(areas, "general project context")
		}
	}

	if hasPathPrefix(sourceFiles, ".core/") {
		areas = append(areas, "workspace metadata")
	}
	if len(changes) == 0 {
		areas = append(areas, "no active changes")
	}

	return uniqueStrings(areas)
}

func hasPathPrefix(paths []string, prefix string) bool {
	for _, path := range paths {
		if strings.HasPrefix(path, prefix) {
			return true
		}
	}
	return false
}

func hasAnyImpact(changes []gitChange, prefix string) bool {
	for _, change := range changes {
		if strings.HasPrefix(change.Path, prefix) {
			return true
		}
	}
	return false
}

func uniqueStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}
