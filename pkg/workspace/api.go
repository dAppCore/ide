package workspace

import (
	"context"

	coreio "dappco.re/go/io"

	"dappco.re/go/ide/pkg/config"
)

// projects, err := Scan(context.Background(), ScanInput{Root: ".", Depth: 3})
// core.Println(projects[0].Root)
func Scan(ctx context.Context, input ScanInput) ([]Project, error) {
	return ScanWithMedium(ctx, coreio.Local, input)
}

// projects, err := ScanWithMedium(ctx, coreio.NewMemoryMedium(), ScanInput{Root: "/workspace", Depth: 2})
func ScanWithMedium(ctx context.Context, medium coreio.Medium, input ScanInput) ([]Project, error) {
	subsystem := New(
		config.Workspace{Root: input.Root, ScanDepth: input.Depth},
		medium,
		nil,
	)
	output, err := subsystem.scan(ctx, input)
	if err != nil {
		return nil, err
	}
	return output.Projects, nil
}

// status, err := Status(context.Background(), StatusInput{Root: "."})
// core.Println(status.Git.Branch)
func Status(ctx context.Context, input StatusInput) (StatusOutput, error) {
	return StatusWithMedium(ctx, coreio.Local, input)
}

// status, err := StatusWithMedium(ctx, coreio.NewMemoryMedium(), StatusInput{Root: "/workspace"})
func StatusWithMedium(ctx context.Context, medium coreio.Medium, input StatusInput) (StatusOutput, error) {
	subsystem := New(config.Workspace{Root: input.Root}, medium, nil)
	return subsystem.status(ctx, input)
}

// out, err := Conventions(context.Background(), ConventionsInput{Root: "."})
// core.Println(out.Build.ProjectName)
func Conventions(ctx context.Context, input ConventionsInput) (ConventionsOutput, error) {
	return ConventionsWithMedium(ctx, coreio.Local, input)
}

// out, err := ConventionsWithMedium(ctx, coreio.NewMemoryMedium(), ConventionsInput{Root: "/workspace"})
func ConventionsWithMedium(ctx context.Context, medium coreio.Medium, input ConventionsInput) (ConventionsOutput, error) {
	subsystem := New(config.Workspace{Root: input.Root}, medium, nil)
	return subsystem.conventions(ctx, input)
}

// out, err := Impact(context.Background(), ImpactInput{Root: "."})
// core.Println(out.ImpactedAreas)
func Impact(ctx context.Context, input ImpactInput) (ImpactOutput, error) {
	return ImpactWithMedium(ctx, coreio.Local, input)
}

// out, err := ImpactWithMedium(ctx, coreio.NewMemoryMedium(), ImpactInput{Root: "/workspace"})
func ImpactWithMedium(ctx context.Context, medium coreio.Medium, input ImpactInput) (ImpactOutput, error) {
	subsystem := New(config.Workspace{Root: input.Root}, medium, nil)
	return subsystem.impact(ctx, input)
}
