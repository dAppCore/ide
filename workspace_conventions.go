package main

import (
	"embed"
	"strings"
	"sync"

	"gopkg.in/yaml.v3"
)

//go:embed workspace/conventions/*.yaml
var conventionPackFiles embed.FS

var conventionPackCache sync.Map

type conventionPackFile struct {
	Conventions []string `yaml:"conventions"`
	Notes       []string `yaml:"notes"`
}

func loadConventionPack(language string) (conventionPack, bool) {
	key := strings.ToLower(strings.TrimSpace(language))
	if key == "" {
		return conventionPack{}, false
	}

	if cached, ok := conventionPackCache.Load(key); ok {
		if pack, ok := cached.(conventionPack); ok {
			return pack, true
		}
	}

	data, err := conventionPackFiles.ReadFile("workspace/conventions/" + key + ".yaml")
	if err != nil {
		return conventionPack{}, false
	}

	var file conventionPackFile
	if err := yaml.Unmarshal(data, &file); err != nil {
		return conventionPack{}, false
	}

	pack := conventionPack{
		Conventions: append([]string(nil), file.Conventions...),
		Notes:       append([]string(nil), file.Notes...),
	}
	conventionPackCache.Store(key, pack)
	return pack, true
}
