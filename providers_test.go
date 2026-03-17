package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"forge.lthn.ai/core/api/pkg/provider"
	"forge.lthn.ai/core/go-scm/manifest"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProvidersAPI_Name(t *testing.T) {
	api := NewProvidersAPI(nil, nil)
	assert.Equal(t, "providers-api", api.Name())
}

func TestProvidersAPI_BasePath(t *testing.T) {
	api := NewProvidersAPI(nil, nil)
	assert.Equal(t, "/api/v1/providers", api.BasePath())
}

func TestProvidersAPI_List_Good_Empty(t *testing.T) {
	gin.SetMode(gin.TestMode)

	reg := provider.NewRegistry()
	rm := NewRuntimeManager(nil)
	api := NewProvidersAPI(reg, rm)

	router := gin.New()
	rg := router.Group(api.BasePath())
	api.RegisterRoutes(rg)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/providers", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp providersResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Empty(t, resp.Providers)
}

func TestProvidersAPI_List_Good_WithRuntimeProviders(t *testing.T) {
	gin.SetMode(gin.TestMode)

	reg := provider.NewRegistry()
	rm := NewRuntimeManager(nil)

	// Simulate a runtime provider.
	rm.providers = append(rm.providers, &RuntimeProvider{
		Dir:  "/tmp/test",
		Port: 9999,
		Manifest: &manifest.Manifest{
			Code:      "test-provider",
			Name:      "Test Provider",
			Version:   "0.1.0",
			Namespace: "test",
		},
	})

	api := NewProvidersAPI(reg, rm)

	router := gin.New()
	rg := router.Group(api.BasePath())
	api.RegisterRoutes(rg)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/providers", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp providersResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	require.Len(t, resp.Providers, 1)
	assert.Equal(t, "test-provider", resp.Providers[0].Name)
	assert.Equal(t, "test", resp.Providers[0].BasePath)
	assert.Equal(t, "active", resp.Providers[0].Status)
}
