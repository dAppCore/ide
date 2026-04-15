package workspace

import (
	"context"
	"time"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"
	"dappco.re/go/core/process"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	"github.com/modelcontextprotocol/go-sdk/mcp"

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
	server := svc.Server()
	coremcp.AddToolRecorded(svc, server, "workspace", &mcp.Tool{
		Name:        "workspace_status",
		Description: "Inspect the current workspace root, git status, and .core files.",
	}, s.handleStatus)
	coremcp.AddToolRecorded(svc, server, "workspace", &mcp.Tool{
		Name:        "workspace_conventions",
		Description: "Load workspace conventions from .core/build.yaml and repository context.",
	}, s.handleConventions)
	coremcp.AddToolRecorded(svc, server, "workspace", &mcp.Tool{
		Name:        "workspace_impact",
		Description: "Estimate the impact of the current git diff on the workspace.",
	}, s.handleImpact)
	coremcp.AddToolRecorded(svc, server, "workspace", &mcp.Tool{
		Name:        "workspace_scan",
		Description: "Scan upward from the workspace root for projects with .core metadata.",
	}, s.handleScan)
}

func (s *Subsystem) RegisterActions(c *core.Core) {
	c.Action("ide.workspace.status", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[StatusInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.status(ctx, input)
		return core.Result{}.New(out, err)
	})
	c.Action("ide.workspace.conventions", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[ConventionsInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.conventions(ctx, input)
		return core.Result{}.New(out, err)
	})
	c.Action("ide.workspace.impact", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[ImpactInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.impact(ctx, input)
		return core.Result{}.New(out, err)
	})
	c.Action("ide.workspace.scan", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[ScanInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.scan(ctx, input)
		return core.Result{}.New(out, err)
	})
}

func (s *Subsystem) handleStatus(ctx context.Context, _ *mcp.CallToolRequest, input StatusInput) (*mcp.CallToolResult, StatusOutput, error) {
	out, err := s.status(ctx, input)
	return nil, out, err
}

func (s *Subsystem) handleConventions(ctx context.Context, _ *mcp.CallToolRequest, input ConventionsInput) (*mcp.CallToolResult, ConventionsOutput, error) {
	out, err := s.conventions(ctx, input)
	return nil, out, err
}

func (s *Subsystem) handleImpact(ctx context.Context, _ *mcp.CallToolRequest, input ImpactInput) (*mcp.CallToolResult, ImpactOutput, error) {
	out, err := s.impact(ctx, input)
	return nil, out, err
}

func (s *Subsystem) handleScan(ctx context.Context, _ *mcp.CallToolRequest, input ScanInput) (*mcp.CallToolResult, ScanOutput, error) {
	out, err := s.scan(ctx, input)
	return nil, out, err
}

func (s *Subsystem) status(ctx context.Context, input StatusInput) (StatusOutput, error) {
	root := s.root(input.Root)
	coreFiles, counts, _, err := readCoreFiles(s.medium, root)
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
	root := s.root(input.Root)
	_, _, sources, err := readCoreFiles(s.medium, root)
	if err != nil {
		return ConventionsOutput{}, err
	}
	projects, scanErr := scanProjects(ctx, ScanInput{Root: root, Depth: s.cfg.ScanDepth}, s.medium, s.process, root)
	if scanErr != nil {
		return ConventionsOutput{}, scanErr
	}
	languages := detectLanguages(s.medium, root)
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
		Build:       BuildSummary{ProjectName: readBuildProjectName(s.medium, root)},
		Conventions: packs,
		Notes:       notes,
	}, nil
}

func (s *Subsystem) Conventions(ctx context.Context, input ConventionsInput) (ConventionsOutput, error) {
	return s.conventions(ctx, input)
}

func (s *Subsystem) impact(ctx context.Context, input ImpactInput) (ImpactOutput, error) {
	root := s.root(input.Root)
	git, err := gitStatus(ctx, s.process, root)
	if err != nil {
		return ImpactOutput{}, err
	}
	areas, checks, notes := classifyImpact(s.medium, root, git.Changes)
	return ImpactOutput{
		Root:            root,
		Git:             git,
		ImpactedAreas:   areas,
		SuggestedChecks: checks,
		Notes:           notes,
	}, nil
}

func (s *Subsystem) scan(ctx context.Context, input ScanInput) (ScanOutput, error) {
	root := s.root(input.Root)
	depth := input.Depth
	if depth <= 0 {
		depth = s.cfg.ScanDepth
	}
	projects, err := scanProjects(ctx, ScanInput{Root: root, Depth: depth}, s.medium, s.process, root)
	if err != nil {
		return ScanOutput{}, err
	}
	return ScanOutput{Projects: projects}, nil
}

func (s *Subsystem) root(override string) string {
	if core.Trim(override) != "" {
		return override
	}
	if core.Trim(s.cfg.Root) != "" {
		return s.cfg.Root
	}
	return "."
}

func (s *Subsystem) Root() string {
	return s.root("")
}
