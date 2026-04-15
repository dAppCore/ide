package workspace

import (
	"context"

	coreio "dappco.re/go/core/io"

	"dappco.re/go/core/ide/pkg/config"
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
