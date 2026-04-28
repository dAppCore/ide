package store

import (
	"context"

	core "dappco.re/go"
)

func TestAX7_Register_Good(t *core.T) {
	t.Setenv("DIR_HOME", t.TempDir())
	result := Register(core.New())
	core.AssertTrue(t, result.OK)
	core.AssertNotNil(t, result.Value.(*Service).Store)
}

func TestAX7_Register_Bad(t *core.T) {
	home := t.TempDir()
	t.Setenv("DIR_HOME", home)
	result := Register(core.New())
	service := result.Value.(*Service)
	core.AssertTrue(t, result.OK)
	core.AssertContains(t, defaultStorePath(), home)
	core.AssertNotNil(t, service.Store)
}

func TestAX7_Register_Ugly(t *core.T) {
	t.Setenv("DIR_HOME", "")
	t.Setenv("HOME", "")
	result := Register(core.New())
	core.AssertTrue(t, result.OK)
	core.AssertNotNil(t, result.Value.(*Service))
}

func TestAX7_Service_OnShutdown_Good(t *core.T) {
	t.Setenv("DIR_HOME", t.TempDir())
	service := Register(core.New()).Value.(*Service)
	result := service.OnShutdown(context.Background())
	core.AssertTrue(t, result.OK)
	core.AssertNil(t, result.Value)
}

func TestAX7_Service_OnShutdown_Bad(t *core.T) {
	var service *Service
	result := service.OnShutdown(context.Background())
	core.AssertTrue(t, result.OK)
	core.AssertNil(t, result.Value)
}

func TestAX7_Service_OnShutdown_Ugly(t *core.T) {
	service := &Service{}
	result := service.OnShutdown(context.Background())
	core.AssertTrue(t, result.OK)
	core.AssertNil(t, result.Value)
}
