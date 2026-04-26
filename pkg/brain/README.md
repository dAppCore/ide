<!-- SPDX-License-Identifier: EUPL-1.2 -->

# Brain Tests

Run the live OpenBrain smoke only when credentials are available:

```sh
CORE_BRAIN_INTEGRATION=1 CORE_BRAIN_KEY=$CORE_BRAIN_KEY go test -tags integration -run TestLive ./pkg/brain/...
```

Without `CORE_BRAIN_INTEGRATION=1` or `CORE_BRAIN_KEY`, the integration test is skipped.
