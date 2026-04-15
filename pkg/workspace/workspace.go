package workspace

import (
	"context"
	"os"
	"time"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"
	"dappco.re/go/core/process"
	coremcp "dappco.re/go/mcp/pkg/mcp"

	"dappco.re/go/core/ide/pkg/config"
)

type Subsystem struct {
	cfg     config.Workspace
	medium  coreio.Medium
	process *process.Service
}

func New(cfg config.Workspace, medium coreio.Medium, processService *process.Service) *Subsystem {
	if medium == nil {
		medium = coreio.Local
	}
	if processService == nil {
		processService = process.Default()
	}
	return &Subsystem{cfg: cfg, medium: medium, process: processService}
}

func (s *Subsystem) Name() string { return "workspace" }

func (s *Subsystem) RegisterTools(svc *coremcp.Service) {
	s.registerTools(svc)
}

func (s *Subsystem) RegisterActions(c *core.Core) {
	s.registerActions(c)
}

func (s *Subsystem) status(ctx context.Context, input StatusInput) (StatusOutput, error) {
	root, err := s.root(input.Root)
	if err != nil {
		return StatusOutput{}, err
	}
	medium := s.workspaceMedium()
	coreFiles, counts, _, err := readCoreFiles(medium, root, s.cfg.Ignore...)
	if err != nil {
		return StatusOutput{}, err
	}
	git, err := gitStatus(ctx, s.process, root)
	if err != nil {
		return StatusOutput{}, err
	}
	return StatusOutput{
		Root:      root,
		Git:       git,
		CoreFiles: coreFiles,
		Counts:    counts,
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func (s *Subsystem) conventions(ctx context.Context, input ConventionsInput) (ConventionsOutput, error) {
	root, err := s.root(input.Root)
	if err != nil {
		return ConventionsOutput{}, err
	}
	medium := s.workspaceMedium()
	_, _, sources, err := readCoreFiles(medium, root, s.cfg.Ignore...)
	if err != nil {
		return ConventionsOutput{}, err
	}
	projects, scanErr := scanProjects(ctx, ScanInput{Root: root, Depth: s.cfg.ScanDepth}, medium, s.process, root, s.cfg.Ignore...)
	if scanErr != nil {
		return ConventionsOutput{}, scanErr
	}
	languages := detectLanguages(medium, root, s.cfg.Ignore...)
	for _, project := range projects {
		languages = append(languages, project.Languages...)
	}
	packs, notes := loadConventionPacks(unique(languages), s.cfg.ConventionPacks)
	git, _ := gitStatus(ctx, s.process, root)
	if !git.Clean {
		notes = append(notes, "The worktree is dirty, so any new work should account for local changes.")
	}
	return ConventionsOutput{
		Root:        root,
		Sources:     sources,
		Build:       BuildSummary{ProjectName: readBuildProjectName(medium, root)},
		Conventions: packs,
		Notes:       notes,
	}, nil
}

func (s *Subsystem) Conventions(ctx context.Context, input ConventionsInput) (ConventionsOutput, error) {
	return s.conventions(ctx, input)
}

func (s *Subsystem) impact(ctx context.Context, input ImpactInput) (ImpactOutput, error) {
	root, err := s.root(input.Root)
	if err != nil {
		return ImpactOutput{}, err
	}
	git, err := gitStatus(ctx, s.process, root)
	if err != nil {
		return ImpactOutput{}, err
	}
	areas, checks, notes := classifyImpact(s.workspaceMedium(), root, git.Changes, s.cfg.Ignore...)
	return ImpactOutput{
		Root:            root,
		Git:             git,
		ImpactedAreas:   areas,
		SuggestedChecks: checks,
		Notes:           notes,
	}, nil
}

func (s *Subsystem) scan(ctx context.Context, input ScanInput) (ScanOutput, error) {
	root, err := s.root(input.Root)
	if err != nil {
		return ScanOutput{}, err
	}
	depth := input.Depth
	if depth <= 0 {
		depth = s.cfg.ScanDepth
	}
	projects, err := scanProjects(ctx, ScanInput{Root: root, Depth: depth}, s.workspaceMedium(), s.process, root, s.cfg.Ignore...)
	if err != nil {
		return ScanOutput{}, err
	}
	return ScanOutput{Projects: projects}, nil
}

func (s *Subsystem) workspaceMedium() coreio.Medium {
	if s == nil {
		return coreio.Local
	}
	root := s.Root()
	if core.Trim(root) == "" {
		return s.medium
	}
	if s.medium == nil || s.medium != coreio.Local {
		return s.medium
	}
	sandboxed, err := coreio.NewSandboxed(root)
	if err != nil {
		return s.medium
	}
	return &rootedMedium{medium: sandboxed, root: root, bound: true}
}

func (s *Subsystem) Root() string {
	base, err := resolveWorkspaceRoot(s.cfg.Root, "")
	if err != nil {
		return core.CleanPath(core.Trim(s.cfg.Root), ".")
	}
	return discoverWorkspaceRoot(s.scanMedium(), base, s.cfg.ScanDepth)
}

func (s *Subsystem) root(override string) (string, error) {
	if core.Trim(override) == "" {
		return s.Root(), nil
	}
	return resolveWorkspaceRoot(s.Root(), override)
}

func (s *Subsystem) scanMedium() coreio.Medium {
	if s == nil || s.medium == nil {
		return coreio.Local
	}
	return s.medium
}

func resolveWorkspaceRoot(base, requested string) (string, error) {
	base = core.Trim(base)
	if base == "" {
		base = "."
	}
	if !core.PathIsAbs(base) {
		cwd, err := os.Getwd()
		if err != nil {
			return "", core.E("workspace.root", "resolve trusted base", err)
		}
		base = core.Path(cwd, base)
	}
	trusted := core.CleanPath(base, core.Env("DS"))
	requested = core.Trim(requested)
	if requested == "" {
		requested = base
	}
	candidate := requested
	if !core.PathIsAbs(candidate) {
		candidate = core.Path(trusted, candidate)
	}
	candidate = core.CleanPath(candidate, core.Env("DS"))

	trusted = core.CleanPath(trusted, core.Env("DS"))
	candidate = core.CleanPath(candidate, core.Env("DS"))
	sep := core.Env("DS")
	trustedPrefix := trusted
	if !core.HasSuffix(trustedPrefix, sep) {
		trustedPrefix += sep
	}
	if candidate != trusted && !core.HasPrefix(candidate, trustedPrefix) {
		return "", core.E("workspace.root", core.Concat("root ", candidate, " is outside allowed workspace root ", trusted), nil)
	}

	return candidate, nil
}

func discoverWorkspaceRoot(medium coreio.Medium, start string, depth int) string {
	medium = ensureMedium(medium)
	start = core.Trim(start)
	if start == "" {
		return ""
	}
	if depth < 0 {
		depth = 0
	}
	current := start
	for i := 0; i <= depth; i++ {
		if hasWorkspaceMetadata(medium, current) {
			return current
		}
		parent := parentDir(current)
		if parent == current {
			break
		}
		current = parent
	}
	return start
}

func hasWorkspaceMetadata(medium coreio.Medium, root string) bool {
	if medium == nil {
		return false
	}
	manifestPath := core.JoinPath(root, ".core", "manifest.yaml")
	buildPath := core.JoinPath(root, ".core", "build.yaml")
	return medium.Exists(manifestPath) || medium.Exists(buildPath)
}

func ensureMedium(medium coreio.Medium) coreio.Medium {
	if medium != nil {
		return medium
	}
	return coreio.Local
}
