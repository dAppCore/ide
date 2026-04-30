package workspace

import "testing"

func TestIgnore_ShouldIgnorePath_Good(t *testing.T) {
	_targetName := "ShouldIgnorePath"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	cases := []struct {
		name    string
		root    string
		path    string
		ignores []string
		want    bool
	}{
		{
			name:    "directory pattern",
			root:    "/workspace",
			path:    "/workspace/node_modules/pkg/index.js",
			ignores: []string{"node_modules/"},
			want:    true,
		},
		{
			name:    "glob pattern",
			root:    "/workspace",
			path:    "/workspace/src/main.go",
			ignores: []string{"src/*.go"},
			want:    true,
		},
		{
			name:    "non match",
			root:    "/workspace",
			path:    "/workspace/src/main.ts",
			ignores: []string{"src/*.go"},
			want:    false,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := shouldIgnorePath(tc.root, tc.path, tc.ignores); got != tc.want {
				t.Fatalf("expected %v, got %v", tc.want, got)
			}
		})
	}
}

func TestIgnore_ShouldIgnorePath_Bad(t *testing.T) {
	_targetName := "ShouldIgnorePath"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	cases := []struct {
		name    string
		root    string
		path    string
		ignores []string
	}{
		{
			name:    "no ignores",
			root:    "/workspace",
			path:    "/workspace/node_modules/pkg/index.js",
			ignores: nil,
		},
		{
			name:    "blank ignore pattern",
			root:    "/workspace",
			path:    "/workspace/node_modules/pkg/index.js",
			ignores: []string{""},
		},
		{
			name:    "blank root and path",
			root:    "",
			path:    "",
			ignores: []string{"*"},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := shouldIgnorePath(tc.root, tc.path, tc.ignores); got {
				t.Fatalf("expected path to stay visible, got %v", got)
			}
		})
	}
}

func TestIgnore_ShouldIgnorePath_Ugly(t *testing.T) {
	_targetName := "ShouldIgnorePath"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	cases := []struct {
		name    string
		root    string
		path    string
		ignores []string
		want    bool
	}{
		{
			name:    "normalized root and path",
			root:    "/workspace/",
			path:    "/workspace/./docs/../node_modules/pkg/file.go",
			ignores: []string{"node_modules/"},
			want:    true,
		},
		{
			name:    "root path itself",
			root:    "/workspace",
			path:    "/workspace",
			ignores: []string{"*"},
			want:    true,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := shouldIgnorePath(tc.root, tc.path, tc.ignores); got != tc.want {
				t.Fatalf("expected %v, got %v", tc.want, got)
			}
		})
	}
}
