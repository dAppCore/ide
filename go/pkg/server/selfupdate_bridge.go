// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"encoding/json"
	"os"
	"runtime"
	"strings"
	"time"

	updater "dappco.re/go/update"
)

// selfupdate_* bridge tools — surfaces dappco.re/go/update for the
// IDE binary itself. Different from the updates_* tools (which track
// shelf-tools like docker / node / go) — this is the "Update core-ide"
// header card on the /updates panel.
//
// Repo URL is read from CORE_IDE_UPDATE_URL env (set at install time)
// or falls back to a configurable default. Until releases actually ship
// the panel reports "no releases configured" gracefully — the wiring
// is in place so the moment forge.lthn.sh/agent/core-ide gets a tagged
// release, this just works.

const defaultIDEUpdateRepoURL = "https://github.com/lethean/core-ide"

// coreIDEVersion is overridable at build time via:
//   go build -ldflags "-X dappco.re/go/ide/pkg/server.coreIDEVersion=v0.1.0" ./cmd/core-ide
// When unset, falls back to the dappco.re/go/update package's own version
// (currently 1.2.3) — surfaces as "1.2.3 (dev)" until real releases ship.
var coreIDEVersion = ""

func init() {
	if coreIDEVersion != "" {
		updater.Version = coreIDEVersion
	}
}

func ideUpdateRepoURL() string {
	if v := strings.TrimSpace(os.Getenv("CORE_IDE_UPDATE_URL")); v != "" {
		return v
	}
	return defaultIDEUpdateRepoURL
}

func ideUpdateChannel() string {
	if v := strings.TrimSpace(os.Getenv("CORE_IDE_UPDATE_CHANNEL")); v != "" {
		return v
	}
	return "stable"
}

// selfupdate_status reports the current core-ide version + the latest
// available release at the configured repo. Does not download anything.
func (b *MCPBridge) toolSelfUpdateStatus(_ context.Context, params map[string]any) map[string]any {
	// DuckDB cache — selfupdate hits GitHub Releases for the latest
	// version. TTL 5min; force-refresh from the panel bypasses.
	const collection = "selfupdate_status"
	const ttl = 5 * time.Minute
	force := paramBool(params, "force", false)
	if !force && cacheAge(collection) < ttl {
		_, raws, hit := cacheGetCollection(collection)
		if hit && len(raws) > 0 {
			var entry map[string]any
			if err := json.Unmarshal(raws[0], &entry); err == nil {
				entry["cache_hit"] = true
				entry["cache_age_s"] = int(cacheAge(collection).Seconds())
				return map[string]any{"ok": true, "value": entry}
			}
		}
	}

	repoURL := ideUpdateRepoURL()
	channel := ideUpdateChannel()
	current := updater.Version
	if coreIDEVersion == "" {
		current = current + " (dev)"
	}

	status := map[string]any{
		"current_version": current,
		"repo_url":        repoURL,
		"channel":         channel,
		"platform":        runtime.GOOS + "/" + runtime.GOARCH,
		"configured":      false,
		"checked":         false,
	}

	parts := updater.ParseRepoURL(repoURL)
	if !parts.OK {
		status["error"] = "repo url could not be parsed: " + parts.Error()
		return map[string]any{"ok": true, "value": status}
	}
	owner, repo := parts.Value.([]string)[0], parts.Value.([]string)[1]
	status["owner"] = owner
	status["repo"] = repo
	status["configured"] = true

	check := updater.CheckForNewerVersion(owner, repo, channel, true)
	status["checked"] = true
	if !check.OK {
		status["error"] = check.Error()
		return map[string]any{"ok": true, "value": status}
	}

	type vc struct {
		Release         interface{}
		UpdateAvailable bool
	}
	v := check.Value
	if v == nil {
		status["update_available"] = false
		status["latest_version"] = ""
		return map[string]any{"ok": true, "value": status}
	}
	// versionCheck is unexported in the updater package; we read fields via reflection-friendly pattern.
	// updater.versionCheck has fields .release (*Release) and .updateAvailable (bool).
	// Easiest path: call CheckOnly (also returns versionCheck) and inspect via type assertion against a known shape.
	// Since we cannot type-assert the unexported struct, we surface what we can via the formatted output.
	// Workaround: call the per-channel GetLatestRelease through the public client.
	client := updater.NewGithubClient()
	rel := client.GetLatestRelease(context.Background(), owner, repo, channel)
	if !rel.OK {
		status["error"] = rel.Error()
		return map[string]any{"ok": true, "value": status}
	}
	if rel.Value == nil {
		status["update_available"] = false
		status["latest_version"] = ""
		return map[string]any{"ok": true, "value": status}
	}
	r := rel.Value.(*updater.Release)
	status["latest_version"] = r.TagName
	status["release_url"] = repoURL + "/releases/tag/" + r.TagName
	status["update_available"] = !versionEqual(current, r.TagName)

	// Cache the live status. Errored paths above bypass the write-through
	// so the next call will retry; only the happy path persists.
	_ = cacheSetCollection(collection, []cacheItem{{Key: "_root", Data: status}})
	cached := map[string]any{}
	for k, v := range status {
		cached[k] = v
	}
	cached["cache_hit"] = false
	cached["cache_age_s"] = 0
	return map[string]any{"ok": true, "value": cached}
}

func versionEqual(a, b string) bool {
	a = strings.TrimPrefix(strings.TrimSpace(a), "v")
	b = strings.TrimPrefix(strings.TrimSpace(b), "v")
	return a == b
}

// selfupdate_apply downloads + swaps the IDE binary in place via
// updater.DoUpdate. Spawns the watcher PID so the process can restart
// itself after the swap. Returns whether the download started; the
// actual restart happens when the user kills + relaunches the binary.
func (b *MCPBridge) toolSelfUpdateApply(_ context.Context, _ map[string]any) map[string]any {
	// Action mutates state — bust the status cache so the next read
	// reflects the new version (or the failure mode).
	_ = cacheClearCollection("selfupdate_status")
	repoURL := ideUpdateRepoURL()
	channel := ideUpdateChannel()

	parts := updater.ParseRepoURL(repoURL)
	if !parts.OK {
		return map[string]any{"ok": false, "error": "repo url could not be parsed: " + parts.Error()}
	}
	owner, repo := parts.Value.([]string)[0], parts.Value.([]string)[1]

	client := updater.NewGithubClient()
	rel := client.GetLatestRelease(context.Background(), owner, repo, channel)
	if !rel.OK {
		return map[string]any{"ok": false, "error": "no release for channel " + channel + ": " + rel.Error()}
	}
	if rel.Value == nil {
		return map[string]any{"ok": false, "error": "no release available in channel " + channel}
	}
	r := rel.Value.(*updater.Release)

	dl := updater.GetDownloadURL(r, "")
	if !dl.OK {
		return map[string]any{"ok": false, "error": "no asset for " + runtime.GOOS + "/" + runtime.GOARCH + ": " + dl.Error()}
	}

	if up := updater.DoUpdate(dl.Value.(string)); !up.OK {
		return map[string]any{"ok": false, "error": "DoUpdate failed: " + up.Error()}
	}

	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"updated_to":   r.TagName,
			"download_url": dl.Value.(string),
			"restart_required": true,
			"message": "Update applied. Quit and relaunch core-ide to run the new binary.",
		},
	}
}
