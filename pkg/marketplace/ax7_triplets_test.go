package marketplace

import (
	"context"
	"net/http"
	"net/http/httptest"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"

	aipkg "dappco.re/go/ide/pkg/ai"
	"dappco.re/go/ide/pkg/config"
)

func TestAX7_NewClient_Good(t *core.T) {
	client := NewClient(config.Marketplace{Endpoint: "http://market.local"})
	core.AssertNotNil(t, client)
	core.AssertEqual(t, "http://market.local", client.cfg.Endpoint)
}

func TestAX7_NewClient_Bad(t *core.T) {
	client := NewClient(config.Marketplace{})
	core.AssertNotNil(t, client.httpClient)
	core.AssertEqual(t, "", client.cfg.Endpoint)
}

func TestAX7_NewClient_Ugly(t *core.T) {
	client := NewClient(config.Marketplace{APIPath: "relative"})
	core.AssertEqual(t, "relative", client.cfg.APIPath)
	core.AssertNotNil(t, client.httpClient)
}

func TestAX7_Client_AttachMedium_Good(t *core.T) {
	client := NewClient(config.Marketplace{})
	medium := coreio.NewMemoryMedium()
	client.AttachMedium(medium)
	core.AssertEqual(t, medium, client.medium)
}

func TestAX7_Client_AttachMedium_Bad(t *core.T) {
	client := NewClient(config.Marketplace{})
	client.AttachMedium(nil)
	core.AssertNil(t, client.medium)
}

func TestAX7_Client_AttachMedium_Ugly(t *core.T) {
	client := NewClient(config.Marketplace{})
	first := coreio.NewMemoryMedium()
	second := coreio.NewMemoryMedium()
	client.AttachMedium(first)
	client.AttachMedium(second)
	core.AssertEqual(t, second, client.medium)
}

func TestAX7_Client_AttachAI_Good(t *core.T) {
	client := NewClient(config.Marketplace{})
	service := &aipkg.Service{}
	client.AttachAI(service)
	core.AssertEqual(t, service, client.ai)
}

func TestAX7_Client_AttachAI_Bad(t *core.T) {
	client := NewClient(config.Marketplace{})
	client.AttachAI(nil)
	core.AssertNil(t, client.ai)
}

func TestAX7_Client_AttachAI_Ugly(t *core.T) {
	client := NewClient(config.Marketplace{})
	first := &aipkg.Service{}
	second := &aipkg.Service{}
	client.AttachAI(first)
	client.AttachAI(second)
	core.AssertEqual(t, second, client.ai)
}

func TestAX7_Client_Search_Good(t *core.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		core.AssertEqual(t, "go", r.URL.Query().Get("q"))
		_, _ = w.Write([]byte(`[{"code":"go-io","name":"go-io"}]`))
	}))
	defer server.Close()
	client := NewClient(config.Marketplace{Endpoint: server.URL, APIPath: "/v1/marketplace"})
	out, err := client.Search(context.Background(), SearchInput{Query: "go"})
	core.AssertNoError(t, err)
	core.AssertLen(t, out.Packages, 1)
}

func TestAX7_Client_Search_Bad(t *core.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
	}))
	defer server.Close()
	client := NewClient(config.Marketplace{Endpoint: server.URL, APIPath: "/v1/marketplace"})
	_, err := client.Search(context.Background(), SearchInput{Query: "go"})
	core.AssertError(t, err)
}

func TestAX7_Client_Search_Ugly(t *core.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	client := NewClient(config.Marketplace{Endpoint: server.URL, APIPath: "/v1/marketplace"})
	out, err := client.Search(context.Background(), SearchInput{Category: "tools"})
	core.AssertNoError(t, err)
	core.AssertEmpty(t, out.Packages)
}

func TestAX7_Client_Info_Good(t *core.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"code":"go-io","name":"go-io"}`))
	}))
	defer server.Close()
	client := NewClient(config.Marketplace{Endpoint: server.URL, APIPath: "/v1/marketplace"})
	out, err := client.Info(context.Background(), InfoInput{Code: "go-io"})
	core.AssertNoError(t, err)
	core.AssertEqual(t, "go-io", out.Package.Code)
}

func TestAX7_Client_Info_Bad(t *core.T) {
	client := NewClient(config.Marketplace{Endpoint: "http://market.local", APIPath: "/v1/marketplace"})
	_, err := client.Info(context.Background(), InfoInput{})
	core.AssertError(t, err)
}

func TestAX7_Client_Info_Ugly(t *core.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{`))
	}))
	defer server.Close()
	client := NewClient(config.Marketplace{Endpoint: server.URL, APIPath: "/v1/marketplace"})
	_, err := client.Info(context.Background(), InfoInput{Code: "bad-json"})
	core.AssertError(t, err)
}

func TestAX7_Client_Install_Good(t *core.T) {
	t.Setenv("DIR_HOME", t.TempDir())
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`null`))
	}))
	defer server.Close()
	client := NewClient(config.Marketplace{Endpoint: server.URL, APIPath: "/v1/marketplace", InstallVia: "api"})
	out, err := client.Install(context.Background(), InstallInput{Code: "go-io"})
	core.AssertNoError(t, err)
	core.AssertTrue(t, out.Installed)
}

func TestAX7_Client_Install_Bad(t *core.T) {
	client := NewClient(config.Marketplace{Endpoint: "http://market.local", APIPath: "/v1/marketplace", InstallVia: "api"})
	_, err := client.Install(context.Background(), InstallInput{})
	core.AssertError(t, err)
}

