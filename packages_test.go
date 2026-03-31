package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"dappco.re/go/core/scm/marketplace"
	"forge.lthn.ai/core/api"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPackageToolsAPI_Name(t *testing.T) {
	apiSvc := NewPackageToolsAPI(nil)
	assert.Equal(t, "pkg-tools-api", apiSvc.Name())
	assert.Equal(t, "/api/v1/pkg", apiSvc.BasePath())
}

func TestPackageToolsAPI_Search_Good(t *testing.T) {
	gin.SetMode(gin.TestMode)

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/v1/scm/marketplace", r.URL.Path)
		assert.Equal(t, "alpha", r.URL.Query().Get("q"))
		assert.Equal(t, "tool", r.URL.Query().Get("category"))
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(api.OK([]marketplace.Module{
			{Code: "alpha", Name: "Alpha", Category: "tool"},
		}))
	}))
	defer upstream.Close()

	router := gin.New()
	apiSvc := NewPackageToolsAPI(NewMarketplaceClient(upstream.URL + "/api/v1/scm"))
	rg := router.Group(apiSvc.BasePath())
	apiSvc.RegisterRoutes(rg)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/pkg/search?q=alpha&category=tool", nil)
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var resp api.Response[PackageSearchResponse]
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	require.True(t, resp.Success)
	require.Len(t, resp.Data.Packages, 1)
	assert.Equal(t, "alpha", resp.Data.Packages[0].Code)
}

func TestPackageToolsAPI_Info_Good(t *testing.T) {
	gin.SetMode(gin.TestMode)

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/v1/scm/marketplace/alpha", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(api.OK(marketplace.Module{
			Code: "alpha",
			Name: "Alpha",
		}))
	}))
	defer upstream.Close()

	router := gin.New()
	apiSvc := NewPackageToolsAPI(NewMarketplaceClient(upstream.URL + "/api/v1/scm"))
	rg := router.Group(apiSvc.BasePath())
	apiSvc.RegisterRoutes(rg)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/pkg/info/alpha", nil)
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var resp api.Response[PackageInfoResponse]
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	require.True(t, resp.Success)
	assert.Equal(t, "alpha", resp.Data.Package.Code)
}

func TestPackageToolsAPI_Info_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(api.Fail("not_found", "provider not found in marketplace"))
	}))
	defer upstream.Close()

	router := gin.New()
	apiSvc := NewPackageToolsAPI(NewMarketplaceClient(upstream.URL + "/api/v1/scm"))
	rg := router.Group(apiSvc.BasePath())
	apiSvc.RegisterRoutes(rg)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/pkg/info/missing", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var resp api.Response[PackageInfoResponse]
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.False(t, resp.Success)
	require.NotNil(t, resp.Error)
	assert.Equal(t, "not_found", resp.Error.Code)
}

func TestPackageToolsAPI_Install_Good(t *testing.T) {
	gin.SetMode(gin.TestMode)

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "/api/v1/scm/marketplace/alpha/install", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(api.OK(PackageInstallResult{
			Installed: true,
			Code:      "alpha",
		}))
	}))
	defer upstream.Close()

	router := gin.New()
	apiSvc := NewPackageToolsAPI(NewMarketplaceClient(upstream.URL + "/api/v1/scm"))
	rg := router.Group(apiSvc.BasePath())
	apiSvc.RegisterRoutes(rg)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/pkg/install/alpha", nil)
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var resp api.Response[PackageInstallResult]
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	require.True(t, resp.Success)
	assert.True(t, resp.Data.Installed)
	assert.Equal(t, "alpha", resp.Data.Code)
}
