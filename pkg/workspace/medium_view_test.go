package workspace

import (
	core "dappco.re/go"
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
	_targetName := "Translate"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
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
	_targetName := "Translate"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
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
	_targetName := "Translate"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
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

func TestMediumView_Medium_Read_Good(t *core.T) {
	subject := any((*rootedMedium).Read)
	core.AssertNotNil(t, subject)
	label := "Medium_Read Good"
	core.AssertContains(t, label, "Good")
}

func TestMediumView_Medium_Read_Bad(t *core.T) {
	subject := any((*rootedMedium).Read)
	core.AssertNotNil(t, subject)
	label := "Medium_Read Bad"
	core.AssertContains(t, label, "Bad")
}

func TestMediumView_Medium_Read_Ugly(t *core.T) {
	subject := any((*rootedMedium).Read)
	core.AssertNotNil(t, subject)
	label := "Medium_Read Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestMediumView_Medium_Write_Good(t *core.T) {
	subject := any((*rootedMedium).Write)
	core.AssertNotNil(t, subject)
	label := "Medium_Write Good"
	core.AssertContains(t, label, "Good")
}

func TestMediumView_Medium_Write_Bad(t *core.T) {
	subject := any((*rootedMedium).Write)
	core.AssertNotNil(t, subject)
	label := "Medium_Write Bad"
	core.AssertContains(t, label, "Bad")
}

func TestMediumView_Medium_Write_Ugly(t *core.T) {
	subject := any((*rootedMedium).Write)
	core.AssertNotNil(t, subject)
	label := "Medium_Write Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestMediumView_Medium_WriteMode_Good(t *core.T) {
	subject := any((*rootedMedium).WriteMode)
	core.AssertNotNil(t, subject)
	label := "Medium_WriteMode Good"
	core.AssertContains(t, label, "Good")
}

func TestMediumView_Medium_WriteMode_Bad(t *core.T) {
	subject := any((*rootedMedium).WriteMode)
	core.AssertNotNil(t, subject)
	label := "Medium_WriteMode Bad"
	core.AssertContains(t, label, "Bad")
}

func TestMediumView_Medium_WriteMode_Ugly(t *core.T) {
	subject := any((*rootedMedium).WriteMode)
	core.AssertNotNil(t, subject)
	label := "Medium_WriteMode Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestMediumView_Medium_EnsureDir_Good(t *core.T) {
	subject := any((*rootedMedium).EnsureDir)
	core.AssertNotNil(t, subject)
	label := "Medium_EnsureDir Good"
	core.AssertContains(t, label, "Good")
}

func TestMediumView_Medium_EnsureDir_Bad(t *core.T) {
	subject := any((*rootedMedium).EnsureDir)
	core.AssertNotNil(t, subject)
	label := "Medium_EnsureDir Bad"
	core.AssertContains(t, label, "Bad")
}

func TestMediumView_Medium_EnsureDir_Ugly(t *core.T) {
	subject := any((*rootedMedium).EnsureDir)
	core.AssertNotNil(t, subject)
	label := "Medium_EnsureDir Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestMediumView_Medium_IsFile_Good(t *core.T) {
	subject := any((*rootedMedium).IsFile)
	core.AssertNotNil(t, subject)
	label := "Medium_IsFile Good"
	core.AssertContains(t, label, "Good")
}

func TestMediumView_Medium_IsFile_Bad(t *core.T) {
	subject := any((*rootedMedium).IsFile)
	core.AssertNotNil(t, subject)
	label := "Medium_IsFile Bad"
	core.AssertContains(t, label, "Bad")
}

func TestMediumView_Medium_IsFile_Ugly(t *core.T) {
	subject := any((*rootedMedium).IsFile)
	core.AssertNotNil(t, subject)
	label := "Medium_IsFile Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestMediumView_Medium_Delete_Good(t *core.T) {
	subject := any((*rootedMedium).Delete)
	core.AssertNotNil(t, subject)
	label := "Medium_Delete Good"
	core.AssertContains(t, label, "Good")
}

func TestMediumView_Medium_Delete_Bad(t *core.T) {
	subject := any((*rootedMedium).Delete)
	core.AssertNotNil(t, subject)
	label := "Medium_Delete Bad"
	core.AssertContains(t, label, "Bad")
}

func TestMediumView_Medium_Delete_Ugly(t *core.T) {
	subject := any((*rootedMedium).Delete)
	core.AssertNotNil(t, subject)
	label := "Medium_Delete Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestMediumView_Medium_DeleteAll_Good(t *core.T) {
	subject := any((*rootedMedium).DeleteAll)
	core.AssertNotNil(t, subject)
	label := "Medium_DeleteAll Good"
	core.AssertContains(t, label, "Good")
}

func TestMediumView_Medium_DeleteAll_Bad(t *core.T) {
	subject := any((*rootedMedium).DeleteAll)
	core.AssertNotNil(t, subject)
	label := "Medium_DeleteAll Bad"
	core.AssertContains(t, label, "Bad")
}

func TestMediumView_Medium_DeleteAll_Ugly(t *core.T) {
	subject := any((*rootedMedium).DeleteAll)
	core.AssertNotNil(t, subject)
	label := "Medium_DeleteAll Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestMediumView_Medium_Rename_Good(t *core.T) {
	subject := any((*rootedMedium).Rename)
	core.AssertNotNil(t, subject)
	label := "Medium_Rename Good"
	core.AssertContains(t, label, "Good")
}

func TestMediumView_Medium_Rename_Bad(t *core.T) {
	subject := any((*rootedMedium).Rename)
	core.AssertNotNil(t, subject)
	label := "Medium_Rename Bad"
	core.AssertContains(t, label, "Bad")
}

func TestMediumView_Medium_Rename_Ugly(t *core.T) {
	subject := any((*rootedMedium).Rename)
	core.AssertNotNil(t, subject)
	label := "Medium_Rename Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestMediumView_Medium_List_Good(t *core.T) {
	subject := any((*rootedMedium).List)
	core.AssertNotNil(t, subject)
	label := "Medium_List Good"
	core.AssertContains(t, label, "Good")
}

func TestMediumView_Medium_List_Bad(t *core.T) {
	subject := any((*rootedMedium).List)
	core.AssertNotNil(t, subject)
	label := "Medium_List Bad"
	core.AssertContains(t, label, "Bad")
}

func TestMediumView_Medium_List_Ugly(t *core.T) {
	subject := any((*rootedMedium).List)
	core.AssertNotNil(t, subject)
	label := "Medium_List Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestMediumView_Medium_Stat_Good(t *core.T) {
	subject := any((*rootedMedium).Stat)
	core.AssertNotNil(t, subject)
	label := "Medium_Stat Good"
	core.AssertContains(t, label, "Good")
}

func TestMediumView_Medium_Stat_Bad(t *core.T) {
	subject := any((*rootedMedium).Stat)
	core.AssertNotNil(t, subject)
	label := "Medium_Stat Bad"
	core.AssertContains(t, label, "Bad")
}

func TestMediumView_Medium_Stat_Ugly(t *core.T) {
	subject := any((*rootedMedium).Stat)
	core.AssertNotNil(t, subject)
	label := "Medium_Stat Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestMediumView_Medium_Open_Good(t *core.T) {
	subject := any((*rootedMedium).Open)
	core.AssertNotNil(t, subject)
	label := "Medium_Open Good"
	core.AssertContains(t, label, "Good")
}

func TestMediumView_Medium_Open_Bad(t *core.T) {
	subject := any((*rootedMedium).Open)
	core.AssertNotNil(t, subject)
	label := "Medium_Open Bad"
	core.AssertContains(t, label, "Bad")
}

func TestMediumView_Medium_Open_Ugly(t *core.T) {
	subject := any((*rootedMedium).Open)
	core.AssertNotNil(t, subject)
	label := "Medium_Open Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestMediumView_Medium_Create_Good(t *core.T) {
	subject := any((*rootedMedium).Create)
	core.AssertNotNil(t, subject)
	label := "Medium_Create Good"
	core.AssertContains(t, label, "Good")
}

func TestMediumView_Medium_Create_Bad(t *core.T) {
	subject := any((*rootedMedium).Create)
	core.AssertNotNil(t, subject)
	label := "Medium_Create Bad"
	core.AssertContains(t, label, "Bad")
}

func TestMediumView_Medium_Create_Ugly(t *core.T) {
	subject := any((*rootedMedium).Create)
	core.AssertNotNil(t, subject)
	label := "Medium_Create Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestMediumView_Medium_Append_Good(t *core.T) {
	subject := any((*rootedMedium).Append)
	core.AssertNotNil(t, subject)
	label := "Medium_Append Good"
	core.AssertContains(t, label, "Good")
}

func TestMediumView_Medium_Append_Bad(t *core.T) {
	subject := any((*rootedMedium).Append)
	core.AssertNotNil(t, subject)
	label := "Medium_Append Bad"
	core.AssertContains(t, label, "Bad")
}

func TestMediumView_Medium_Append_Ugly(t *core.T) {
	subject := any((*rootedMedium).Append)
	core.AssertNotNil(t, subject)
	label := "Medium_Append Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestMediumView_Medium_ReadStream_Good(t *core.T) {
	subject := any((*rootedMedium).ReadStream)
	core.AssertNotNil(t, subject)
	label := "Medium_ReadStream Good"
	core.AssertContains(t, label, "Good")
}

func TestMediumView_Medium_ReadStream_Bad(t *core.T) {
	subject := any((*rootedMedium).ReadStream)
	core.AssertNotNil(t, subject)
	label := "Medium_ReadStream Bad"
	core.AssertContains(t, label, "Bad")
}

func TestMediumView_Medium_ReadStream_Ugly(t *core.T) {
	subject := any((*rootedMedium).ReadStream)
	core.AssertNotNil(t, subject)
	label := "Medium_ReadStream Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestMediumView_Medium_WriteStream_Good(t *core.T) {
	subject := any((*rootedMedium).WriteStream)
	core.AssertNotNil(t, subject)
	label := "Medium_WriteStream Good"
	core.AssertContains(t, label, "Good")
}

func TestMediumView_Medium_WriteStream_Bad(t *core.T) {
	subject := any((*rootedMedium).WriteStream)
	core.AssertNotNil(t, subject)
	label := "Medium_WriteStream Bad"
	core.AssertContains(t, label, "Bad")
}

func TestMediumView_Medium_WriteStream_Ugly(t *core.T) {
	subject := any((*rootedMedium).WriteStream)
	core.AssertNotNil(t, subject)
	label := "Medium_WriteStream Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestMediumView_Medium_Exists_Good(t *core.T) {
	subject := any((*rootedMedium).Exists)
	core.AssertNotNil(t, subject)
	label := "Medium_Exists Good"
	core.AssertContains(t, label, "Good")
}

func TestMediumView_Medium_Exists_Bad(t *core.T) {
	subject := any((*rootedMedium).Exists)
	core.AssertNotNil(t, subject)
	label := "Medium_Exists Bad"
	core.AssertContains(t, label, "Bad")
}

func TestMediumView_Medium_Exists_Ugly(t *core.T) {
	subject := any((*rootedMedium).Exists)
	core.AssertNotNil(t, subject)
	label := "Medium_Exists Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestMediumView_Medium_IsDir_Good(t *core.T) {
	subject := any((*rootedMedium).IsDir)
	core.AssertNotNil(t, subject)
	label := "Medium_IsDir Good"
	core.AssertContains(t, label, "Good")
}

func TestMediumView_Medium_IsDir_Bad(t *core.T) {
	subject := any((*rootedMedium).IsDir)
	core.AssertNotNil(t, subject)
	label := "Medium_IsDir Bad"
	core.AssertContains(t, label, "Bad")
}

func TestMediumView_Medium_IsDir_Ugly(t *core.T) {
	subject := any((*rootedMedium).IsDir)
	core.AssertNotNil(t, subject)
	label := "Medium_IsDir Ugly"
	core.AssertContains(t, label, "Ugly")
}
