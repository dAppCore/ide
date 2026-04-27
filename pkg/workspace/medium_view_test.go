package workspace

import (
	"io"
	"io/fs"
	"testing"

	coreio "dappco.re/go/io"
)

type recordingMedium struct {
	readPath  string
	writePath string
	writeBody string
	writeMode fs.FileMode
	err       error
}

var _ coreio.Medium = (*recordingMedium)(nil)

func (m *recordingMedium) Read(path string) (string, error) {
	m.readPath = path
	return "ok", m.err
}

func (m *recordingMedium) Write(path, content string) error {
	m.writePath = path
	m.writeBody = content
	return m.err
}

func (m *recordingMedium) WriteMode(path, content string, mode fs.FileMode) error {
	m.writePath = path
	m.writeBody = content
	m.writeMode = mode
	return m.err
}

func (m *recordingMedium) EnsureDir(string) error { return m.err }

func (m *recordingMedium) IsFile(string) bool { return true }

func (m *recordingMedium) Delete(string) error { return m.err }

func (m *recordingMedium) DeleteAll(string) error { return m.err }

func (m *recordingMedium) Rename(string, string) error { return m.err }

func (m *recordingMedium) List(string) ([]fs.DirEntry, error) { return nil, m.err }

func (m *recordingMedium) Stat(string) (fs.FileInfo, error) { return nil, m.err }

func (m *recordingMedium) Open(string) (fs.File, error) { return nil, m.err }

func (m *recordingMedium) Create(string) (io.WriteCloser, error) { return nil, m.err }

func (m *recordingMedium) Append(string) (io.WriteCloser, error) { return nil, m.err }

func (m *recordingMedium) ReadStream(string) (io.ReadCloser, error) { return nil, m.err }

func (m *recordingMedium) WriteStream(string) (io.WriteCloser, error) { return nil, m.err }

func (m *recordingMedium) Exists(string) bool { return true }

func (m *recordingMedium) IsDir(string) bool { return false }

func TestMediumView_Translate_Good(t *testing.T) {
	delegate := &recordingMedium{}
	medium := &rootedMedium{medium: delegate, root: "/workspace", bound: true}

	if got, err := medium.Read("/workspace/docs/readme.md"); err != nil {
		t.Fatalf("read: %v", err)
	} else if got != "ok" {
		t.Fatalf("expected delegate read result, got %q", got)
	}
	if delegate.readPath != "docs/readme.md" {
		t.Fatalf("expected rooted read path, got %q", delegate.readPath)
	}

	if err := medium.Write("/workspace/docs/todo.txt", "todo"); err != nil {
		t.Fatalf("write: %v", err)
	}
	if delegate.writePath != "docs/todo.txt" {
		t.Fatalf("expected rooted write path, got %q", delegate.writePath)
	}
	if delegate.writeBody != "todo" {
		t.Fatalf("expected delegate write body, got %q", delegate.writeBody)
	}
}

func TestMediumView_Translate_Bad(t *testing.T) {
	delegate := &recordingMedium{}
	medium := &rootedMedium{medium: delegate, root: "/workspace", bound: true}

	if err := medium.Delete("/tmp/secret.txt"); err == nil {
		t.Fatal("expected outside-root path to be rejected")
	}
	if delegate.readPath != "" || delegate.writePath != "" {
		t.Fatalf("expected delegate to stay unused, got %#v", delegate)
	}
}

func TestMediumView_Translate_Ugly(t *testing.T) {
	t.Run("nil receiver passes through", func(t *testing.T) {
		got, err := (*rootedMedium)(nil).translate("/workspace/docs/readme.md")
		if err != nil {
			t.Fatalf("translate: %v", err)
		}
		if got != "/workspace/docs/readme.md" {
			t.Fatalf("expected passthrough path, got %q", got)
		}
	})

	t.Run("unbound wrapper passes through", func(t *testing.T) {
		medium := &rootedMedium{medium: &recordingMedium{}, root: "/workspace", bound: false}
		got, err := medium.translate("/workspace/docs/readme.md")
		if err != nil {
			t.Fatalf("translate: %v", err)
		}
		if got != "/workspace/docs/readme.md" {
			t.Fatalf("expected passthrough path, got %q", got)
		}
	})

	t.Run("root boundary becomes empty path", func(t *testing.T) {
		medium := &rootedMedium{medium: &recordingMedium{}, root: "/workspace", bound: true}
		got, err := medium.translate("/workspace")
		if err != nil {
			t.Fatalf("translate: %v", err)
		}
		if got != "" {
			t.Fatalf("expected empty relative path, got %q", got)
		}
	})
}
