package workspace

import core "dappco.re/go"

func ExampleScan() {
	_ = any(Scan)
	core.Println("Scan")
	// Output: Scan
}

func ExampleScanWithMedium() {
	_ = any(ScanWithMedium)
	core.Println("ScanWithMedium")
	// Output: ScanWithMedium
}

func ExampleStatus() {
	_ = any(Status)
	core.Println("Status")
	// Output: Status
}

func ExampleStatusWithMedium() {
	_ = any(StatusWithMedium)
	core.Println("StatusWithMedium")
	// Output: StatusWithMedium
}

func ExampleConventions() {
	_ = any(Conventions)
	core.Println("Conventions")
	// Output: Conventions
}

func ExampleConventionsWithMedium() {
	_ = any(ConventionsWithMedium)
	core.Println("ConventionsWithMedium")
	// Output: ConventionsWithMedium
}

func ExampleImpact() {
	_ = any(Impact)
	core.Println("Impact")
	// Output: Impact
}

func ExampleImpactWithMedium() {
	_ = any(ImpactWithMedium)
	core.Println("ImpactWithMedium")
	// Output: ImpactWithMedium
}
