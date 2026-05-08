// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"os"
	"path/filepath"
	"sync"

	core "dappco.re/go"
	"dappco.re/go/orm"
)

// ormBackendState tracks which Medium is currently mounted under
// "default" and (when DuckDB is active) the underlying file path. The
// /data panel's backend picker flips between Memium (in-mem, lost on
// restart) and DuckDB (persistent).
type ormBackendState struct {
	mu         sync.Mutex
	current    string // "memium" | "duckdb"
	memium     *orm.Memium
	duck       *duckDBMedium
	duckPath   string
	core       *core.Core
}

var ormBackend = &ormBackendState{current: "memium"}

// registerOrmService mounts the canonical core/orm Service into the IDE's
// Core runtime + sets up an in-memory Memium with the demo `note` table.
// This is the IDE's first direct import of an external core/* package
// surface (vs the shell-out pattern build/containers/lint use).
//
// Schemas are registered via orm.RegisterSchema; the Memium is mounted
// under the "default" name (which orm.Service.resolve picks up). When
// the IDE eventually wants to switch to DuckDB or Postgres it just
// mounts a different Medium under the same name — bridge tools and
// frontend stay unchanged.
func registerOrmService(c *core.Core) core.Result {
	if r := orm.Register(c); !r.OK {
		return r
	}

	ormBackend.mu.Lock()
	ormBackend.core = c
	ormBackend.mu.Unlock()

	memium := orm.NewMemium()
	if r := orm.Mount(c, "default", memium); !r.OK {
		return r
	}
	ormBackend.mu.Lock()
	ormBackend.memium = memium
	ormBackend.current = "memium"
	ormBackend.mu.Unlock()

	for _, schema := range ideOrmSchemas() {
		if r := orm.RegisterSchema(c, schema); !r.OK {
			return r
		}
		memium.RegisterTable(schema.Name, schema)
	}

	// Seed a single demo note so the /data panel renders non-empty on first
	// open. No-op once the user creates their own.
	memium.Insert("note", map[string]any{
		"id":         int64(1),
		"title":      "Welcome to /data",
		"body":       "core/ide now wires core/orm directly. This row was inserted by orm.Memium during composeRuntime — try saving more via the bridge.",
		"created_at": "2026-05-08T14:00:00Z",
	})

	return core.Ok(true)
}

// switchOrmBackend re-mounts the requested Medium under the "default" name.
// "memium" is always available (instance kept alive); "duckdb" lazy-opens
// the file at ~/.core/ide/orm.duckdb on first use, then ensures all
// registered schemas exist as tables.
func switchOrmBackend(name string) (string, error) {
	ormBackend.mu.Lock()
	defer ormBackend.mu.Unlock()
	if ormBackend.core == nil {
		return "", os.ErrInvalid
	}
	switch name {
	case "memium":
		if r := orm.Mount(ormBackend.core, "default", ormBackend.memium); !r.OK {
			return "", asError(r)
		}
		ormBackend.current = "memium"
		return ormBackend.duckPath, nil
	case "duckdb":
		if ormBackend.duck == nil {
			home, err := os.UserHomeDir()
			if err != nil {
				return "", err
			}
			path := filepath.Join(home, ".core", "ide", "orm.duckdb")
			if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
				return "", err
			}
			duck, err := openDuckDBMedium(path)
			if err != nil {
				return "", err
			}
			for _, schema := range ideOrmSchemas() {
				if err := duck.RegisterTable(schema); err != nil {
					_ = duck.Close()
					return "", err
				}
			}
			ormBackend.duck = duck
			ormBackend.duckPath = path
		}
		if r := orm.Mount(ormBackend.core, "default", ormBackend.duck); !r.OK {
			return "", asError(r)
		}
		ormBackend.current = "duckdb"
		return ormBackend.duckPath, nil
	default:
		return "", os.ErrInvalid
	}
}

func currentOrmBackend() (string, string) {
	ormBackend.mu.Lock()
	defer ormBackend.mu.Unlock()
	return ormBackend.current, ormBackend.duckPath
}

func asError(r core.Result) error {
	if err, ok := r.Value.(error); ok {
		return err
	}
	return os.ErrInvalid
}

// ideOrmSchemas lists the table schemas the IDE's local Memium hosts.
// Intentionally tiny for v1 — Note is the demo. Real consumers add their
// own schemas via orm.RegisterSchema + their own Medium.
func ideOrmSchemas() []orm.Schema {
	return []orm.Schema{
		orm.Define(func(b *orm.Builder) {
			b.Name("note")
			b.PK("id")
			b.Int64("id").NotNull()
			b.String("title").NotNull()
			b.String("body")
			b.String("created_at")
		}),
	}
}
