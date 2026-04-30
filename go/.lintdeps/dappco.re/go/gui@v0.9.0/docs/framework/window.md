# Window Service

The Window service covers named application windows, persisted geometry, and layout-aware placement for Core GUI applications.

## Features

- Named windows with stable lookup keys
- Size and position persistence between launches
- Minimum and maximum size constraints
- Centering and explicit screen placement
- Layout composition for tiling and snapping

## Basic Usage

```go
import "dappco.re/go/gui/pkg/window"

w := window.New(
    window.WithName("main"),
    window.WithTitle("Core GUI"),
    window.WithSize(1200, 800),
    window.WithMinSize(800, 600),
    window.WithCentered(),
)
```

## Layouts

```go
layout.Register("development", window.Layout{
    Windows: []window.WindowArrangement{
        {Name: "editor", Screen: 0, Position: window.Left, Size: window.Half},
        {Name: "preview", Screen: 0, Position: window.Right, Size: window.Half},
    },
})

layout.Apply("development")
```

## Persistence

Window state is restored from the user's Core config directory, so a named window reopens at its previous size and position unless an explicit override is supplied.