func TestAX7_Client_Install_Ugly(t *core.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()
	client := NewClient(config.Marketplace{Endpoint: server.URL, APIPath: "/v1/marketplace", InstallVia: "api"})
	_, err := client.Install(context.Background(), InstallInput{Code: "go-io"})
	core.AssertError(t, err)
}

func TestAX7_New_Good(t *core.T) {
	subsystem := New(config.Marketplace{Endpoint: "http://market.local"})
	core.AssertNotNil(t, subsystem.client)
	core.AssertEqual(t, "http://market.local", subsystem.cfg.Endpoint)
}

func TestAX7_New_Bad(t *core.T) {
	subsystem := New(config.Marketplace{})
	core.AssertNotNil(t, subsystem)
	core.AssertEqual(t, "", subsystem.cfg.Endpoint)
}

func TestAX7_New_Ugly(t *core.T) {
	subsystem := New(config.Marketplace{InstallVia: "api"})
	core.AssertEqual(t, "api", subsystem.cfg.InstallVia)
	core.AssertNotNil(t, subsystem.client)
}

func TestAX7_Subsystem_AttachAI_Good(t *core.T) {
	subsystem := New(config.Marketplace{})
	service := &aipkg.Service{}
	subsystem.AttachAI(service)
	core.AssertEqual(t, service, subsystem.client.ai)
}

func TestAX7_Subsystem_AttachAI_Bad(t *core.T) {
	subsystem := &Subsystem{}
	subsystem.AttachAI(nil)
	core.AssertNotNil(t, subsystem.client)
	core.AssertNil(t, subsystem.client.ai)
}

func TestAX7_Subsystem_AttachAI_Ugly(t *core.T) {
	subsystem := &Subsystem{cfg: config.Marketplace{Endpoint: "http://market.local"}}
	service := &aipkg.Service{}
	subsystem.AttachAI(service)
	core.AssertEqual(t, "http://market.local", subsystem.client.cfg.Endpoint)
	core.AssertEqual(t, service, subsystem.client.ai)
}

func TestAX7_Subsystem_AttachMedium_Good(t *core.T) {
	subsystem := New(config.Marketplace{})
	medium := coreio.NewMemoryMedium()
	subsystem.AttachMedium(medium)
	core.AssertEqual(t, medium, subsystem.client.medium)
}

func TestAX7_Subsystem_AttachMedium_Bad(t *core.T) {
	subsystem := &Subsystem{}
	subsystem.AttachMedium(nil)
	core.AssertNotNil(t, subsystem.client)
	core.AssertNil(t, subsystem.client.medium)
}

func TestAX7_Subsystem_AttachMedium_Ugly(t *core.T) {
	subsystem := &Subsystem{cfg: config.Marketplace{Endpoint: "http://market.local"}}
	medium := coreio.NewMemoryMedium()
	subsystem.AttachMedium(medium)
	core.AssertEqual(t, "http://market.local", subsystem.client.cfg.Endpoint)
	core.AssertEqual(t, medium, subsystem.client.medium)
}

func TestAX7_Subsystem_Name_Good(t *core.T) {
	name := New(config.Marketplace{}).Name()
	core.AssertEqual(t, "marketplace", name)
	core.AssertNotEmpty(t, name)
}

func TestAX7_Subsystem_Name_Bad(t *core.T) {
	var subsystem *Subsystem
	name := subsystem.Name()
	core.AssertEqual(t, "marketplace", name)
}

func TestAX7_Subsystem_Name_Ugly(t *core.T) {
	subsystem := &Subsystem{}
	name := subsystem.Name()
	core.AssertEqual(t, "marketplace", name)
}

func TestAX7_Subsystem_RegisterTools_Good(t *core.T) {
	service, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	New(config.Marketplace{}).RegisterTools(service)
	names := ax7MarketplaceToolNames(service.Tools())
	core.AssertTrue(t, names["pkg_search"])
}

func TestAX7_Subsystem_RegisterTools_Bad(t *core.T) {
	subsystem := New(config.Marketplace{})
	core.AssertPanics(t, func() { subsystem.RegisterTools(nil) })
	core.AssertNotNil(t, subsystem)
}

func TestAX7_Subsystem_RegisterTools_Ugly(t *core.T) {
	service, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	New(config.Marketplace{}).RegisterTools(service)
	names := ax7MarketplaceToolNames(service.Tools())
	core.AssertTrue(t, names["pkg_install"])
}

func ax7MarketplaceToolNames(records []coremcp.ToolRecord) map[string]bool {
	names := map[string]bool{}
	for _, record := range records {
		names[record.Name] = true
	}
	return names
}

func TestAX7_Subsystem_RegisterActions_Good(t *core.T) {
	c := core.New()
	New(config.Marketplace{}).RegisterActions(c)
	core.AssertTrue(t, c.Action("ide.pkg.search").Exists())
}

func TestAX7_Subsystem_RegisterActions_Bad(t *core.T) {
	subsystem := New(config.Marketplace{})
	core.AssertPanics(t, func() { subsystem.RegisterActions(nil) })
	core.AssertNotNil(t, subsystem)
}

func TestAX7_Subsystem_RegisterActions_Ugly(t *core.T) {
	c := core.New()
	New(config.Marketplace{}).RegisterActions(c)
	result := c.Action("ide.pkg.info").Run(context.Background(), core.NewOptions(core.Option{Key: "code", Value: 123}))
	core.AssertFalse(t, result.OK)
}
