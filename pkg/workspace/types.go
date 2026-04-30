package workspace

type StatusInput struct {
	Root string `json:"root,omitempty"`
}

type ConventionsInput struct {
	Root string `json:"root,omitempty"`
}

type ImpactInput struct {
	Root string `json:"root,omitempty"`
}

type ScanInput struct {
	Root  string `json:"root,omitempty"`
	Depth int    `json:"depth,omitempty"`
}

type Project struct {
	Root      string   `json:"root"`
	Manifest  string   `json:"manifest,omitempty"`
	BuildYaml string   `json:"buildYaml,omitempty"`
	Languages []string `json:"languages,omitempty"`
	GitBranch string   `json:"gitBranch,omitempty"`
}

type ScanOutput struct {
	Projects []Project `json:"projects"`
}

type FileCount struct {
	Total int `json:"total"`
	Text  int `json:"text"`
}

type File struct {
	Path     string `json:"path,omitempty"`
	Size     int64  `json:"size"`
	Modified string `json:"modified"`
	Preview  string `json:"preview,omitempty"`
	IsText   bool   `json:"isText"`
}

type GitStatus struct {
	Branch       string          `json:"branch,omitempty"`
	RawHeader    string          `json:"rawHeader,omitempty"`
	Clean        bool            `json:"clean"`
	Changes      []GitChange     `json:"changes,omitempty"`
	ChangeCounts GitChangeCounts `json:"changeCounts"`
}

type GitChangeCounts struct {
	Staged    int `json:"staged"`
	Unstaged  int `json:"unstaged"`
	Untracked int `json:"untracked"`
}

type GitChange struct {
	Code string `json:"code"`
	Path string `json:"path,omitempty"`
}

type StatusOutput struct {
	Root      string    `json:"root"`
	Git       GitStatus `json:"git"`
	CoreFiles []File    `json:"coreFiles"`
	Counts    FileCount `json:"counts"`
	UpdatedAt string    `json:"updatedAt"`
}

type BuildSummary struct {
	ProjectName string `json:"projectName,omitempty"`
}

type ConventionsOutput struct {
	Root        string       `json:"root"`
	Sources     []string     `json:"sources"`
	Build       BuildSummary `json:"build"`
	Conventions []string     `json:"conventions"`
	Notes       []string     `json:"notes"`
}

type ImpactOutput struct {
	Root            string    `json:"root"`
	Git             GitStatus `json:"git"`
	ImpactedAreas   []string  `json:"impactedAreas"`
	SuggestedChecks []string  `json:"suggestedChecks"`
	Notes           []string  `json:"notes"`
}
